import { notFound } from "next/navigation";
import { BackLink } from "@/components/common/BackLink";
import { LoadList } from "@/components/loads/LoadList";
import { PaymentList } from "@/components/payments/PaymentList";
import { RenameControl } from "./RenameControl";
import { EntityStats, VehicleStats } from "./EntityStatGrid";
import { QuickDateFilters, ALL_TIME_PRESET, type DatePreset } from "./QuickDateFilters";
import { EntityDateRangeFilter } from "./EntityDateRangeFilter";
import { HistoryTabs, type HistoryTab } from "./HistoryTabs";
import { getCompanyHistory, renameCompany } from "@/lib/actions/companies";
import { getPartyHistory, renameParty } from "@/lib/actions/parties";
import { getVehicleHistory, renameVehicleNumber } from "@/lib/actions/loads";
import { dateRangePresets, formatShortDate } from "@/lib/formatting/date";
import type { EntityType } from "./EntityListView";

const TYPE_LABELS: Record<EntityType, string> = { vehicle: "Vehicle", company: "Company", party: "Party" };

/** The stats + rename + full history for one vehicle/company/party — reached
 * by picking an item from EntityListView. */
export async function EntityDetailView({
  type,
  value,
  from,
  to,
  historyParam,
  weightUnit,
}: {
  type: EntityType;
  value: string;
  from?: string;
  to?: string;
  historyParam?: string;
  weightUnit: string;
}) {
  const filters = { dateFrom: from, dateTo: to };
  const presets: DatePreset[] = [ALL_TIME_PRESET, ...dateRangePresets()];
  const historyTab: HistoryTab = historyParam === "payments" ? "payments" : "loads";

  function buildHref(preset: DatePreset) {
    const sp = new URLSearchParams();
    sp.set("tab", "search");
    sp.set("type", type);
    sp.set("value", value);
    if (preset.from) sp.set("from", preset.from);
    if (preset.to) sp.set("to", preset.to);
    return `/reports?${sp.toString()}`;
  }

  function buildHistoryHref(tab: HistoryTab) {
    const sp = new URLSearchParams();
    sp.set("tab", "search");
    sp.set("type", type);
    sp.set("value", value);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (tab !== "loads") sp.set("history", tab);
    return `/reports?${sp.toString()}`;
  }

  const dateFilterBar = (
    <div className="space-y-3">
      <QuickDateFilters presets={presets} activeFrom={from ?? ""} activeTo={to ?? ""} buildHref={buildHref} />
      <EntityDateRangeFilter key={`${from ?? ""}|${to ?? ""}`} type={type} value={value} from={from ?? ""} to={to ?? ""} />
      {from || to ? (
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{from ? formatShortDate(from) : "the start"}</span> to{" "}
          <span className="font-medium text-foreground">{to ? formatShortDate(to) : "today"}</span>
        </p>
      ) : null}
    </div>
  );

  if (type === "vehicle") {
    const history = await getVehicleHistory(value, filters);
    const renameThisVehicle = renameVehicleNumber.bind(null, history.vehicleNumber);
    const dateSuffix = `${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`;

    return (
      <div className="space-y-5">
        <BackLink href="/reports?tab=search&type=vehicle" label="Back to Vehicles" />
        <RenameControl
          typeLabel={TYPE_LABELS.vehicle}
          currentName={history.vehicleNumber}
          onRename={renameThisVehicle}
          redirectTemplate={`/reports?tab=search&type=vehicle&value={value}${dateSuffix}`}
        />
        {dateFilterBar}
        <VehicleStats summary={history.summary} weightUnit={weightUnit} />
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Loads</h2>
          <LoadList loads={history.loads} weightUnit={weightUnit} emptyTitle="No loads found" emptyDescription="This vehicle has no recorded loads yet." />
        </div>
      </div>
    );
  }

  if (type === "company") {
    const history = await getCompanyHistory(value, filters);
    if (!history.company) notFound();
    const renameThisCompany = renameCompany.bind(null, history.company.id);

    return (
      <div className="space-y-5">
        <BackLink href="/reports?tab=search&type=company" label="Back to Companies" />
        <RenameControl typeLabel={TYPE_LABELS.company} currentName={history.company.name} onRename={renameThisCompany} />
        {dateFilterBar}
        <EntityStats summary={history.summary} paymentSummary={history.paymentSummary} paymentLabel="Total Received" weightUnit={weightUnit} />
        <div className="space-y-3">
          <HistoryTabs active={historyTab} buildHref={buildHistoryHref} />
          {historyTab === "loads" ? (
            <LoadList loads={history.loads} weightUnit={weightUnit} emptyTitle="No loads found" emptyDescription="This company has no recorded loads yet." />
          ) : (
            <PaymentList payments={history.payments} emptyTitle="No payments found" emptyDescription="This company has no recorded payments yet." />
          )}
        </div>
      </div>
    );
  }

  const history = await getPartyHistory(value, filters);
  if (!history.party) notFound();
  const renameThisParty = renameParty.bind(null, history.party.id);

  return (
    <div className="space-y-5">
      <BackLink href="/reports?tab=search&type=party" label="Back to Parties" />
      <RenameControl typeLabel={TYPE_LABELS.party} currentName={history.party.name} onRename={renameThisParty} />
      {dateFilterBar}
      <EntityStats summary={history.summary} paymentSummary={history.paymentSummary} paymentLabel="Total Paid" weightUnit={weightUnit} />
      <div className="space-y-3">
        <HistoryTabs active={historyTab} buildHref={buildHistoryHref} />
        {historyTab === "loads" ? (
          <LoadList loads={history.loads} weightUnit={weightUnit} emptyTitle="No loads found" emptyDescription="This party has no recorded loads yet." />
        ) : (
          <PaymentList payments={history.payments} emptyTitle="No payments found" emptyDescription="This party has no recorded payments yet." />
        )}
      </div>
    </div>
  );
}
