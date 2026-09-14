import { notFound } from "next/navigation";
import { LoadForm } from "@/components/loads/LoadForm";
import { BackLink } from "@/components/common/BackLink";
import { getLoad } from "@/lib/actions/loads";
import { getCurrentProfile } from "@/lib/actions/profile";

export default async function EditLoadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [load, { profile }] = await Promise.all([getLoad(id), getCurrentProfile()]);

  if (!load) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <BackLink href={`/loads/${load.id}`} label="Back to Load" />
      <div>
        <h1 className="text-xl font-semibold">Edit Load</h1>
        <p className="text-sm text-muted-foreground">{load.vehicleNumber}</p>
      </div>
      {/* key forces a fresh mount per load, so useState's initializer
          re-seeds the form instead of carrying over another load's state
          when navigating directly between two edit pages. */}
      <LoadForm key={load.id} mode="edit" loadId={load.id} initialLoad={load} weightUnit={profile?.weightUnit ?? "kg"} />
    </div>
  );
}
