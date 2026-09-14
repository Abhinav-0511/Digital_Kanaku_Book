import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DatePreset {
  label: string;
  from: string;
  to: string;
}

/** An empty from/to pair clears the date filter entirely. */
export const ALL_TIME_PRESET: DatePreset = { label: "All Time", from: "", to: "" };

/** A row of date-range preset pills (Link-based — no client JS needed). */
export function QuickDateFilters({
  presets,
  activeFrom,
  activeTo,
  buildHref,
}: {
  presets: DatePreset[];
  activeFrom: string;
  activeTo: string;
  buildHref: (preset: DatePreset) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <Link
          key={preset.label}
          href={buildHref(preset)}
          className={cn(
            "h-9 rounded-lg border px-3 text-xs font-medium leading-9 transition-colors",
            activeFrom === preset.from && activeTo === preset.to
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          {preset.label}
        </Link>
      ))}
    </div>
  );
}
