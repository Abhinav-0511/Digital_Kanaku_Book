"use client";

import { useEffect, useState, useTransition } from "react";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadList } from "@/components/loads/LoadList";
import { LocalFilterPanel } from "./LocalFilterPanel";
import { useDebounce } from "@/hooks/useDebounce";
import { searchLoads } from "@/lib/actions/loads";
import type { Load, LoadFilters } from "@/types/domain";

export function SearchClient({ weightUnit }: { weightUnit: string }) {
  const [filters, setFilters] = useState<LoadFilters>({ query: "" });
  const [queryInput, setQueryInput] = useState("");
  const debouncedQuery = useDebounce(queryInput, 300);
  const [loads, setLoads] = useState<Load[]>([]);
  const [isPending, startTransition] = useTransition();

  const effectiveFilters: LoadFilters = { ...filters, query: debouncedQuery };
  const hasAnyCriteria = Boolean(
    debouncedQuery || filters.vehicleNumber || filters.companyName || filters.partyName || filters.dateFrom || filters.dateTo || (filters.gst && filters.gst !== "all"),
  );

  useEffect(() => {
    if (!hasAnyCriteria) return;
    startTransition(() => {
      searchLoads(effectiveFilters).then((result) => setLoads(result.loads));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filters]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search vehicle, company or party..."
            className="h-12 pl-10 text-base"
            autoFocus
          />
        </div>
        <LocalFilterPanel filters={filters} onApply={(next) => setFilters(next)} />
      </div>

      {isPending ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Searching...
        </div>
      ) : hasAnyCriteria ? (
        <LoadList loads={loads} weightUnit={weightUnit} />
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Start typing a vehicle number, company, or party name to search.
        </p>
      )}
    </div>
  );
}
