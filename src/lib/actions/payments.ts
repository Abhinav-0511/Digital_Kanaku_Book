"use server";

import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { createClient, createTokenClient, getAccessToken, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { paymentInputSchema } from "@/lib/validation/schemas";
import { findOrCreateLookup } from "./_lookups";
import { cacheTags, CACHE_TTL_SECONDS } from "@/lib/cache/tags";
import { PAYMENT_SELECT, mapPaymentRow, summarizePayments, type PaymentRow, type PaymentSummary } from "@/lib/paymentMapper";
import type { Payment, PaymentFilters } from "@/types/domain";

export type { PaymentRow };

export interface PaymentActionResult {
  success: boolean;
  error?: string;
  paymentId?: string;
}

interface PaymentFormInput {
  paymentType: "paid" | "received";
  companyName: string;
  partyName: string;
  amount: string;
  paymentDate: string;
}

async function resolveAndValidate(input: PaymentFormInput) {
  const parsed = paymentInputSchema.safeParse(input);
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

/** Every save invalidates companies/parties too, not just payments — saving
 * can silently create a brand-new company/party (find-or-create), and this
 * runs regardless of whether that actually happened this time; a spurious
 * cache miss is cheap, a missed invalidation is a wrong number on screen. */
function invalidatePaymentCaches(userId: string) {
  revalidateTag(cacheTags.payments(userId), { expire: 0 });
  revalidateTag(cacheTags.companies(userId), { expire: 0 });
  revalidateTag(cacheTags.parties(userId), { expire: 0 });
}

export async function createPayment(input: PaymentFormInput): Promise<PaymentActionResult> {
  const [resolved, user] = await Promise.all([resolveAndValidate(input), getAuthedUser()]);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!user) return { success: false, error: "You need to be logged in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      payment_date: resolved.data.paymentDate,
      payment_type: resolved.data.paymentType,
      company_id: resolved.companyId,
      party_id: resolved.partyId,
      amount: resolved.data.amount,
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("createPayment", error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't save this payment. Please check your details and try again.") };
  }

  invalidatePaymentCaches(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/payments");
  return { success: true, paymentId: data.id };
}

export async function updatePayment(paymentId: string, input: PaymentFormInput): Promise<PaymentActionResult> {
  const [resolved, user] = await Promise.all([resolveAndValidate(input), getAuthedUser()]);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!user) return { success: false, error: "You need to be logged in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({
      payment_date: resolved.data.paymentDate,
      payment_type: resolved.data.paymentType,
      company_id: resolved.companyId,
      party_id: resolved.partyId,
      amount: resolved.data.amount,
    })
    .eq("id", paymentId)
    .eq("user_id", user.id);

  if (error) {
    logServerError("updatePayment", error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't update this payment. Please check your details and try again.") };
  }

  invalidatePaymentCaches(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/payments");
  return { success: true, paymentId };
}

export async function deletePayment(paymentId: string): Promise<PaymentActionResult> {
  const user = await getAuthedUser();
  if (!user) return { success: false, error: "You need to be logged in." };

  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", paymentId).eq("user_id", user.id);

  if (error) {
    logServerError("deletePayment", error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't delete this payment. Please try again.") };
  }

  revalidateTag(cacheTags.payments(user.id), { expire: 0 });
  revalidatePath("/dashboard");
  revalidatePath("/payments");
  return { success: true };
}

// Not cached: a single-record fetch used once to pre-fill an edit form,
// visited once per edit rather than repeatedly — little to gain and one
// less thing that could ever serve a stale record mid-edit.
export async function getPayment(paymentId: string): Promise<Payment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("payments").select(PAYMENT_SELECT).eq("id", paymentId).maybeSingle();
  if (error || !data) {
    if (error) logServerError("getPayment", error);
    return null;
  }
  return mapPaymentRow(data as unknown as PaymentRow);
}

export async function getPaymentsForDate(date: string): Promise<Payment[]> {
  const user = await getAuthedUser();
  if (!user) return [];
  const token = await getAccessToken();
  if (!token) return [];

  const cached = unstable_cache(
    async (userId: string, accessToken: string, forDate: string) => {
      const supabase = createTokenClient(accessToken);
      const { data, error } = await supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .eq("payment_date", forDate)
        .order("created_at", { ascending: false });

      if (error || !data) {
        if (error) logServerError("getPaymentsForDate", error);
        return [];
      }
      return (data as unknown as PaymentRow[]).map(mapPaymentRow);
    },
    ["getPaymentsForDate"],
    {
      // Payment rows embed company/party names via join.
      tags: [cacheTags.payments(user.id), cacheTags.companies(user.id), cacheTags.parties(user.id)],
      revalidate: CACHE_TTL_SECONDS,
    },
  );
  return cached(user.id, token, date);
}

/** Number of payments per day (YYYY-MM-DD) within `month` ("YYYY-MM"), for the calendar view. */
export async function getPaymentCountsForMonth(month: string): Promise<Record<string, number>> {
  const user = await getAuthedUser();
  if (!user) return {};
  const token = await getAccessToken();
  if (!token) return {};

  const cached = unstable_cache(
    async (userId: string, accessToken: string, forMonth: string) => {
      const supabase = createTokenClient(accessToken);
      const [y, m] = forMonth.split("-").map(Number);
      const dateFrom = `${forMonth}-01`;
      const dateTo = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

      const { data, error } = await supabase.from("payments").select("payment_date").gte("payment_date", dateFrom).lte("payment_date", dateTo);

      if (error || !data) {
        if (error) logServerError("getPaymentCountsForMonth", error);
        return {};
      }

      const counts: Record<string, number> = {};
      for (const row of data as { payment_date: string }[]) {
        counts[row.payment_date] = (counts[row.payment_date] ?? 0) + 1;
      }
      return counts;
    },
    ["getPaymentCountsForMonth"],
    { tags: [cacheTags.payments(user.id)], revalidate: CACHE_TTL_SECONDS },
  );
  return cached(user.id, token, month);
}

export interface SearchPaymentsResult {
  payments: Payment[];
  summary: PaymentSummary;
}

export async function searchPayments(filters: PaymentFilters): Promise<SearchPaymentsResult> {
  const user = await getAuthedUser();
  if (!user) return { payments: [], summary: summarizePayments([]) };
  const token = await getAccessToken();
  if (!token) return { payments: [], summary: summarizePayments([]) };

  const cached = unstable_cache(
    async (
      userId: string,
      accessToken: string,
      dateFrom?: string,
      dateTo?: string,
      partyName?: string,
      companyName?: string,
    ) => {
      const supabase = createTokenClient(accessToken);
      let query = supabase.from("payments").select(PAYMENT_SELECT);

      if (dateFrom) query = query.gte("payment_date", dateFrom);
      if (dateTo) query = query.lte("payment_date", dateTo);

      const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

      if (partyName) {
        const matches = await supabase.from("parties").select("id").ilike("name_normalized", `%${partyName.toLowerCase()}%`);
        const ids = (matches.data ?? []).map((p) => p.id);
        query = query.in("party_id", ids.length ? ids : [NO_MATCH_ID]);
      }

      if (companyName) {
        const matches = await supabase.from("companies").select("id").ilike("name_normalized", `%${companyName.toLowerCase()}%`);
        const ids = (matches.data ?? []).map((c) => c.id);
        query = query.in("company_id", ids.length ? ids : [NO_MATCH_ID]);
      }

      const { data, error } = await query.order("payment_date", { ascending: false }).order("created_at", { ascending: false }).limit(200);

      if (error || !data) {
        if (error) logServerError("searchPayments", error);
        return { payments: [], summary: summarizePayments([]) };
      }

      const payments = (data as unknown as PaymentRow[]).map(mapPaymentRow);
      return { payments, summary: summarizePayments(payments) };
    },
    ["searchPayments"],
    {
      // Depends on payments (rows + join), and on companies/parties both
      // for the joined names and for resolving the name filters above.
      tags: [cacheTags.payments(user.id), cacheTags.companies(user.id), cacheTags.parties(user.id)],
      revalidate: CACHE_TTL_SECONDS,
    },
  );
  return cached(user.id, token, filters.dateFrom, filters.dateTo, filters.partyName, filters.companyName);
}
