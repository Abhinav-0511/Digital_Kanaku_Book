import { notFound } from "next/navigation";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { LoadList } from "@/components/loads/LoadList";
import { getCompanyHistory } from "@/lib/actions/companies";
import { getCurrentProfile } from "@/lib/actions/profile";

export default async function CompanyHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ company, summary, loads }, { profile }] = await Promise.all([getCompanyHistory(id), getCurrentProfile()]);

  if (!company) notFound();
  const weightUnit = profile?.weightUnit ?? "kg";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Company History</p>
        <h1 className="text-xl font-semibold">{company.name}</h1>
      </div>

      <SummaryCards summary={summary} weightUnit={weightUnit} dateLabel="Total" />

      <div className="space-y-3">
        <h2 className="text-base font-semibold">All Loads</h2>
        <LoadList
          loads={loads}
          weightUnit={weightUnit}
          emptyTitle="No loads found"
          emptyDescription="This company has no recorded loads yet."
        />
      </div>
    </div>
  );
}
