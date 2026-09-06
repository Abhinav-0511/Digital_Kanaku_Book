"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { loadInputSchema } from "@/lib/validation/schemas";
import { normalizeVehicleNumber } from "@/lib/formatting/vehicle";
import { findOrCreateLookup } from "./_lookups";
import { LOAD_SELECT, mapLoadRow, summarize, type LoadRow } from "@/lib/loadMapper";
import type { DailySummary, Load, LoadFilters } from "@/types/domain";

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
    driverAdvance: input.driverAdvance === "" ? 0 : input.driverAdvance,
    vehicleRent: input.vehicleRent === "" ? 0 : input.vehicleRent,
    dieselCost: input.dieselCost === "" ? 0 : input.dieselCost,
    customGstPercentage: input.customGstPercentage === "" ? undefined : input.customGstPercentage,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const [company, party] = await Promise.all([
    findOrCreateLookup("companies", parsed.data.companyName),
    findOrCreateLookup("parties", parsed.data.partyName),
  ]);
  if (!company.success) return { success: false as const, error: company.error };
  if (!party.success) return { success: false as const, error: party.error };

  return { success: true as const, data: parsed.data, companyId: company.id, partyId: party.id };
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

  revalidatePath("/dashboard");
  revalidatePath("/loads");
  return { success: true };
}

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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loads")
    .select(LOAD_SELECT)
    .eq("load_date", date)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) logServerError("getLoadsForDate", error);
    return [];
  }
  return (data as unknown as LoadRow[]).map(mapLoadRow);
}

export interface SearchLoadsResult {
  loads: Load[];
  summary: DailySummary;
}

export async function searchLoads(filters: LoadFilters): Promise<SearchLoadsResult> {
  const supabase = await createClient();
  let query = supabase.from("loads").select(LOAD_SELECT);

  if (filters.dateFrom) query = query.gte("load_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("load_date", filters.dateTo);
  if (filters.vehicleNumber) {
    query = query.ilike("vehicle_number_normalized", `%${normalizeVehicleNumber(filters.vehicleNumber)}%`);
  }
  if (filters.gst === "gst") query = query.eq("gst_enabled", true);
  if (filters.gst === "no-gst") query = query.eq("gst_enabled", false);

  const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

  if (filters.companyName) {
    const matches = await supabase
      .from("companies")
      .select("id")
      .ilike("name_normalized", `%${filters.companyName.toLowerCase()}%`);
    const ids = (matches.data ?? []).map((c) => c.id);
    query = query.in("company_id", ids.length ? ids : [NO_MATCH_ID]);
  }

  if (filters.partyName) {
    const matches = await supabase
      .from("parties")
      .select("id")
      .ilike("name_normalized", `%${filters.partyName.toLowerCase()}%`);
    const ids = (matches.data ?? []).map((p) => p.id);
    query = query.in("party_id", ids.length ? ids : [NO_MATCH_ID]);
  }

  if (filters.query) {
    const q = filters.query.trim();
    const normalizedVehicle = normalizeVehicleNumber(q);
    const matchingCompanyIds = await supabase.from("companies").select("id").ilike("name_normalized", `%${q.toLowerCase()}%`);
    const matchingPartyIds = await supabase.from("parties").select("id").ilike("name_normalized", `%${q.toLowerCase()}%`);

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
}

export async function getVehicleSuggestions(query: string): Promise<string[]> {
  const supabase = await createClient();
  const normalized = normalizeVehicleNumber(query);
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
}

export interface VehicleHistory {
  vehicleNumber: string;
  summary: DailySummary;
  loads: Load[];
}

export async function getVehicleHistory(vehicleNumber: string): Promise<VehicleHistory> {
  const supabase = await createClient();
  const normalized = normalizeVehicleNumber(vehicleNumber);
  const { data, error } = await supabase
    .from("loads")
    .select(LOAD_SELECT)
    .eq("vehicle_number_normalized", normalized)
    .order("load_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) logServerError("getVehicleHistory", error);
    return { vehicleNumber, summary: summarize([]), loads: [] };
  }

  const loads = (data as unknown as LoadRow[]).map(mapLoadRow);
  return { vehicleNumber: loads[0]?.vehicleNumber ?? vehicleNumber, summary: summarize(loads), loads };
}
