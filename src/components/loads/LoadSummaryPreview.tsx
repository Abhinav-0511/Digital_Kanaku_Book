import { formatCurrency, formatNumber } from "@/lib/formatting/currency";

interface LoadSummaryPreviewProps {
  weight: number;
  rate: number;
  weightUnit: string;
  baseAmount: number;
  gstEnabled: boolean;
  gstPercentage: number;
  gstAmount: number;
  driverAdvance: number;
  totalAmount: number;
}

export function LoadSummaryPreview({
  weight,
  rate,
  weightUnit,
  baseAmount,
  gstEnabled,
  gstPercentage,
  gstAmount,
  driverAdvance,
  totalAmount,
}: LoadSummaryPreviewProps) {
  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-muted/40 p-4">
      <Row label={`Weight × Rate`} value={`${formatNumber(weight)} ${weightUnit} × ${formatCurrency(rate)}`} />
      <Row label="Base Amount" value={formatCurrency(baseAmount)} />
      <Row label={gstEnabled ? `GST (${formatNumber(gstPercentage)}%)` : "GST"} value={gstEnabled ? formatCurrency(gstAmount) : "No GST"} />
      {driverAdvance > 0 ? <Row label="Driver Advance" value={formatCurrency(driverAdvance)} /> : null}
      <div className="mt-1 flex items-center justify-between border-t border-border pt-2.5">
        <span className="text-sm font-semibold text-foreground">TOTAL</span>
        <span className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
