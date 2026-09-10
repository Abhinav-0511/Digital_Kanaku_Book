import { formatCurrency, formatNumber } from "@/lib/formatting/currency";

interface LoadSummaryPreviewProps {
  weight: number;
  rate: number;
  weightUnit: string;
  baseAmount: number;
  gstEnabled: boolean;
  gstPercentage: number;
  gstAmount: number;
  companyRate: number;
  partyAmount: number;
  companyAmount: number;
  difference: number;
  driverAdvance: number;
  vehicleRent: number;
  dieselCost: number;
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
  companyRate,
  partyAmount,
  companyAmount,
  difference,
  driverAdvance,
  vehicleRent,
  dieselCost,
  totalAmount,
}: LoadSummaryPreviewProps) {
  const hasOtherCosts = companyRate > 0 || driverAdvance > 0 || vehicleRent > 0 || dieselCost > 0;

  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-muted/40 p-4">
      <Row label={`Weight × Party Rate`} value={`${formatNumber(weight)} ${weightUnit} × ${formatCurrency(rate)}`} />
      <Row label="Base Amount" value={formatCurrency(baseAmount)} />
      <Row label={gstEnabled ? `GST (${formatNumber(gstPercentage)}%)` : "GST"} value={gstEnabled ? formatCurrency(gstAmount) : "No GST"} />

      <div className="flex items-center justify-between border-t border-border pt-2.5">
        <span className="text-sm font-semibold text-foreground">TOTAL</span>
        <span className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</span>
      </div>

      {hasOtherCosts ? (
        <div className="space-y-2.5 border-t border-dashed border-border pt-2.5">
          <p className="text-xs text-muted-foreground">Tracked separately — not included in the total above</p>
          {companyRate > 0 ? (
            <>
              <Row
                label="Weight × Company Rate"
                value={`${formatNumber(weight)} ${weightUnit} × ${formatCurrency(companyRate)}`}
              />
              <Row label="Party Amount" value={formatCurrency(partyAmount)} />
              <Row label="Company Amount" value={formatCurrency(companyAmount)} />
              <Row label="Difference" value={formatCurrency(difference)} />
            </>
          ) : null}
          {driverAdvance > 0 ? <Row label="Driver Advance" value={formatCurrency(driverAdvance)} /> : null}
          {vehicleRent > 0 ? <Row label="Vehicle Rent" value={formatCurrency(vehicleRent)} /> : null}
          {dieselCost > 0 ? <Row label="Diesel" value={formatCurrency(dieselCost)} /> : null}
        </div>
      ) : null}
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
