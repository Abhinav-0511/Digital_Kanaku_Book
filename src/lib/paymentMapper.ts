import type { Payment, PaymentType } from "@/types/domain";

export const PAYMENT_SELECT =
  "id, payment_date, payment_type, party_id, company_id, amount, created_at, updated_at, parties(name), companies(name)";

export interface PaymentRow {
  id: string;
  payment_date: string;
  payment_type: PaymentType;
  party_id: string | null;
  company_id: string | null;
  amount: number;
  created_at: string;
  updated_at: string;
  parties: { name: string } | { name: string }[] | null;
  companies: { name: string } | { name: string }[] | null;
}

function relatedName(rel: { name: string } | { name: string }[] | null): string {
  if (!rel) return "";
  return Array.isArray(rel) ? (rel[0]?.name ?? "") : rel.name;
}

export function mapPaymentRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    paymentDate: row.payment_date,
    paymentType: row.payment_type,
    partyId: row.party_id,
    partyName: relatedName(row.parties),
    companyId: row.company_id,
    companyName: relatedName(row.companies),
    amount: Number(row.amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** The name to show for a payment — whichever of company/party is set, or both if both are. */
export function paymentDisplayName(payment: Payment): string {
  if (payment.companyName && payment.partyName) return `${payment.companyName} / ${payment.partyName}`;
  return payment.companyName || payment.partyName || "—";
}

export interface PaymentSummary {
  paymentCount: number;
  totalAmount: number;
  totalPaid: number;
  totalReceived: number;
}

export function summarizePayments(payments: Payment[]): PaymentSummary {
  return payments.reduce(
    (acc, p) => ({
      paymentCount: acc.paymentCount + 1,
      totalAmount: acc.totalAmount + p.amount,
      totalPaid: acc.totalPaid + (p.paymentType === "paid" ? p.amount : 0),
      totalReceived: acc.totalReceived + (p.paymentType === "received" ? p.amount : 0),
    }),
    { paymentCount: 0, totalAmount: 0, totalPaid: 0, totalReceived: 0 },
  );
}
