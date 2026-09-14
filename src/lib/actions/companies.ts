"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { nameEntrySchema } from "@/lib/validation/schemas";
import { findOrCreateLookup, normalizeName, searchLookup, type RenameResult } from "./_lookups";
import type { Company, DailySummary, HistoryFilters, Load, Payment } from "@/types/domain";
import { LOAD_SELECT, mapLoadRow, summarize, type LoadRow } from "@/lib/loadMapper";
import { PAYMENT_SELECT, mapPaymentRow, summarizePayments, type PaymentRow, type PaymentSummary } from "@/lib/paymentMapper";

export async function searchCompanies(query: string): Promise<Company[]> {
  return searchLookup("companies", query) as Promise<Company[]>;
}

export async function findOrCreateCompany(name: string) {
  return findOrCreateLookup("companies", name);
}

/** All of the user's companies, for a browsable list (not a typeahead — no cap at 20). */
export async function listCompanies(): Promise<Company[]> {
  const user = await getAuthedUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("id, name").order("name").limit(1000);
  if (error) {
    logServerError("listCompanies", error);
    return [];
  }
  return data ?? [];
}

export interface CompanyHistory {
  company: Company | null;
  summary: DailySummary;
  loads: Load[];
  payments: Payment[];
  paymentSummary: PaymentSummary;
}

export async function getCompanyHistory(companyId: string, filters: HistoryFilters = {}): Promise<CompanyHistory> {
  const supabase = await createClient();

  let loadsQuery = supabase.from("loads").select(LOAD_SELECT).eq("company_id", companyId);
  let paymentsQuery = supabase.from("payments").select(PAYMENT_SELECT).eq("company_id", companyId);
  if (filters.dateFrom) {
    loadsQuery = loadsQuery.gte("load_date", filters.dateFrom);
    paymentsQuery = paymentsQuery.gte("payment_date", filters.dateFrom);
  }
  if (filters.dateTo) {
    loadsQuery = loadsQuery.lte("load_date", filters.dateTo);
    paymentsQuery = paymentsQuery.lte("payment_date", filters.dateTo);
  }

  // The company lookup doesn't gate the other two — a bad/deleted id just
  // means they'll come back empty too — so all three run in one round trip
  // instead of waiting on the company row first.
  const [companyRes, loadsRes, paymentsRes] = await Promise.all([
    supabase.from("companies").select("id, name").eq("id", companyId).maybeSingle(),
    loadsQuery.order("load_date", { ascending: false }).order("created_at", { ascending: false }),
    paymentsQuery.order("payment_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);

  if (companyRes.error || !companyRes.data) {
    logServerError("getCompanyHistory:company", companyRes.error);
    return { company: null, summary: summarize([]), loads: [], payments: [], paymentSummary: summarizePayments([]) };
  }

  if (loadsRes.error || !loadsRes.data) {
    logServerError("getCompanyHistory:loads", loadsRes.error);
    return { company: companyRes.data, summary: summarize([]), loads: [], payments: [], paymentSummary: summarizePayments([]) };
  }
  if (paymentsRes.error) {
    logServerError("getCompanyHistory:payments", paymentsRes.error);
  }

  const loads = (loadsRes.data as unknown as LoadRow[]).map(mapLoadRow);
  const payments = ((paymentsRes.data ?? []) as unknown as PaymentRow[]).map(mapPaymentRow);
  return { company: companyRes.data, summary: summarize(loads), loads, payments, paymentSummary: summarizePayments(payments) };
}

/** Renames a company in place — every load/payment that references it by id
 * shows the new name immediately, since nothing but the display text (and
 * its search key) changes. Revalidates the whole app: this name shows up
 * anywhere a load or payment does (dashboard, loads, payments, reports…). */
export async function renameCompany(companyId: string, newName: string): Promise<RenameResult> {
  const parsed = nameEntrySchema.safeParse(newName);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Required" };
  }

  const user = await getAuthedUser();
  if (!user) return { success: false, error: "You need to be logged in." };

  const name = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .update({ name, name_normalized: normalizeName(name) })
    .eq("id", companyId)
    .eq("user_id", user.id)
    .select("id, name")
    .single();

  if (error || !data) {
    logServerError("renameCompany", error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't rename this company. Please try again.") };
  }

  revalidatePath("/", "layout");
  return { success: true, name: data.name };
}
