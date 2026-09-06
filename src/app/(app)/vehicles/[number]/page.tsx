import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { LoadList } from "@/components/loads/LoadList";
import { getVehicleHistory } from "@/lib/actions/loads";
import { getCurrentProfile } from "@/lib/actions/profile";

export default async function VehicleHistoryPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const decoded = decodeURIComponent(number);
  const [{ vehicleNumber, summary, loads }, { profile }] = await Promise.all([
    getVehicleHistory(decoded),
    getCurrentProfile(),
  ]);
  const weightUnit = profile?.weightUnit ?? "kg";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vehicle History</p>
        <h1 className="text-xl font-semibold">{vehicleNumber || decoded}</h1>
      </div>

      <SummaryCards summary={summary} weightUnit={weightUnit} dateLabel="Total" />

      <div className="space-y-3">
        <h2 className="text-base font-semibold">All Loads</h2>
        <LoadList
          loads={loads}
          weightUnit={weightUnit}
          emptyTitle="No loads found"
          emptyDescription="This vehicle has no recorded loads yet."
        />
      </div>
    </div>
  );
}
