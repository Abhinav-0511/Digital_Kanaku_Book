import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/formatting/currency";
import { formatTime } from "@/lib/formatting/date";
import type { Load } from "@/types/domain";

export function LoadTable({ loads, weightUnit }: { loads: Load[]; weightUnit: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Vehicle</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Party</th>
            <th className="px-4 py-3 text-right">Weight</th>
            <th className="px-4 py-3 text-right">Party Rate</th>
            <th className="px-4 py-3">GST</th>
            <th className="px-4 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {loads.map((load) => (
            <tr key={load.id} className="transition-colors hover:bg-muted/40">
              <td className="px-4 py-3 text-muted-foreground">{formatTime(load.createdAt)}</td>
              <td className="px-4 py-3 font-medium">
                <Link href={`/loads/${load.id}`} className="hover:underline">
                  {load.vehicleNumber}
                </Link>
              </td>
              <td className="px-4 py-3">{load.companyName || "—"}</td>
              <td className="px-4 py-3">{load.partyName || "—"}</td>
              <td className="px-4 py-3 text-right">
                {formatNumber(load.weight)} {weightUnit}
              </td>
              <td className="px-4 py-3 text-right">{formatCurrency(load.rate)}</td>
              <td className="px-4 py-3">
                {load.gstEnabled ? <Badge variant="secondary">{formatNumber(load.gstPercentage)}%</Badge> : <Badge variant="outline">No GST</Badge>}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-primary">{formatCurrency(load.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
