"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GstMode } from "@/types/domain";

interface GstSelectorProps {
  mode: GstMode;
  customPercentage: string;
  onModeChange: (mode: GstMode) => void;
  onCustomPercentageChange: (value: string) => void;
  error?: string;
}

const OPTIONS: { value: GstMode; label: string }[] = [
  { value: "standard", label: "18%" },
  { value: "custom", label: "Custom %" },
  { value: "none", label: "No GST" },
];

export function GstSelector({ mode, customPercentage, onModeChange, onCustomPercentageChange, error }: GstSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>GST</Label>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onModeChange(option.value)}
            className={cn(
              "h-11 rounded-lg border text-sm font-medium transition-colors",
              mode === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {mode === "custom" ? (
        <div className="space-y-1.5 pt-1">
          <div className="relative">
            <Input
              inputMode="decimal"
              type="number"
              min={0}
              max={100}
              step="0.01"
              placeholder="Enter GST %"
              className="h-11 pr-8 text-base"
              value={customPercentage}
              onChange={(e) => onCustomPercentageChange(e.target.value)}
              aria-invalid={Boolean(error)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
