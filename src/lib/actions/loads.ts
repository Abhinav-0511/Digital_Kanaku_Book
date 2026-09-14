"use server";

import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { createClient, createTokenClient, getAccessToken, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { loadInputSchema, vehicleNumberSchema } from "@/lib/validation/schemas";
import { normalizeVehicleNumber } from "@/lib/formatting/vehicle";
import { escapeLikePattern, findOrCreateLookup, type RenameResult } from "./_lookups";
import { cacheTags, CACHE_TTL_SECONDS } from "@/lib/cache/tags";
import { LOAD_SELECT, mapLoadRow, summarize, type LoadRow } from "@/lib/loadMapper";
import type { DailySummary, HistoryFilters, Load, LoadFilters } from "@/types/domain";

export type { LoadRow };

export interface LoadActionResult {
  success: boolean;
  error?: string;
  loadId?: string;
}

interface LoadFormInput {
  weight: string;
  vehicleNumber: string;
  companyName: string;
  partyName: string;
  rate: string;
  companyRate: string;
  driverAdvance: string;
  vehicleRent: string;
  dieselCost: string;
  gstMode: "standard" | "custom" | "none";
  customGstPercentage: string;
  loadDate: string;
}

async function resolveAndValidate(input: LoadFormInput) {
  const parsed = loadInputSchema.safeParse({
    ...input,
    rate: input.rate === "" ? 0 : input.rate,
    companyRate: input.companyRate === "" ? 0 : input.companyRate,
    driverAdvance: input.driverAdvance === "" ? 0 : input.driverAdvance,
    vehicleRent: input.vehicleRent === "" ? 0 : input.vehicleRent,
    dieselCost: input.dieselCost === "" ? 0 : input.dieselCost,
    customGstPercentage: input.customGstPercentage === "" ? undefined : input.customGstPercentage,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const [company, party] = await Promise.all([
    parsed.data.companyName.trim() ? findOrCreateLookup("companies", parsed.data.companyName) : null,
    parsed.data.partyName.trim() ? findOrCreateLookup("parties", parsed.data.partyName) : null,
  ]);
  if (company && !company.success) return { success: false as const, error: company.error };
  if (party && !party.success) return { success: false as const, error: party.error };

  return {
    success: true as const,
    data: parsed.data,
    companyId: company?.success ? company.id : null,
    partyId: party?.success ? party.id : null,
  };
}

/** Every save invalidates companies/parties too, not just loads — saving
 * can silently create a brand-new company/party (find-or-create), and this
 * runs regardless of whether that actually happened this time; a spurious
 * cache miss is cheap, a missed invalidation is a wrong number on screen. */
function invalidateLoadCaches(userId: string) {
  revalidateTag(cacheTags.loads(userId), { expire: 0 });
  revalidateTag(cacheTags.companies(userId), { expire: 0 });
  revalidateTag(cacheTags.parties(userId), { expire: 0 });
}

export async function createLoad(input: LoadFormInput): Promise<LoadActionResult> {
  const [resolved, user] = await Promise.all([resolveAndValidate(input), getAuthedUser()]);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!user) return { success: false, error: "You need to be logged in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loads")
    .insert({
      user_id: user.id,
      load_date: resolved.data.loadDate,
      vehicle_number: resolved.data.vehicleNumber,
      vehicle_number_normalized: normalizeVehicleNumber(resolved.data.vehicleNumber),
      company_id: resolved.companyId,
      party_id: resolved.partyId,
      weight: resolved.data.weight,
      rate: resolved.data.rate,
      company_rate: resolved.data.companyRate,
      driver_advance: resolved.data.driverAdvance,
      vehicle_rent: resolved.data.vehicleRent,
      diesel_cost: resolved.data.dieselCost,
      gst_enabled: resolved.data.gstEnabled,
      gst_percentage: resolved.data.gstPercentage,
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("createLoad", error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't save this load. Please check your details and try again.") };
  }

  invalidateLoadCaches(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/loads");
  return { success: true, loadId: data.id };
}

export async function updateLoad(loadId: string, input: LoadFormInput): Promise<LoadActionResult> {
  const [resolved, user] = await Promise.all([resolveAndValidate(input), getAuthedUser()]);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!user) return { success: false, error: "You need to be logged in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("loads")
    .update({
      load_date: resolved.data.loadDate,
      vehicle_number: resolved.data.vehicleNumber,
      vehicle_number_normalized: normalizeVehicleNumber(resolved.data.vehicleNumber),
      company_id: resolved.companyId,
      party_id: resolved.partyId,
      weight: resolved.data.weight,
      rate: resolved.data.rate,
      company_rate: resolved.data.companyRate,
      driver_advance: resolved.data.driverAdvance,
      vehicle_rent: resolved.data.vehicleRent,
      diesel_cost: resolved.data.dieselCost,
      gst_enabled: resolved.data.gstEnabled,
      gst_percentage: resolved.data.gstPercentage,
    })
    .eq("id", loadId)
    .eq("user_id", user.id);

  if (error) {
    logServerError("updateLoad", error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't update this load. Please check your details and try again.") };
  }

  invalidateLoadCaches(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/loads");
  revalidatePath(`/loads/${loadId}`);
  return { success: true, loadId };
}

export async function deleteLoad(loadId: string): Promise<LoadActionResult> {
  const user = await getAuthedUser();
  if (!user) return { success: false, error: "You need to be logged in." };

  const supabase = await createClient();
  const { error } = await supabase.from("loads").delete().eq("id", loadId).eq("user_id", user.id);

  if (error) {
    logServerError("deleteLoad", error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't delete this load. Please try again.") };
  }

  revalidateTag(cacheTags.loads(user.id), { expire: 0 });
  revalidatePath("/dashboard");
  revalidatePath("/loads");
  return { success: true };
}

// Not cached: a single-record fetch used once to pre-fill an edit form,
// visited once per edit rather than repeatedly — little to gain and one
// less thing that could ever serve a stale record mid-edit.
export async function getLoad(loadId: string): Promise<Load | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("loads").select(LOAD_SELECT).eq("id", loadId).maybeSingle();
  if (error || !data) {
    if (error) logServerError("getLoad", error);
    return null;
  }
  return mapLoadRow(data as unknown as LoadRow);
}

export async function getLoadsForDate(date: string): Promise<Load[]> {
  const user = await getAuthedUser();
  if (!user) return [];
  const token = await getAccessToken();
  if (!token) return [];

  const cached = unstable_cache(
    async (userId: string, accessToken: string, forDate: string) => {
      const supabase = createTokenClient(accessToken);
      const { data, error } = await supabase
        .from("loads")
        .select(LOAD_SELECT)
        .eq("load_date", forDate)
        .order("created_at", { ascending: false });

      if (error || !data) {
        if (error) logServerError("getLoadsForDate", error);
        return [];
      }
      return (data as unknown as LoadRow[]).map(mapLoadRow);
    },
    ["getLoadsForDate"],
    {
      // Load rows embed company/party names via join.
      tags: [cacheTags.loads(user.id), cacheTags.companies(user.id), cacheTags.parties(user.id)],
      revalidate: CACHE_TTL_SECONDS,
    },
  );
  return cached(user.id, token, date);
}

export interface SearchLoadsResult {
  loads: Load[];
  summary: DailySummary;
}

export async function searchLoads(filters: LoadFilters): Promise<SearchLoadsResult> {
  const user = await getAuthedUser();
  if (!user) return { loads: [], summary: summarize([]) };
  const token = await getAccessToken();
  if (!token) return { loads: [], summary: summarize([]) };

  const cached = unstable_cache(
    async (userId: string, accessToken: string, f: LoadFilters) => {
      const supabase = createTokenClient(accessToken);
      let query = supabase.from("loads").select(LOAD_SELECT);

      if (f.dateFrom) query = query.gte("load_date", f.dateFrom);
      if (f.dateTo) query = query.lte("load_date", f.dateTo);
      if (f.vehicleNumber) {
        query = query.ilike("vehicle_number_normalized", `%${normalizeVehicleNumber(f.vehicleNumber)}%`);
      }
      if (f.gst === "gst") query = query.eq("gst_enabled", true);
      if (f.gst === "no-gst") query = query.eq("gst_enabled", false);

      const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

      const [companyMatches, partyMatches] = await Promise.all([
        f.companyName ? supabase.from("companies").select("id").ilike("name_normalized", `%${f.companyName.toLowerCase()}%`) : null,
        f.partyName ? supabase.from("parties").select("id").ilike("name_normalized", `%${f.partyName.toLowerCase()}%`) : null,
      ]);

      if (companyMatches) {
        const ids = (companyMatches.data ?? []).map((c) => c.id);
        query = query.in("company_id", ids.length ? ids : [NO_MATCH_ID]);
      }

      if (partyMatches) {
        const ids = (partyMatches.data ?? []).map((p) => p.id);
        query = query.in("party_id", ids.length ? ids : [NO_MATCH_ID]);
      }

      if (f.query) {
        const q = f.query.trim();
        const normalizedVehicle = normalizeVehicleNumber(q);
        const [matchingCompanyIds, matchingPartyIds] = await Promise.all([
          supabase.from("companies").select("id").ilike("name_normalized", `%${q.toLowerCase()}%`),
          supabase.from("parties").select("id").ilike("name_normalized", `%${q.toLowerCase()}%`),
        ]);

        const companyIds = (matchingCompanyIds.data ?? []).map((c) => c.id);
        const partyIds = (matchingPartyIds.data ?? []).map((p) => p.id);

        const orParts = [`vehicle_number_normalized.ilike.%${normalizedVehicle}%`];
        if (companyIds.length) orParts.push(`company_id.in.(${companyIds.join(",")})`);
        if (partyIds.length) orParts.push(`party_id.in.(${partyIds.join(",")})`);

        query = query.or(orParts.join(","));
      }

      const { data, error } = await query.order("load_date", { ascending: false }).order("created_at", { ascending: false }).limit(200);

      if (error || !data) {
        if (error) logServerError("searchLoads", error);
        return { loads: [], summary: summarize([]) };
      }

      const loads = (data as unknown as LoadRow[]).map(mapLoadRow);
      return { loads, summary: summarize(loads) };
    },
    ["searchLoads"],
    {
      // Depends on loads (rows + join), and on companies/parties both for
      // the joined names and for resolving the name filters above.
      tags: [cacheTags.loads(user.id), cacheTags.companies(user.id), cacheTags.parties(user.id)],
      revalidate: CACHE_TTL_SECONDS,
    },
  );
  return cached(user.id, token, filters);
}

export async function getVehicleSuggestions(query: string): Promise<string[]> {
  const user = await getAuthedUser();
  if (!user) return [];
  const token = await getAccessToken();
  if (!token) return [];

  const cached = unstable_cache(
    async (userId: string, accessToken: string, q: string) => {
      const supabase = createTokenClient(accessToken);
      const normalized = escapeLikePattern(normalizeVehicleNumber(q));
      const { data, error } = await supabase
        .from("loads")
        .select("vehicle_number, vehicle_number_normalized, created_at")
        .ilike("vehicle_number_normalized", `${normalized}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !data) {
        if (error) logServerError("getVehicleSuggestions", error);
        return [];
      }

      const seen = new Set<string>();
      const suggestions: string[] = [];
      for (const row of data) {
        if (!seen.has(row.vehicle_number_normalized)) {
          seen.add(row.vehicle_number_normalized);
          suggestions.push(row.vehicle_number);
        }
        if (suggestions.length >= 8) break;
      }
      return suggestions;
    },
    ["getVehicleSuggestions"],
    // Vehicle number only — no company/party join in this query.
    { tags: [cacheTags.loads(user.id)], revalidate: CACHE_TTL_SECONDS },
  );
  return cached(user.id, token, query);
}

/** Every distinct vehicle number the user has entered, for a browsable list (not a typeahead — no cap at 8). */
export async function listVehicleNumbers(): Promise<string[]> {
  const user = await getAuthedUser();
  if (!user) return [];
  const token = await getAccessToken();
  if (!token) return [];

  const cached = unstable_cache(
    async (userId: string, accessToken: string) => {
      const supabase = createTokenClient(accessToken);
      const { data, error } = await supabase
        .from("loads")
        .select("vehicle_number, vehicle_number_normalized")
        .order("vehicle_number")
        .limit(2000);

      if (error || !data) {
        if (error) logServerError("listVehicleNumbers", error);
        return [];
      }

      const seen = new Set<string>();
      const numbers: string[] = [];
      for (const row of data) {
        if (!seen.has(row.vehicle_number_normalized)) {
          seen.add(row.vehicle_number_normalized);
          numbers.push(row.vehicle_number);
        }
      }
      return numbers.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    },
    ["listVehicleNumbers"],
    // Vehicle number only — no company/party join in this query.
    { tags: [cacheTags.loads(user.id)], revalidate: CACHE_TTL_SECONDS },
  );
  return cached(user.id, token);
}

export interface VehicleHistory {
  vehicleNumber: string;
  summary: DailySummary;
  loads: Load[];
}

export async function getVehicleHistory(vehicleNumber: string, filters: HistoryFilters = {}): Promise<VehicleHistory> {
  const user = await getAuthedUser();
  if (!user) return { vehicleNumber, summary: summarize([]), loads: [] };
  const token = await getAccessToken();
  if (!token) return { vehicleNumber, summary: summarize([]), loads: [] };

  const cached = unstable_cache(
    async (userId: string, accessToken: string, number: string, dateFrom?: string, dateTo?: string) => {
      const supabase = createTokenClient(accessToken);
      const normalized = normalizeVehicleNumber(number);
      let query = supabase.from("loads").select(LOAD_SELECT).eq("vehicle_number_normalized", normalized);
      if (dateFrom) query = query.gte("load_date", dateFrom);
      if (dateTo) query = query.lte("load_date", dateTo);

      const { data, error } = await query.order("load_date", { ascending: false }).order("created_at", { ascending: false });

      if (error || !data) {
        if (error) logServerError("getVehicleHistory", error);
        return { vehicleNumber: number, summary: summarize([]), loads: [] };
      }

      const loads = (data as unknown as LoadRow[]).map(mapLoadRow);
      return { vehicleNumber: loads[0]?.vehicleNumber ?? number, summary: summarize(loads), loads };
    },
    ["getVehicleHistory"],
    {
      // Load rows embed company/party names via join.
      tags: [cacheTags.loads(user.id), cacheTags.companies(user.id), cacheTags.parties(user.id)],
      revalidate: CACHE_TTL_SECONDS,
    },
  );
  return cached(user.id, token, vehicleNumber, filters.dateFrom, filters.dateTo);
}

/**
 * Renames a vehicle number across every load that used it — there's no
 * separate vehicles table (see 0001_init_schema.sql), so this is a bulk
 * update over `loads` keyed by the normalized number. Unlike company/party
 * names there's no uniqueness constraint to violate: renaming onto an
 * existing vehicle number simply merges the two histories.
 */
export async function renameVehicleNumber(oldVehicleNumber: string, newVehicleNumber: string): Promise<RenameResult> {
  const parsed = vehicleNumberSchema.safeParse(newVehicleNumber);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Required" };
  }

  const user = await getAuthedUser();
  if (!user) return { success: false, error: "You need to be logged in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("loads")
    .update({ vehicle_number: parsed.data })
    .eq("vehicle_number_normalized", normalizeVehicleNumber(oldVehicleNumber))
    .eq("user_id", user.id);

  if (error) {
    logServerError("renameVehicleNumber", error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't rename this vehicle. Please try again.") };
  }

  revalidateTag(cacheTags.loads(user.id), { expire: 0 });
  revalidatePath("/", "layout");
  return { success: true, name: parsed.data };
}
