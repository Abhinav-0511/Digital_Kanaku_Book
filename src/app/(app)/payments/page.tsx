import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateNav } from "@/components/dashboard/DateNav";
import { PaymentFilterPanel } from "@/components/payments/PaymentFilterPanel";
import { PaymentList } from "@/components/payments/PaymentList";
import { getPaymentCountsForMonth, searchPayments } from "@/lib/actions/payments";
import { formatCurrency } from "@/lib/formatting/currency";
import { formatShortDate, todayIso } from "@/lib/formatting/date";
import type { PaymentFilters } from "@/types/domain";

interface PaymentsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const params = await searchParams;
  const rangeMode = Boolean(params.from || params.to);
  const date = params.date ?? todayIso();

  const filters: PaymentFilters = {
    dateFrom: rangeMode ? params.from : date,
    dateTo: rangeMode ? params.to : date,
    companyName: params.company,
    partyName: params.party,
  };

  const { payments, summary } = await searchPayments(filters);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Payments</h1>
        <Button
          className="h-10"
          nativeButton={false}
          render={
            <Link href="/payments/new">
              <Plus className="size-4" />
              Add Payment
            </Link>
          }
        />
      </div>

      {rangeMode ? (
        <div className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
          Showing payments from <span className="font-medium text-foreground">{params.from ? formatShortDate(params.from) : "the start"}</span> to{" "}
          <span className="font-medium text-foreground">{params.to ? formatShortDate(params.to) : "today"}</span>
        </div>
      ) : (
        <DateNav date={date} basePath="/payments" fetchMonthCounts={getPaymentCountsForMonth} itemLabel="payment" />
      )}

      <div className="flex justify-end">
        <PaymentFilterPanel basePath="/payments" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(summary.totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Received</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(summary.totalReceived)}</p>
        </div>
      </div>

      <PaymentList
        payments={payments}
        emptyTitle={rangeMode || params.company || params.party ? "No payments found" : "No payments recorded today"}
        emptyDescription={
          rangeMode || params.company || params.party
            ? "Try another company or party."
            : "Add your first payment for today."
        }
      />
    </div>
  );
}
