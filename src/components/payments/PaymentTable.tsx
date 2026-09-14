import Link from "next/link";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatting/currency";
import { formatTime } from "@/lib/formatting/date";
import { paymentDisplayName } from "@/lib/paymentMapper";
import type { Payment } from "@/types/domain";

export function PaymentTable({ payments }: { payments: Payment[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {payments.map((payment) => (
            <tr key={payment.id} className="transition-colors hover:bg-muted/40">
              <td className="px-4 py-3 text-muted-foreground">{formatTime(payment.createdAt)}</td>
              <td className="px-4 py-3 font-medium">
                <Link href={`/payments/${payment.id}/edit`} className="hover:underline">
                  {paymentDisplayName(payment)}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Badge variant={payment.paymentType === "received" ? "secondary" : "outline"}>
                  {payment.paymentType === "received" ? "Received" : "Paid"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-primary">{formatCurrency(payment.amount)}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/payments/${payment.id}/edit`}
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Edit payment"
                >
                  <Pencil className="size-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
