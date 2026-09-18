"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NameCombobox } from "@/components/loads/NameCombobox";
import { searchCompanies } from "@/lib/actions/companies";
import { searchParties } from "@/lib/actions/parties";
import { dateRangePresets } from "@/lib/formatting/date";
import { cn } from "@/lib/utils";

export function PaymentFilterPanel({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [company, setCompany] = useState(searchParams.get("company") ?? "");
  const [party, setParty] = useState(searchParams.get("party") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  const activeCount = [company, party, from, to].filter(Boolean).length;

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    const set = (key: string, value: string) => (value ? params.set(key, value) : params.delete(key));
    set("company", company.trim());
    set("party", party.trim());
    set("from", from);
    set("to", to);
    if (from || to) params.delete("date");
    router.push(`${basePath}?${params.toString()}`);
    setOpen(false);
  }

  function clearFilters() {
    setCompany("");
    setParty("");
    setFrom("");
    setTo("");
    router.push(basePath);
    setOpen(false);
  }

  return (
    <>
      <Button variant="outline" className="h-10" onClick={() => setOpen(true)}>
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
              <Label htmlFor="filter-company">Company</Label>
              <NameCombobox
                id="filter-company"
                label="Company"
                placeholder="e.g. ABC Logistics"
                value={company}
                onChange={setCompany}
                search={searchCompanies}
                showCreateOption={false}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-party">Party</Label>
              <NameCombobox
                id="filter-party"
                label="Party"
                placeholder="e.g. XYZ Traders"
                value={party}
                onChange={setParty}
                search={searchParties}
                showCreateOption={false}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Date Range</Label>
              <div className="grid grid-cols-4 gap-2">
                {dateRangePresets().map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setFrom(preset.from);
                      setTo(preset.to);
                    }}
                    className={cn(
                      "h-9 rounded-lg border text-xs font-medium transition-colors",
                      from === preset.from && to === preset.to
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
                <Label htmlFor="filter-from">From</Label>
                <Input id="filter-from" type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filter-to">To</Label>
                <Input id="filter-to" type="date" className="h-11" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={clearFilters} className="h-11">
              <X className="size-4" />
              Clear Filters
            </Button>
            <Button type="button" onClick={apply} className="h-11">
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
