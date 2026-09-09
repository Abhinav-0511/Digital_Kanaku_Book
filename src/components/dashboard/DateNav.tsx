"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDaysIso, formatLongDate, isToday, todayIso } from "@/lib/formatting/date";

export function DateNav({ date, basePath = "/loads" }: { date: string; basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goTo(nextDate: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", nextDate);
    params.delete("from");
    params.delete("to");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-2">
      <Button variant="ghost" size="icon" className="size-11" onClick={() => goTo(addDaysIso(date, -1))} aria-label="Previous day">
        <ChevronLeft className="size-5" />
      </Button>

      <div className="flex flex-1 flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-3">
        <span className="text-sm font-medium">{formatLongDate(date)}</span>
        <div className="flex items-center gap-2">
          {!isToday(date) ? (
            <Button variant="outline" size="sm" className="h-8" onClick={() => goTo(todayIso())}>
              Today
            </Button>
          ) : null}
          <Input
            type="date"
            aria-label="Pick a date"
            value={date}
            max={todayIso()}
            onChange={(e) => e.target.value && goTo(e.target.value)}
            className="h-8 w-[9.5rem] text-xs"
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        onClick={() => goTo(addDaysIso(date, 1))}
        disabled={isToday(date)}
        aria-label="Next day"
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
