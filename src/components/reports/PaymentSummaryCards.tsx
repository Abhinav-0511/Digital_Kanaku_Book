import { Card } from "@/components/ui/card";
import { formatCurrencyWhole } from "@/lib/formatting/currency";
import type { PaymentSummary } from "@/lib/paymentMapper";

/** Paid/received totals, styled to match SummaryCards' stat tiles. */
export function PaymentSummaryCards({ summary }: { summary: PaymentSummary }) {
  const cards = [
    { label: "Total Paid", value: formatCurrencyWhole(summary.totalPaid) },
    { label: "Total Received", value: formatCurrencyWhole(summary.totalReceived) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="gap-1 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</p>
          <p className="text-2xl font-bold text-primary">{card.value}</p>
        </Card>
      ))}
    </div>
  );
}
