"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatMonthLabel, isToday, monthGridIso, monthOf, shiftMonth, todayIso } from "@/lib/formatting/date";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function MonthCalendarPopover({
  date,
  basePath,
  fetchCounts,
  itemLabel,
}: {
  date: string;
  basePath: string;
  fetchCounts: (month: string) => Promise<Record<string, number>>;
  itemLabel: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthOf(date));
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();
  const today = todayIso();

  // Re-center on the viewed month each time the popover opens, rather than
  // wherever it was last left.
  function handleOpenChange(next: boolean) {
    if (next) setMonth(monthOf(date));
    setOpen(next);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    startTransition(async () => {
      const result = await fetchCounts(month);
      if (!cancelled) setCounts(result);
    });
    return () => {
      cancelled = true;
    };
  }, [open, month, fetchCounts]);

  function goToDate(iso: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", iso);
    params.delete("from");
    params.delete("to");
    router.push(`${basePath}?${params.toString()}`);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={<Button variant="outline" size="icon" className="size-8" aria-label={`Browse ${itemLabel} calendar`} />}>
        <CalendarDays className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-[19.5rem]" align="end">
        <div className="flex items-center justify-between px-0.5">
          <Button variant="ghost" size="icon-sm" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium">{formatMonthLabel(month)}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={month >= monthOf(today)}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[0.65rem] font-medium text-muted-foreground">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i}>{label}</div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {monthGridIso(month).map(({ iso, inMonth }) => {
            const count = counts[iso] ?? 0;
            const selected = iso === date;
            const future = iso > today;
            return (
              <button
                key={iso}
                type="button"
                disabled={future}
                onClick={() => goToDate(iso)}
                aria-label={`${iso}${count ? `, ${count} ${itemLabel}${count === 1 ? "" : "s"}` : ""}`}
                className={cn(
                  "flex h-10 flex-col items-center justify-center rounded-md text-xs transition-colors",
                  !inMonth && "text-muted-foreground/40",
                  !future && !selected && "hover:bg-muted",
                  isToday(iso) && !selected && "bg-muted font-semibold",
                  selected && "bg-primary text-primary-foreground",
                  future && "cursor-not-allowed opacity-40",
                )}
              >
                <span className="leading-none">{Number(iso.slice(8, 10))}</span>
                <span
                  className={cn(
                    "mt-1 h-[0.65rem] text-[0.6rem] font-semibold leading-none",
                    count > 0 ? (selected ? "text-primary-foreground" : "text-primary") : "invisible",
                  )}
                >
                  {count || 0}
                </span>
              </button>
            );
          })}
        </div>

        {pending ? <p className="mt-1.5 text-center text-[0.65rem] text-muted-foreground">Loading…</p> : null}
      </PopoverContent>
    </Popover>
  );
}
