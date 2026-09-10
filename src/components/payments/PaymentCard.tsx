import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatting/currency";
import { formatTime } from "@/lib/formatting/date";
import { paymentDisplayName } from "@/lib/paymentMapper";
import type { Payment } from "@/types/domain";

export function PaymentCard({ payment }: { payment: Payment }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-base font-semibold">{paymentDisplayName(payment)}</p>
        <span className="shrink-0 text-xs text-muted-foreground">{formatTime(payment.createdAt)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-lg font-bold text-primary">{formatCurrency(payment.amount)}</p>
        <Badge variant={payment.paymentType === "received" ? "secondary" : "outline"}>
          {payment.paymentType === "received" ? "Received" : "Paid"}
        </Badge>
      </div>
    </div>
  );
}
