"use server";

import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { createClient, createTokenClient, getAccessToken, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { nameEntrySchema } from "@/lib/validation/schemas";
import { findOrCreateLookup, normalizeName, searchLookup, type RenameResult } from "./_lookups";
import { cacheTags, CACHE_TTL_SECONDS } from "@/lib/cache/tags";
import type { DailySummary, HistoryFilters, Load, Party, Payment } from "@/types/domain";
import { LOAD_SELECT, mapLoadRow, summarize, type LoadRow } from "@/lib/loadMapper";
import { PAYMENT_SELECT, mapPaymentRow, summarizePayments, type PaymentRow, type PaymentSummary } from "@/lib/paymentMapper";

export async function searchParties(query: string): Promise<Party[]> {
  const user = await getAuthedUser();
  if (!user) return [];
  const token = await getAccessToken();
  if (!token) return [];

  const cached = unstable_cache(
    async (userId: string, accessToken: string, q: string) => {
      const supabase = createTokenClient(accessToken);
      return searchLookup(supabase, "parties", q);
    },
    ["searchParties"],
    { tags: [cacheTags.parties(user.id)], revalidate: CACHE_TTL_SECONDS },
  );
  return cached(user.id, token, query) as Promise<Party[]>;
}

export async function findOrCreateParty(name: string) {
  const result = await findOrCreateLookup("parties", name);
  if (result.success) {
    const user = await getAuthedUser();
    if (user) revalidateTag(cacheTags.parties(user.id), { expire: 0 });
  }
  return result;
}

/** All of the user's parties, for a browsable list (not a typeahead — no cap at 20). */
export async function listParties(): Promise<Party[]> {
  const user = await getAuthedUser();
  if (!user) return [];
  const token = await getAccessToken();
  if (!token) return [];

  const cached = unstable_cache(
    async (userId: string, accessToken: string) => {
      const supabase = createTokenClient(accessToken);
      const { data, error } = await supabase.from("parties").select("id, name").order("name").limit(1000);
      if (error) {
        logServerError("listParties", error);
        return [];
      }
      return data ?? [];
    },
    ["listParties"],
    { tags: [cacheTags.parties(user.id)], revalidate: CACHE_TTL_SECONDS },
  );
  return cached(user.id, token);
}

export interface PartyHistory {
  party: Party | null;
  summary: DailySummary;
  loads: Load[];
  payments: Payment[];
  paymentSummary: PaymentSummary;
}

export async function getPartyHistory(partyId: string, filters: HistoryFilters = {}): Promise<PartyHistory> {
  const user = await getAuthedUser();
  if (!user) return { party: null, summary: summarize([]), loads: [], payments: [], paymentSummary: summarizePayments([]) };
  const token = await getAccessToken();
  if (!token) return { party: null, summary: summarize([]), loads: [], payments: [], paymentSummary: summarizePayments([]) };

  const cached = unstable_cache(
    async (userId: string, accessToken: string, id: string, dateFrom?: string, dateTo?: string) => {
      const supabase = createTokenClient(accessToken);

      let loadsQuery = supabase.from("loads").select(LOAD_SELECT).eq("party_id", id);
      let paymentsQuery = supabase.from("payments").select(PAYMENT_SELECT).eq("party_id", id);
      if (dateFrom) {
        loadsQuery = loadsQuery.gte("load_date", dateFrom);
        paymentsQuery = paymentsQuery.gte("payment_date", dateFrom);
      }
      if (dateTo) {
        loadsQuery = loadsQuery.lte("load_date", dateTo);
        paymentsQuery = paymentsQuery.lte("payment_date", dateTo);
      }

      const [partyRes, loadsRes, paymentsRes] = await Promise.all([
        supabase.from("parties").select("id, name").eq("id", id).maybeSingle(),
        loadsQuery.order("load_date", { ascending: false }).order("created_at", { ascending: false }),
        paymentsQuery.order("payment_date", { ascending: false }).order("created_at", { ascending: false }),
      ]);

      if (partyRes.error || !partyRes.data) {
        logServerError("getPartyHistory:party", partyRes.error);
        return { party: null, summary: summarize([]), loads: [], payments: [], paymentSummary: summarizePayments([]) };
      }
      if (loadsRes.error || !loadsRes.data) {
        logServerError("getPartyHistory:loads", loadsRes.error);
        return { party: partyRes.data, summary: summarize([]), loads: [], payments: [], paymentSummary: summarizePayments([]) };
      }
      if (paymentsRes.error) {
        logServerError("getPartyHistory:payments", paymentsRes.error);
      }

      const loads = (loadsRes.data as unknown as LoadRow[]).map(mapLoadRow);
      const payments = ((paymentsRes.data ?? []) as unknown as PaymentRow[]).map(mapPaymentRow);
      return { party: partyRes.data, summary: summarize(loads), loads, payments, paymentSummary: summarizePayments(payments) };
    },
    ["getPartyHistory"],
    {
      // Loads/payments embed the company AND party name via join, so a rename
      // on either side must invalidate this too — not just the party tag.
      tags: [cacheTags.parties(user.id), cacheTags.loads(user.id), cacheTags.companies(user.id), cacheTags.payments(user.id)],
      revalidate: CACHE_TTL_SECONDS,
    },
  );
  return cached(user.id, token, partyId, filters.dateFrom, filters.dateTo);
}

/** Renames a party in place — every load/payment that references it by id
 * shows the new name immediately, since nothing but the display text (and
 * its search key) changes. Revalidates the whole app: this name shows up
 * anywhere a load or payment does (dashboard, loads, payments, reports…). */
export async function renameParty(partyId: string, newName: string): Promise<RenameResult> {
  const parsed = nameEntrySchema.safeParse(newName);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Required" };
  }

  const user = await getAuthedUser();
  if (!user) return { success: false, error: "You need to be logged in." };

  const name = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parties")
    .update({ name, name_normalized: normalizeName(name) })
    .eq("id", partyId)
    .eq("user_id", user.id)
    .select("id, name")
    .single();

  if (error || !data) {
    logServerError("renameParty", error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't rename this party. Please try again.") };
  }

  revalidateTag(cacheTags.parties(user.id), { expire: 0 });
  revalidatePath("/", "layout");
  return { success: true, name: data.name };
}
