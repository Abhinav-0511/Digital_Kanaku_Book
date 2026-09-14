"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { nameEntrySchema } from "@/lib/validation/schemas";
import { findOrCreateLookup, normalizeName, searchLookup, type RenameResult } from "./_lookups";
import type { DailySummary, HistoryFilters, Load, Party, Payment } from "@/types/domain";
import { LOAD_SELECT, mapLoadRow, summarize, type LoadRow } from "@/lib/loadMapper";
import { PAYMENT_SELECT, mapPaymentRow, summarizePayments, type PaymentRow, type PaymentSummary } from "@/lib/paymentMapper";

export async function searchParties(query: string): Promise<Party[]> {
  return searchLookup("parties", query) as Promise<Party[]>;
}

export async function findOrCreateParty(name: string) {
  return findOrCreateLookup("parties", name);
}

/** All of the user's parties, for a browsable list (not a typeahead — no cap at 20). */
export async function listParties(): Promise<Party[]> {
  const user = await getAuthedUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.from("parties").select("id, name").order("name").limit(1000);
  if (error) {
    logServerError("listParties", error);
    return [];
  }
  return data ?? [];
}

export interface PartyHistory {
  party: Party | null;
  summary: DailySummary;
  loads: Load[];
  payments: Payment[];
  paymentSummary: PaymentSummary;
}

export async function getPartyHistory(partyId: string, filters: HistoryFilters = {}): Promise<PartyHistory> {
  const supabase = await createClient();

  let loadsQuery = supabase.from("loads").select(LOAD_SELECT).eq("party_id", partyId);
  let paymentsQuery = supabase.from("payments").select(PAYMENT_SELECT).eq("party_id", partyId);
  if (filters.dateFrom) {
    loadsQuery = loadsQuery.gte("load_date", filters.dateFrom);
    paymentsQuery = paymentsQuery.gte("payment_date", filters.dateFrom);
  }
  if (filters.dateTo) {
    loadsQuery = loadsQuery.lte("load_date", filters.dateTo);
    paymentsQuery = paymentsQuery.lte("payment_date", filters.dateTo);
  }

  // The party lookup doesn't gate the other two — a bad/deleted id just
  // means they'll come back empty too — so all three run in one round trip
  // instead of waiting on the party row first.
  const [partyRes, loadsRes, paymentsRes] = await Promise.all([
    supabase.from("parties").select("id, name").eq("id", partyId).maybeSingle(),
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

  revalidatePath("/", "layout");
  return { success: true, name: data.name };
}
