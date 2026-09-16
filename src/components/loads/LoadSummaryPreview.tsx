import { round2 } from "@/lib/calculations/loadCalculations";
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
  companyWeight: number;
  companyBaseAmount: number;
  companyGstPercentage: number;
  companyGstAmount: number;
  companyTotal: number;
  partyAmount: number;
  companyAmount: number;
  difference: number;
  profit: number;
  driverAdvance: number;
  vehicleRent: number;
  dieselCost: number;
  totalAmount: number;
  party2Enabled?: boolean;
  party2Weight?: number;
  party2BaseAmount?: number;
  party2GstAmount?: number;
  party2TotalAmount?: number;
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
  companyWeight,
  companyBaseAmount,
  companyGstPercentage,
  companyGstAmount,
  companyTotal,
  partyAmount,
  companyAmount,
  difference,
  profit,
  driverAdvance,
  vehicleRent,
  dieselCost,
  totalAmount,
  party2Enabled,
  party2Weight = 0,
  party2BaseAmount = 0,
  party2GstAmount = 0,
  party2TotalAmount = 0,
}: LoadSummaryPreviewProps) {
  const hasOtherCosts = companyRate > 0 || driverAdvance > 0 || vehicleRent > 0 || dieselCost > 0;
  const otherAmount = round2(driverAdvance + vehicleRent + dieselCost);

  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-muted/40 p-4">
      <Row label={`Weight × Party Rate`} value={`${formatNumber(weight)} ${weightUnit} × ${formatCurrency(rate)}`} />
      <Row label="Base Amount" value={formatCurrency(baseAmount)} />
      <Row label={gstEnabled ? `GST (${formatNumber(gstPercentage)}%)` : "GST"} value={gstEnabled ? formatCurrency(gstAmount) : "No GST"} />

      {party2Enabled ? (
        <div className="space-y-2.5 border-t border-dashed border-border pt-2.5">
          <Row label="Party 2: Weight × Rate" value={`${formatNumber(party2Weight)} ${weightUnit} × ${formatCurrency(rate)}`} />
          <Row label="Party 2 Base Amount" value={formatCurrency(party2BaseAmount)} />
          <Row
            label={gstEnabled ? `Party 2 GST (${formatNumber(gstPercentage)}%)` : "Party 2 GST"}
            value={gstEnabled ? formatCurrency(party2GstAmount) : "No GST"}
          />
          <Row label="Party 2 Total" value={formatCurrency(party2TotalAmount)} bold />
        </div>
      ) : null}

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
                value={`${formatNumber(companyWeight)} ${weightUnit} × ${formatCurrency(companyRate)}`}
              />
              <Row label="Company Base Amount" value={formatCurrency(companyBaseAmount)} />
              <Row label={`GST (${formatNumber(companyGstPercentage)}%)`} value={formatCurrency(companyGstAmount)} />
              <div className="flex items-center justify-between border-t border-border pt-2.5">
                <span className="text-sm font-semibold text-foreground">Company Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(companyTotal)}</span>
              </div>

              <div className="space-y-2.5 border-t border-dashed border-border pt-2.5">
                <Row label="Party Amount" value={formatCurrency(partyAmount)} />
                <Row label="Company Amount" value={formatCurrency(companyAmount)} />
                <Row label="Difference" value={formatCurrency(difference)} bold />
              </div>
            </>
          ) : null}
          {driverAdvance > 0 ? <Row label="Driver Advance" value={formatCurrency(driverAdvance)} /> : null}
          {vehicleRent > 0 ? <Row label="Vehicle Rent" value={formatCurrency(vehicleRent)} /> : null}
          {dieselCost > 0 ? <Row label="Diesel" value={formatCurrency(dieselCost)} /> : null}

          {companyRate > 0 ? (
            <>
              <Row label="Other Amount" value={formatCurrency(otherAmount)} bold />
              <Row label="Difference − Other Amount" value={`${formatCurrency(difference)} − ${formatCurrency(otherAmount)}`} />
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5">
                <span className="text-sm font-semibold text-foreground">PROFIT</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(profit)}</span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={bold ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "font-bold text-foreground" : "font-medium text-foreground"}>{value}</span>
    </div>
  );
}
