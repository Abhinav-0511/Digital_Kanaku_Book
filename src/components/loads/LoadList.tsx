import { EmptyState } from "@/components/common/EmptyState";
import { LoadCard } from "./LoadCard";
import { LoadTable } from "./LoadTable";
import type { Load } from "@/types/domain";

export function LoadList({
  loads,
  weightUnit,
  emptyTitle = "No loads found",
  emptyDescription = "Try another vehicle number, company, or party.",
}: {
  loads: Load[];
  weightUnit: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (loads.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {loads.map((load) => (
          <LoadCard key={load.id} load={load} weightUnit={weightUnit} />
        ))}
      </div>
      <div className="hidden md:block">
        <LoadTable loads={loads} weightUnit={weightUnit} />
      </div>
    </>
  );
}
