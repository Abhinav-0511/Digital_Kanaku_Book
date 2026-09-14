import Link from "next/link";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { PaymentSummaryCards } from "@/components/reports/PaymentSummaryCards";
import { HighlightsFilterPanel } from "@/components/reports/HighlightsFilterPanel";
import { QuickDateFilters, ALL_TIME_PRESET, type DatePreset } from "@/components/reports/QuickDateFilters";
import { EntityTypeCards } from "@/components/reports/EntityTypeCards";
import { EntityListView, type EntityType } from "@/components/reports/EntityListView";
import { EntityDetailView } from "@/components/reports/EntityDetailView";
import { getCurrentProfile } from "@/lib/actions/profile";
import { searchLoads } from "@/lib/actions/loads";
import { searchPayments } from "@/lib/actions/payments";
import { dateRangePresets, formatShortDate, startOfMonthIso, todayIso } from "@/lib/formatting/date";
import { cn } from "@/lib/utils";
import type { LoadFilters, PaymentFilters } from "@/types/domain";

interface ReportsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const TABS = [
  { value: "highlights", label: "Highlights" },
  { value: "search", label: "Search" },
] as const;

const ENTITY_TYPES: EntityType[] = ["vehicle", "company", "party"];

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const tab = params.tab === "search" ? "search" : "highlights";
  const { profile } = await getCurrentProfile();
  const weightUnit = profile?.weightUnit ?? "kg";

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Reports</h1>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-1">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/reports?tab=${t.value}`}
            className={cn(
              "flex h-10 items-center justify-center rounded-md text-sm font-medium transition-colors",
              tab === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "highlights" ? <HighlightsTab params={params} weightUnit={weightUnit} /> : <SearchTab params={params} weightUnit={weightUnit} />}
    </div>
  );
}

async function HighlightsTab({ params, weightUnit }: { params: Record<string, string | undefined>; weightUnit: string }) {
  const from = params.from ?? startOfMonthIso();
  const to = params.to ?? todayIso();
  const company = params.company ?? "";
  const party = params.party ?? "";

  const loadFilters: LoadFilters = { dateFrom: from, dateTo: to, companyName: company, partyName: party };
  const paymentFilters: PaymentFilters = { dateFrom: from, dateTo: to, companyName: company, partyName: party };

  const [{ summary }, { summary: paymentSummary }] = await Promise.all([
    searchLoads(loadFilters),
    searchPayments(paymentFilters),
  ]);

  const presets: DatePreset[] = [ALL_TIME_PRESET, ...dateRangePresets()];

  function buildHref(preset: DatePreset) {
    const sp = new URLSearchParams();
    sp.set("tab", "highlights");
    sp.set("from", preset.from);
    sp.set("to", preset.to);
    if (company) sp.set("company", company);
    if (party) sp.set("party", party);
    return `/reports?${sp.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <QuickDateFilters presets={presets} activeFrom={from} activeTo={to} buildHref={buildHref} />
        <div className="ml-auto">
          <HighlightsFilterPanel />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
        Showing{" "}
        {from || to ? (
          <>
            <span className="font-medium text-foreground">{from ? formatShortDate(from) : "the start"}</span> to{" "}
            <span className="font-medium text-foreground">{to ? formatShortDate(to) : "today"}</span>
          </>
        ) : (
          <span className="font-medium text-foreground">all time</span>
        )}
        {company ? (
          <>
            {" "}
            · Company <span className="font-medium text-foreground">{company}</span>
          </>
        ) : null}
        {party ? (
          <>
            {" "}
            · Party <span className="font-medium text-foreground">{party}</span>
          </>
        ) : null}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Loads</h2>
        <SummaryCards summary={summary} weightUnit={weightUnit} dateLabel="Loads" showAmountBreakdown />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Payments</h2>
        <PaymentSummaryCards summary={paymentSummary} />
      </div>
    </div>
  );
}

function SearchTab({ params, weightUnit }: { params: Record<string, string | undefined>; weightUnit: string }) {
  const type = ENTITY_TYPES.includes(params.type as EntityType) ? (params.type as EntityType) : undefined;

  if (!type) return <EntityTypeCards />;
  if (!params.value) return <EntityListView type={type} />;
  return (
    <EntityDetailView
      type={type}
      value={params.value}
      from={params.from}
      to={params.to}
      historyParam={params.history}
      weightUnit={weightUnit}
    />
  );
}
