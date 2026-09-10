"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { paymentInputSchema } from "@/lib/validation/schemas";
import { findOrCreateLookup } from "./_lookups";
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

export async function createPayment(input: PaymentFormInput): Promise<PaymentActionResult> {
  const parsed = paymentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const [company, party, user] = await Promise.all([
    parsed.data.companyName.trim() ? findOrCreateLookup("companies", parsed.data.companyName) : null,
    parsed.data.partyName.trim() ? findOrCreateLookup("parties", parsed.data.partyName) : null,
    getAuthedUser(),
  ]);
  if (company && !company.success) return { success: false, error: company.error };
  if (party && !party.success) return { success: false, error: party.error };
  if (!user) return { success: false, error: "You need to be logged in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      payment_date: parsed.data.paymentDate,
      payment_type: parsed.data.paymentType,
      company_id: company?.success ? company.id : null,
      party_id: party?.success ? party.id : null,
      amount: parsed.data.amount,
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("createPayment", error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't save this payment. Please check your details and try again.") };
  }

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  return { success: true, paymentId: data.id };
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

  revalidatePath("/dashboard");
  revalidatePath("/payments");
  return { success: true };
}

export async function getPaymentsForDate(date: string): Promise<Payment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(PAYMENT_SELECT)
    .eq("payment_date", date)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) logServerError("getPaymentsForDate", error);
    return [];
  }
  return (data as unknown as PaymentRow[]).map(mapPaymentRow);
}

export interface SearchPaymentsResult {
  payments: Payment[];
  summary: PaymentSummary;
}

export async function searchPayments(filters: PaymentFilters): Promise<SearchPaymentsResult> {
  const supabase = await createClient();
  let query = supabase.from("payments").select(PAYMENT_SELECT);

  if (filters.dateFrom) query = query.gte("payment_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("payment_date", filters.dateTo);

  const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

  if (filters.partyName) {
    const matches = await supabase
      .from("parties")
      .select("id")
      .ilike("name_normalized", `%${filters.partyName.toLowerCase()}%`);
    const ids = (matches.data ?? []).map((p) => p.id);
    query = query.in("party_id", ids.length ? ids : [NO_MATCH_ID]);
  }

  if (filters.companyName) {
    const matches = await supabase
      .from("companies")
      .select("id")
      .ilike("name_normalized", `%${filters.companyName.toLowerCase()}%`);
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
}
