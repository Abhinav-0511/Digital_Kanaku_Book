import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BackLink } from "@/components/common/BackLink";
import { EmptyState } from "@/components/common/EmptyState";
import { listCompanies } from "@/lib/actions/companies";
import { listParties } from "@/lib/actions/parties";
import { listVehicleNumbers } from "@/lib/actions/loads";

export type EntityType = "vehicle" | "company" | "party";

const TITLES: Record<EntityType, { title: string; empty: string }> = {
  vehicle: { title: "Vehicles", empty: "No vehicles yet" },
  company: { title: "Companies", empty: "No companies yet" },
  party: { title: "Parties", empty: "No parties yet" },
};

interface EntityListItem {
  key: string;
  label: string;
  href: string;
}

async function loadItems(type: EntityType): Promise<EntityListItem[]> {
  if (type === "vehicle") {
    const numbers = await listVehicleNumbers();
    return numbers.map((number) => ({
      key: number,
      label: number,
      href: `/reports?tab=search&type=vehicle&value=${encodeURIComponent(number)}`,
    }));
  }
  if (type === "company") {
    const companies = await listCompanies();
    return companies.map((company) => ({ key: company.id, label: company.name, href: `/reports?tab=search&type=company&value=${company.id}` }));
  }
  const parties = await listParties();
  return parties.map((party) => ({ key: party.id, label: party.name, href: `/reports?tab=search&type=party&value=${party.id}` }));
}

/** The browsable list shown after picking Vehicle/Company/Party from the type cards. */
export async function EntityListView({ type }: { type: EntityType }) {
  const items = await loadItems(type);
  const { title, empty } = TITLES[type];

  return (
    <div className="space-y-3">
      <BackLink href="/reports?tab=search" label="Back" />
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <EmptyState title={empty} description="Add a load to start tracking it here." />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {items.map((item) => (
            <Link key={item.key} href={item.href} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50">
              <span className="truncate font-medium">{item.label}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
