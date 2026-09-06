import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/formatting/currency";
import { formatTime } from "@/lib/formatting/date";
import type { Load } from "@/types/domain";

export function LoadCard({ load, weightUnit }: { load: Load; weightUnit: string }) {
  return (
    <Link
      href={`/loads/${load.id}`}
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors active:bg-muted/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{load.vehicleNumber}</p>
          <p className="truncate text-sm text-muted-foreground">
            {load.companyName} → {load.partyName}
          </p>
        </div>
        {load.gstEnabled ? (
          <Badge variant="secondary" className="shrink-0">
            GST {formatNumber(load.gstPercentage)}%
          </Badge>
        ) : (
          <Badge variant="outline" className="shrink-0 text-muted-foreground">
            No GST
          </Badge>
        )}
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {formatNumber(load.weight)} {weightUnit} × {formatCurrency(load.rate)}
      </p>

      <div className="mt-3 flex items-end justify-between">
        <span className="text-lg font-bold text-primary">{formatCurrency(load.totalAmount)}</span>
        <span className="text-xs text-muted-foreground">{formatTime(load.createdAt)}</span>
      </div>
    </Link>
  );
}
