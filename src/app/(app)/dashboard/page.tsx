import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { LoadList } from "@/components/loads/LoadList";
import { getCurrentProfile } from "@/lib/actions/profile";
import { getDailySummary, getLoadsForDate } from "@/lib/actions/loads";
import { formatLongDate, greetingForNow, todayIso } from "@/lib/formatting/date";

export default async function DashboardPage() {
  const today = todayIso();
  const [{ profile }, summary, loads] = await Promise.all([
    getCurrentProfile(),
    getDailySummary(today),
    getLoadsForDate(today),
  ]);

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
    </div>
  );
}
