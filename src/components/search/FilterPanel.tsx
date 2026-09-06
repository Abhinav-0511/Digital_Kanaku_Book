"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GST_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "gst", label: "GST" },
  { value: "no-gst", label: "No GST" },
];

export function FilterPanel({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [vehicle, setVehicle] = useState(searchParams.get("vehicle") ?? "");
  const [company, setCompany] = useState(searchParams.get("company") ?? "");
  const [party, setParty] = useState(searchParams.get("party") ?? "");
  const [gst, setGst] = useState(searchParams.get("gst") ?? "all");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  const activeCount = [vehicle, company, party, from, to].filter(Boolean).length + (gst !== "all" ? 1 : 0);

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    const set = (key: string, value: string) => (value ? params.set(key, value) : params.delete(key));
    set("vehicle", vehicle.trim());
    set("company", company.trim());
    set("party", party.trim());
    set("gst", gst === "all" ? "" : gst);
    set("from", from);
    set("to", to);
    if (from || to) params.delete("date");
    router.push(`${basePath}?${params.toString()}`);
    setOpen(false);
  }

  function clearFilters() {
    setVehicle("");
    setCompany("");
    setParty("");
    setGst("all");
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
              <Label htmlFor="filter-vehicle">Vehicle Number</Label>
              <Input id="filter-vehicle" className="h-11" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="e.g. TN38AB1234" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-company">Company</Label>
              <Input id="filter-company" className="h-11" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. ABC Logistics" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-party">Party</Label>
              <Input id="filter-party" className="h-11" value={party} onChange={(e) => setParty(e.target.value)} placeholder="e.g. XYZ Traders" />
            </div>

            <div className="space-y-1.5">
              <Label>GST</Label>
              <div className="grid grid-cols-3 gap-2">
                {GST_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGst(option.value)}
                    className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                      gst === option.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {option.label}
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
