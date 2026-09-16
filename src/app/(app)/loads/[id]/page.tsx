import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/common/BackLink";
import { ConfirmDeleteDialog } from "@/components/loads/ConfirmDeleteDialog";
import { getLoad } from "@/lib/actions/loads";
import { getCurrentProfile } from "@/lib/actions/profile";
import { calculateLoadAmountBreakdown, calculateProfit, round2 } from "@/lib/calculations/loadCalculations";
import { formatCurrency, formatNumber } from "@/lib/formatting/currency";
import { formatDateTime, formatLongDate } from "@/lib/formatting/date";

export default async function LoadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [load, { profile }] = await Promise.all([getLoad(id), getCurrentProfile()]);

  if (!load) notFound();
  const weightUnit = profile?.weightUnit ?? "kg";
  const {
    partyAmount: party1Amount,
    party2Amount,
    combinedWeight,
    companyAmount,
    partyAmountExGst,
    party2AmountExGst,
    companyAmountExGst,
    difference,
  } = calculateLoadAmountBreakdown({
    weight: load.weight,
    rate: load.rate,
    companyRate: load.companyRate,
    gstEnabled: load.gstEnabled,
    gstPercentage: load.gstPercentage,
    partyName: load.partyName,
    companyName: load.companyName,
    party2Enabled: Boolean(load.party2Id),
    party2Weight: load.party2Weight,
    party2Name: load.party2Name,
  });
  const partyAmount = round2(party1Amount + party2Amount);
  const partyBaseAmount = round2(partyAmountExGst + party2AmountExGst);
  const otherAmount = round2(load.driverAdvance + load.vehicleRent + load.dieselCost);
  const profit = calculateProfit(difference, load.driverAdvance, load.vehicleRent, load.dieselCost);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <BackLink href="/loads" label="Back to Loads" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/vehicles/${encodeURIComponent(load.vehicleNumber)}`} className="text-xl font-semibold hover:underline">
            {load.vehicleNumber}
          </Link>
          <p className="text-sm text-muted-foreground">{formatLongDate(load.loadDate)}</p>
        </div>
        {load.gstEnabled ? (
          <Badge variant="secondary">GST {formatNumber(load.gstPercentage)}%</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            No GST
          </Badge>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-primary/10 p-4 text-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary/80">Party Amount</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(partyAmount)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary/80">Company Amount</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(companyAmount)}</p>
          </div>
        </div>

        <dl className="mt-4 divide-y divide-border text-sm">
          <Row label="Weight" value={`${formatNumber(combinedWeight)} ${weightUnit}`} emphasize />
          <Row label="Company" value={load.companyName || "—"} href={load.companyId ? `/companies/${load.companyId}` : undefined} />
          <Row label="Company Rate" value={formatCurrency(load.companyRate)} />
          <Row label="Party" value={load.partyName || "—"} href={load.partyId ? `/parties/${load.partyId}` : undefined} />
          <Row label="Party Rate" value={formatCurrency(load.rate)} />
          {load.party2Id ? (
            <>
              <Row label="Party 2" value={load.party2Name || "—"} href={`/parties/${load.party2Id}`} />
              <Row label="Party 2 Weight" value={`${formatNumber(load.party2Weight)} ${weightUnit}`} />
              <Row label="Party 2 Amount" value={formatCurrency(load.party2TotalAmount)} />
            </>
          ) : null}
          <Row label="GST Type" value={load.gstEnabled ? "Applied" : "No GST"} />
          {load.gstEnabled ? <Row label="GST Percentage" value={`${formatNumber(load.gstPercentage)}%`} /> : null}
          <Row label="GST Amount" value={formatCurrency(load.gstAmount)} />
          <Row label="Driver Advance" value={formatCurrency(load.driverAdvance)} />
          <Row label="Vehicle Rent" value={formatCurrency(load.vehicleRent)} />
          <Row label="Diesel" value={formatCurrency(load.dieselCost)} />
          <Row label="Created At" value={formatDateTime(load.createdAt)} />
          <Row label="Last Updated" value={formatDateTime(load.updatedAt)} />
        </dl>

        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <AmountRow label="Party Amount" value={formatCurrency(partyBaseAmount)} />
          <AmountRow label="Company Amount" value={formatCurrency(companyAmountExGst)} />
          <AmountRow label="Difference" value={formatCurrency(difference)} bold />
          <AmountRow label="Other Amount" value={formatCurrency(otherAmount)} bold />
          <AmountRow label="Difference − Other Amount" value={`${formatCurrency(difference)} − ${formatCurrency(otherAmount)}`} />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-4">
          <span className="text-base font-bold text-foreground">Profit</span>
          <span className="text-xl font-bold text-primary">{formatCurrency(profit)}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="h-11 flex-1"
          nativeButton={false}
          render={
            <Link href={`/loads/${load.id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          }
        />
        <ConfirmDeleteDialog loadId={load.id} className="flex-1" />
      </div>
    </div>
  );
}

function AmountRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={bold ? "text-base font-semibold text-foreground" : "text-base text-muted-foreground"}>{label}</span>
      <span className={bold ? "text-lg font-extrabold text-foreground" : "text-lg font-semibold text-foreground"}>{value}</span>
    </div>
  );
}

function Row({
  label,
  value,
  href,
  emphasize,
}: {
  label: string;
  value: string;
  href?: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={emphasize ? "text-base font-bold text-foreground" : "font-medium"}>
        {href ? (
          <Link href={href} className="text-primary hover:underline">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
