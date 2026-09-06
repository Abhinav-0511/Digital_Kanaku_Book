import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateNav } from "@/components/dashboard/DateNav";
import { FilterPanel } from "@/components/search/FilterPanel";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { LoadList } from "@/components/loads/LoadList";
import { getCurrentProfile } from "@/lib/actions/profile";
import { searchLoads } from "@/lib/actions/loads";
import { formatShortDate, todayIso } from "@/lib/formatting/date";
import type { LoadFilters } from "@/types/domain";

interface LoadsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function LoadsPage({ searchParams }: LoadsPageProps) {
  const params = await searchParams;
  const { profile } = await getCurrentProfile();
  const weightUnit = profile?.weightUnit ?? "kg";

  const rangeMode = Boolean(params.from || params.to);
  const date = params.date ?? todayIso();

  const filters: LoadFilters = {
    dateFrom: rangeMode ? params.from : date,
    dateTo: rangeMode ? params.to : date,
    vehicleNumber: params.vehicle,
    companyName: params.company,
    partyName: params.party,
    gst: (params.gst as LoadFilters["gst"]) || "all",
  };

  const { loads, summary } = await searchLoads(filters);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Loads</h1>
        <Button
          className="h-10"
          render={
            <Link href="/loads/new">
              <Plus className="size-4" />
              Add Load
            </Link>
          }
        />
      </div>

      {rangeMode ? (
        <div className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
          Showing loads from <span className="font-medium text-foreground">{params.from ? formatShortDate(params.from) : "the start"}</span> to{" "}
          <span className="font-medium text-foreground">{params.to ? formatShortDate(params.to) : "today"}</span>
        </div>
      ) : (
        <DateNav date={date} />
      )}

      <div className="flex justify-end">
        <FilterPanel basePath="/loads" />
      </div>

      <SummaryCards summary={summary} weightUnit={weightUnit} dateLabel={rangeMode ? "Loads" : "Today"} />

      <LoadList
        loads={loads}
        weightUnit={weightUnit}
        emptyTitle={rangeMode || params.vehicle || params.company || params.party ? "No loads found" : "No loads recorded today"}
        emptyDescription={
          rangeMode || params.vehicle || params.company || params.party
            ? "Try another vehicle number, company, or party."
            : "Add your first load for today."
        }
      />
    </div>
  );
}
