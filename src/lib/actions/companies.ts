"use server";

import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { createClient, createTokenClient, getAccessToken, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { nameEntrySchema } from "@/lib/validation/schemas";
import { findOrCreateLookup, normalizeName, searchLookup, type RenameResult } from "./_lookups";
import { cacheTags, CACHE_TTL_SECONDS } from "@/lib/cache/tags";
import type { Company, DailySummary, HistoryFilters, Load, Payment } from "@/types/domain";
import { LOAD_SELECT, mapLoadRow, summarize, type LoadRow } from "@/lib/loadMapper";
import { PAYMENT_SELECT, mapPaymentRow, summarizePayments, type PaymentRow, type PaymentSummary } from "@/lib/paymentMapper";

export async function searchCompanies(query: string): Promise<Company[]> {
  const user = await getAuthedUser();
  if (!user) return [];
  const token = await getAccessToken();
  if (!token) return [];

  const cached = unstable_cache(
    async (userId: string, accessToken: string, q: string) => {
      const supabase = createTokenClient(accessToken);
      return searchLookup(supabase, "companies", q);
    },
    ["searchCompanies"],
    { tags: [cacheTags.companies(user.id)], revalidate: CACHE_TTL_SECONDS },
  );
  return cached(user.id, token, query) as Promise<Company[]>;
}

export async function findOrCreateCompany(name: string) {
  const result = await findOrCreateLookup("companies", name);
  if (result.success) {
    const user = await getAuthedUser();
    if (user) revalidateTag(cacheTags.companies(user.id), { expire: 0 });
  }
  return result;
}

/** All of the user's companies, for a browsable list (not a typeahead — no cap at 20). */
export async function listCompanies(): Promise<Company[]> {
  const user = await getAuthedUser();
  if (!user) return [];
  const token = await getAccessToken();
  if (!token) return [];

  const cached = unstable_cache(
    async (userId: string, accessToken: string) => {
      const supabase = createTokenClient(accessToken);
      const { data, error } = await supabase.from("companies").select("id, name").order("name").limit(1000);
      if (error) {
        logServerError("listCompanies", error);
        return [];
      }
      return data ?? [];
    },
    ["listCompanies"],
    { tags: [cacheTags.companies(user.id)], revalidate: CACHE_TTL_SECONDS },
  );
  return cached(user.id, token);
}

export interface CompanyHistory {
  company: Company | null;
  summary: DailySummary;
  loads: Load[];
  payments: Payment[];
  paymentSummary: PaymentSummary;
}

export async function getCompanyHistory(companyId: string, filters: HistoryFilters = {}): Promise<CompanyHistory> {
  const user = await getAuthedUser();
  if (!user) return { company: null, summary: summarize([]), loads: [], payments: [], paymentSummary: summarizePayments([]) };
  const token = await getAccessToken();
  if (!token) return { company: null, summary: summarize([]), loads: [], payments: [], paymentSummary: summarizePayments([]) };

  const cached = unstable_cache(
    async (userId: string, accessToken: string, id: string, dateFrom?: string, dateTo?: string) => {
      const supabase = createTokenClient(accessToken);

      let loadsQuery = supabase.from("loads").select(LOAD_SELECT).eq("company_id", id);
      let paymentsQuery = supabase.from("payments").select(PAYMENT_SELECT).eq("company_id", id);
      if (dateFrom) {
        loadsQuery = loadsQuery.gte("load_date", dateFrom);
        paymentsQuery = paymentsQuery.gte("payment_date", dateFrom);
      }
      if (dateTo) {
        loadsQuery = loadsQuery.lte("load_date", dateTo);
        paymentsQuery = paymentsQuery.lte("payment_date", dateTo);
      }

      const [companyRes, loadsRes, paymentsRes] = await Promise.all([
        supabase.from("companies").select("id, name").eq("id", id).maybeSingle(),
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
    },
    ["getCompanyHistory"],
    {
      // Loads/payments embed the company AND party name via join, so a rename
      // on either side must invalidate this too — not just the company tag.
      tags: [cacheTags.companies(user.id), cacheTags.loads(user.id), cacheTags.parties(user.id), cacheTags.payments(user.id)],
      revalidate: CACHE_TTL_SECONDS,
    },
  );
  return cached(user.id, token, companyId, filters.dateFrom, filters.dateTo);
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

  revalidateTag(cacheTags.companies(user.id), { expire: 0 });
  revalidatePath("/", "layout");
  return { success: true, name: data.name };
}
