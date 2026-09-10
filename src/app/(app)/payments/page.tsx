import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateNav } from "@/components/dashboard/DateNav";
import { PaymentList } from "@/components/payments/PaymentList";
import { getPaymentsForDate } from "@/lib/actions/payments";
import { formatCurrency } from "@/lib/formatting/currency";
import { todayIso } from "@/lib/formatting/date";
import { summarizePayments } from "@/lib/paymentMapper";

interface PaymentsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const params = await searchParams;
  const date = params.date ?? todayIso();
  const payments = await getPaymentsForDate(date);
  const summary = summarizePayments(payments);

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

      <DateNav date={date} basePath="/payments" />

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
        emptyTitle="No payments recorded today"
        emptyDescription="Add your first payment for today."
      />
    </div>
  );
}
