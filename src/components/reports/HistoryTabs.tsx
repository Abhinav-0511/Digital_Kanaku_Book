import Link from "next/link";
import { cn } from "@/lib/utils";

export type HistoryTab = "loads" | "payments";

const TABS: { value: HistoryTab; label: string }[] = [
  { value: "loads", label: "Loads" },
  { value: "payments", label: "Payments" },
];

/** Switches a company/party detail view between its Loads and Payments history. */
export function HistoryTabs({ active, buildHref }: { active: HistoryTab; buildHref: (tab: HistoryTab) => string }) {
  return (
    <div className="inline-grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={buildHref(tab.value)}
          className={cn(
            "flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors",
            active === tab.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
