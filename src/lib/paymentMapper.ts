import type { Payment } from "@/types/domain";

export const PAYMENT_SELECT = "id, payment_date, party_id, amount, created_at, updated_at, parties(name)";

export interface PaymentRow {
  id: string;
  payment_date: string;
  party_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
  parties: { name: string } | { name: string }[] | null;
}

function relatedName(rel: PaymentRow["parties"]): string {
  if (!rel) return "";
  return Array.isArray(rel) ? (rel[0]?.name ?? "") : rel.name;
}

export function mapPaymentRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    paymentDate: row.payment_date,
    partyId: row.party_id,
    partyName: relatedName(row.parties),
    amount: Number(row.amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function summarizePayments(payments: Payment[]): { paymentCount: number; totalAmount: number } {
  return payments.reduce(
    (acc, p) => ({
      paymentCount: acc.paymentCount + 1,
      totalAmount: acc.totalAmount + p.amount,
    }),
    { paymentCount: 0, totalAmount: 0 },
  );
}
