import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { LoadList } from "@/components/loads/LoadList";
import { PaymentList } from "@/components/payments/PaymentList";
import { getCurrentProfile } from "@/lib/actions/profile";
import { getLoadsForDate } from "@/lib/actions/loads";
import { getPaymentsForDate } from "@/lib/actions/payments";
import { summarize } from "@/lib/loadMapper";
import { formatLongDate, greetingForNow, todayIso } from "@/lib/formatting/date";

export default async function DashboardPage() {
  const today = todayIso();
  const [{ profile }, loads, payments] = await Promise.all([
    getCurrentProfile(),
    getLoadsForDate(today),
    getPaymentsForDate(today),
  ]);
  const summary = summarize(loads);

  const weightUnit = profile?.weightUnit ?? "kg";
  const firstName = profile?.name?.trim().split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {greetingForNow()}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">{formatLongDate(today)}</p>
      </div>

      <SummaryCards summary={summary} weightUnit={weightUnit} dateLabel="Today" />

      <div className="flex flex-col gap-3 md:flex-row">
        <Button
          size="lg"
          className="h-12 w-full text-base md:w-auto"
          nativeButton={false}
          render={
            <Link href="/loads/new">
              <Plus className="size-5" />
              Add Load
            </Link>
          }
        />
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-full text-base md:w-auto"
          nativeButton={false}
          render={
            <Link href="/payments/new">
              <Plus className="size-5" />
              Add Payment
            </Link>
          }
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Today&apos;s Loads</h2>
          <Link href="/loads" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <LoadList
          loads={loads}
          weightUnit={weightUnit}
          emptyTitle="No loads recorded today"
          emptyDescription="Add your first load for today."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Today&apos;s Payments</h2>
          <Link href="/payments" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <PaymentList
          payments={payments}
          emptyTitle="No payments recorded today"
          emptyDescription="Add your first payment for today."
        />
      </div>
    </div>
  );
}
