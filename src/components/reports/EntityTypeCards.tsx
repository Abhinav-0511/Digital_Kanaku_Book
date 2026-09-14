import Link from "next/link";
import { Truck, Building2, Users } from "lucide-react";

const CARDS = [
  { type: "vehicle", label: "Vehicle", description: "Loads, profit, and costs by vehicle number", icon: Truck },
  { type: "company", label: "Company", description: "Loads and payments by company", icon: Building2 },
  { type: "party", label: "Party", description: "Loads and payments by party", icon: Users },
] as const;

export function EntityTypeCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.type}
            href={`/reports?tab=search&type=${card.type}`}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/40 active:bg-muted/60"
          >
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-base font-semibold">{card.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{card.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
