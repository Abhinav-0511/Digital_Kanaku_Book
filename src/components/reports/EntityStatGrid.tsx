import { round2 } from "@/lib/calculations/loadCalculations";
import { formatCurrencyWhole, formatNumber } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";
import type { DailySummary } from "@/types/domain";
import type { PaymentSummary } from "@/lib/paymentMapper";

/** Total loads, total payment (received for a company, paid for a party), total weight. */
export function EntityStats({
  summary,
  paymentSummary,
  paymentLabel,
  weightUnit,
}: {
  summary: DailySummary;
  paymentSummary: PaymentSummary;
  paymentLabel: "Total Received" | "Total Paid";
  weightUnit: string;
}) {
  const paymentValue = paymentLabel === "Total Received" ? paymentSummary.totalReceived : paymentSummary.totalPaid;
  const stats = [
    { label: "Total Loads", value: String(summary.loadCount) },
    { label: paymentLabel, value: formatCurrencyWhole(paymentValue) },
    { label: "Total Weight", value: `${formatNumber(summary.totalWeight)} ${weightUnit}` },
  ];
  return <StatGrid stats={stats} />;
}

/** Profit, other amount (driver advance + vehicle rent + diesel, separately too), total loads/weight for context. */
export function VehicleStats({ summary, weightUnit }: { summary: DailySummary; weightUnit: string }) {
  const otherAmount = round2(summary.totalDriverAdvance + summary.totalVehicleRent + summary.totalDieselCost);
  const stats = [
    { label: "Total Loads", value: String(summary.loadCount) },
    { label: "Total Weight", value: `${formatNumber(summary.totalWeight)} ${weightUnit}` },
    { label: "Profit", value: formatCurrencyWhole(summary.totalProfit), emphasize: true },
    { label: "Other Amount", value: formatCurrencyWhole(otherAmount) },
    { label: "Diesel", value: formatCurrencyWhole(summary.totalDieselCost) },
    { label: "Driver Advance", value: formatCurrencyWhole(summary.totalDriverAdvance) },
    { label: "Vehicle Rent", value: formatCurrencyWhole(summary.totalVehicleRent) },
  ];
  return <StatGrid stats={stats} />;
}

function StatGrid({ stats }: { stats: { label: string; value: string; emphasize?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className={cn("rounded-lg p-3", stat.emphasize ? "bg-primary/10" : "bg-muted/50")}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
          <p className={cn("mt-1 text-base font-bold", stat.emphasize ? "text-primary" : "text-foreground")}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
