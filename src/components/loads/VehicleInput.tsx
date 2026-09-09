"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { getVehicleSuggestions } from "@/lib/actions/loads";
import { tidyVehicleNumberInput } from "@/lib/formatting/vehicle";

interface VehicleInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Minimum characters before fetching suggestions. Set 0 to show all previously entered vehicle numbers on focus (e.g. in a filter). */
  minChars?: number;
  "aria-invalid"?: boolean;
}

export function VehicleInput({ value, onChange, onBlur, id, minChars = 2, ...rest }: VehicleInputProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debouncedValue = useDebounce(value, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  const longEnough = debouncedValue.trim().length >= minChars;

  useEffect(() => {
    if (!longEnough) return;
    let cancelled = false;
    getVehicleSuggestions(debouncedValue).then((results) => {
      if (!cancelled) setSuggestions(results);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedValue, longEnough]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Input
        id={id}
        autoComplete="off"
        autoCapitalize="characters"
        placeholder="TN 38 AB 1234"
        className="h-11 text-base uppercase placeholder:normal-case"
        value={value}
        onChange={(e) => onChange(tidyVehicleNumberInput(e.target.value))}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        {...rest}
      />
      {open && longEnough && suggestions.length > 0 ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="block w-full px-3 py-2.5 text-left text-sm hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(suggestion);
                setOpen(false);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
