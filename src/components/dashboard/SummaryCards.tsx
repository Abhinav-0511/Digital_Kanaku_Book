import { Card } from "@/components/ui/card";
import { formatCurrencyWhole, formatNumber } from "@/lib/formatting/currency";
import type { DailySummary } from "@/types/domain";

export function SummaryCards({ summary, weightUnit, dateLabel }: { summary: DailySummary; weightUnit: string; dateLabel: string }) {
  const cards = [
    { label: dateLabel, value: `${summary.loadCount}`, suffix: summary.loadCount === 1 ? "Load" : "Loads" },
    { label: "Total Weight", value: `${formatNumber(summary.totalWeight)}`, suffix: weightUnit },
    { label: "Total Amount", value: formatCurrencyWhole(summary.totalAmount), suffix: "", emphasize: true },
    { label: "Driver Advance", value: formatCurrencyWhole(summary.totalDriverAdvance), suffix: "" },
    { label: "Vehicle Rent", value: formatCurrencyWhole(summary.totalVehicleRent), suffix: "" },
    { label: "Diesel", value: formatCurrencyWhole(summary.totalDieselCost), suffix: "" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className="gap-1 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</p>
          <p className={card.emphasize ? "text-2xl font-bold text-primary" : "text-2xl font-bold"}>
            {card.value}
            {card.suffix ? <span className="ml-1 text-sm font-medium text-muted-foreground">{card.suffix}</span> : null}
          </p>
        </Card>
      ))}
    </div>
  );
}
