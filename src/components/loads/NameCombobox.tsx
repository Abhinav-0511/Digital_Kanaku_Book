"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useDebounce } from "@/hooks/useDebounce";

export interface NameOption {
  id: string;
  name: string;
}

interface NameComboboxProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (name: string) => void;
  search: (query: string) => Promise<NameOption[]>;
  disabled?: boolean;
  error?: boolean;
}

export function NameCombobox({ label, placeholder, value, onChange, search, disabled, error }: NameComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<NameOption[]>([]);
  const [isPending, startTransition] = useTransition();
  const debouncedQuery = useDebounce(query, 250);

  // Keep the internal query text in sync when the parent resets `value`
  // (e.g. "Add Another Load" clearing the form) — adjusted during render
  // rather than in an effect, per https://react.dev/learn/you-might-not-need-an-effect.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value);
  }

  useEffect(() => {
    if (!open) return;
    startTransition(() => {
      search(debouncedQuery).then(setOptions);
    });
  }, [debouncedQuery, open, search]);

  const trimmedQuery = query.trim();
  const exactMatch = options.some((o) => o.name.toLowerCase() === trimmedQuery.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            aria-invalid={error}
            className="h-11 w-full justify-between px-3 text-base font-normal"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[min(90vw,24rem)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${label.toLowerCase()}...`}
            value={query}
            onValueChange={(next) => {
              setQuery(next);
              onChange(next);
            }}
          />
          <CommandList>
            {isPending ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
            ) : (
              <>
                <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={option.id}
                      onSelect={() => {
                        onChange(option.name);
                        setQuery(option.name);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("size-4", value === option.name ? "opacity-100" : "opacity-0")} />
                      {option.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            {trimmedQuery && !exactMatch ? (
              <CommandGroup>
                <CommandItem
                  value={`__create__${trimmedQuery}`}
                  onSelect={() => {
                    onChange(trimmedQuery);
                    setQuery(trimmedQuery);
                    setOpen(false);
                  }}
                >
                  <Plus className="size-4" />
                  Add new {label.toLowerCase()} &quot;{trimmedQuery}&quot;
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
