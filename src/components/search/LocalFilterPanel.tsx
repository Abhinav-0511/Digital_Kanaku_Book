"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VehicleInput } from "@/components/loads/VehicleInput";
import { NameCombobox } from "@/components/loads/NameCombobox";
import { searchCompanies } from "@/lib/actions/companies";
import { searchParties } from "@/lib/actions/parties";
import { dateRangePresets } from "@/lib/formatting/date";
import { cn } from "@/lib/utils";
import type { LoadFilters } from "@/types/domain";

const GST_OPTIONS: { value: NonNullable<LoadFilters["gst"]>; label: string }[] = [
  { value: "all", label: "All" },
  { value: "gst", label: "GST" },
  { value: "no-gst", label: "No GST" },
];

export function LocalFilterPanel({
  filters,
  onApply,
}: {
  filters: LoadFilters;
  onApply: (filters: LoadFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LoadFilters>(filters);

  const activeCount =
    [draft.vehicleNumber, draft.companyName, draft.partyName, draft.dateFrom, draft.dateTo].filter(Boolean).length +
    (draft.gst && draft.gst !== "all" ? 1 : 0);

  function apply() {
    onApply(draft);
    setOpen(false);
  }

  function clear() {
    const cleared: LoadFilters = { query: filters.query };
    setDraft(cleared);
    onApply(cleared);
    setOpen(false);
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-10"
        onClick={() => {
          setDraft(filters);
          setOpen(true);
        }}
      >
        <SlidersHorizontal className="size-4" />
        Filters
        {activeCount > 0 ? (
          <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            {activeCount}
          </span>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lf-vehicle">Vehicle Number</Label>
              <VehicleInput
                id="lf-vehicle"
                value={draft.vehicleNumber ?? ""}
                onChange={(v) => setDraft((d) => ({ ...d, vehicleNumber: v }))}
                minChars={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lf-company">Company</Label>
              <NameCombobox
                id="lf-company"
                label="Company"
                placeholder="e.g. ABC Logistics"
                value={draft.companyName ?? ""}
                onChange={(v) => setDraft((d) => ({ ...d, companyName: v }))}
                search={searchCompanies}
                showCreateOption={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lf-party">Party</Label>
              <NameCombobox
                id="lf-party"
                label="Party"
                placeholder="e.g. XYZ Traders"
                value={draft.partyName ?? ""}
                onChange={(v) => setDraft((d) => ({ ...d, partyName: v }))}
                search={searchParties}
                showCreateOption={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label>GST</Label>
              <div className="grid grid-cols-3 gap-2">
                {GST_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, gst: option.value }))}
                    className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                      (draft.gst ?? "all") === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date Range</Label>
              <div className="grid grid-cols-4 gap-2">
                {dateRangePresets().map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, dateFrom: preset.from, dateTo: preset.to }))}
                    className={cn(
                      "h-9 rounded-lg border text-xs font-medium transition-colors",
                      draft.dateFrom === preset.from && draft.dateTo === preset.to
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lf-from">From</Label>
                <Input
                  id="lf-from"
                  type="date"
                  className="h-11"
                  value={draft.dateFrom ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lf-to">To</Label>
                <Input
                  id="lf-to"
                  type="date"
                  className="h-11"
                  value={draft.dateTo ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" className="h-11" onClick={clear}>
              <X className="size-4" />
              Clear Filters
            </Button>
            <Button type="button" className="h-11" onClick={apply}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
