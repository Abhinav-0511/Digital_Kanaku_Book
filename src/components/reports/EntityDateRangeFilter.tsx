"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { todayIso } from "@/lib/formatting/date";
import type { EntityType } from "./EntityListView";

/**
 * Custom From/To date range for one entity's detail view — sits alongside
 * the quick-preset pills. The parent gives this a `key` tied to the
 * resolved from/to, so picking a quick preset (a plain navigation) remounts
 * it with the right values instead of leaving stale typed-but-not-applied
 * text behind (same reasoning as the edit-page `key` fix elsewhere).
 */
export function EntityDateRangeFilter({
  type,
  value,
  from,
  to,
}: {
  type: EntityType;
  value: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  function apply() {
    const sp = new URLSearchParams();
    sp.set("tab", "search");
    sp.set("type", type);
    sp.set("value", value);
    if (localFrom) sp.set("from", localFrom);
    if (localTo) sp.set("to", localTo);
    router.push(`/reports?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="edr-from" className="text-xs text-muted-foreground">
          From
        </Label>
        <Input
          id="edr-from"
          type="date"
          value={localFrom}
          max={todayIso()}
          onChange={(e) => setLocalFrom(e.target.value)}
          className="h-9 w-[9.5rem] text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edr-to" className="text-xs text-muted-foreground">
          To
        </Label>
        <Input
          id="edr-to"
          type="date"
          value={localTo}
          max={todayIso()}
          onChange={(e) => setLocalTo(e.target.value)}
          className="h-9 w-[9.5rem] text-xs"
        />
      </div>
      <Button type="button" size="sm" className="h-9" onClick={apply}>
        Apply
      </Button>
    </div>
  );
}
