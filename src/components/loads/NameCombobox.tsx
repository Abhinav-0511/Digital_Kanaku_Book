"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";

export interface NameOption {
  id: string;
  name: string;
}

interface NameComboboxProps {
  id?: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (name: string) => void;
  search: (query: string) => Promise<NameOption[]>;
  disabled?: boolean;
  error?: boolean;
}

/**
 * A plain text field with a suggestion dropdown — not a combobox/popover
 * widget. Whatever text is in the field when the form is submitted is used
 * as-is; the server finds-or-creates the matching company/party by name, so
 * there is no separate "confirm new name" step to get stuck on.
 */
export function NameCombobox({ id, label, placeholder, value, onChange, search, disabled, error }: NameComboboxProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<NameOption[]>([]);
  const debouncedValue = useDebounce(value, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    search(debouncedValue).then((results) => {
      if (!cancelled) setSuggestions(results);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedValue, search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmed = value.trim();
  const exactMatch = suggestions.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());

  return (
    <div className="relative" ref={containerRef}>
      <Input
        id={id}
        disabled={disabled}
        autoComplete="off"
        placeholder={placeholder}
        className="h-11 text-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        aria-invalid={error}
      />
      {open && (suggestions.length > 0 || (trimmed && !exactMatch)) ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {suggestions.map((option) => (
            <button
              key={option.id}
              type="button"
              className="block w-full px-3 py-2.5 text-left text-sm hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(option.name);
                setOpen(false);
              }}
            >
              {option.name}
            </button>
          ))}
          {trimmed && !exactMatch ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-primary hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
              }}
            >
              <Plus className="size-4" />
              Add new {label.toLowerCase()} &quot;{trimmed}&quot;
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
