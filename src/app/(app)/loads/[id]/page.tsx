import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/common/BackLink";
import { ConfirmDeleteDialog } from "@/components/loads/ConfirmDeleteDialog";
import { getLoad } from "@/lib/actions/loads";
import { getCurrentProfile } from "@/lib/actions/profile";
import { calculateLoadAmountBreakdown } from "@/lib/calculations/loadCalculations";
import { formatCurrency, formatNumber } from "@/lib/formatting/currency";
import { formatDateTime, formatLongDate } from "@/lib/formatting/date";

export default async function LoadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [load, { profile }] = await Promise.all([getLoad(id), getCurrentProfile()]);

  if (!load) notFound();
  const weightUnit = profile?.weightUnit ?? "kg";
  const { partyAmount, companyAmount, difference } = calculateLoadAmountBreakdown({
    weight: load.weight,
    rate: load.rate,
    companyRate: load.companyRate,
    gstEnabled: load.gstEnabled,
    gstPercentage: load.gstPercentage,
    partyName: load.partyName,
    companyName: load.companyName,
  });

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
        <div className="rounded-lg bg-primary/10 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-primary/80">Total Amount</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(load.totalAmount)}</p>
        </div>

        <dl className="mt-4 divide-y divide-border text-sm">
          <Row label="Weight" value={`${formatNumber(load.weight)} ${weightUnit}`} emphasize />
          <Row label="Company" value={load.companyName || "—"} href={load.companyId ? `/companies/${load.companyId}` : undefined} />
          <Row label="Company Rate" value={formatCurrency(load.companyRate)} />
          <Row label="Party" value={load.partyName || "—"} href={load.partyId ? `/parties/${load.partyId}` : undefined} />
          <Row label="Party Rate" value={formatCurrency(load.rate)} />
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
          <AmountRow label="Party Amount" value={formatCurrency(partyAmount)} />
          <AmountRow label="Company Amount" value={formatCurrency(companyAmount)} />
          <AmountRow label="Difference" value={formatCurrency(difference)} />
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

function AmountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-base text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold text-foreground">{value}</span>
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
