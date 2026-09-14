"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

export interface Suggestion {
  key: string;
  label: string;
}

interface UseTypeaheadOptions {
  /** Current text in the input. */
  value: string;
  /** Fetches matches for a query. Identity may change between renders. */
  fetcher: (query: string) => Promise<Suggestion[]>;
  /** Called when a suggestion is picked (click, Enter or Tab). */
  onSelect: (label: string) => void;
  /** Minimum characters before fetching. 0 shows everything on focus. */
  minChars?: number;
  debounceMs?: number;
}

/**
 * Drives a "type-to-filter" dropdown: debounced fetching, open/close, and
 * keyboard navigation. The input stays a plain text field — suggestions are
 * a shortcut, never a requirement, so whatever is typed is still submitted.
 */
export function useTypeahead({ value, fetcher, onSelect, minChars = 0, debounceMs = 200 }: UseTypeaheadOptions) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedValue = useDebounce(value, debounceMs);

  // Kept in a ref so an inline arrow function from the caller doesn't
  // re-trigger the fetch effect on every render.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const query = debouncedValue.trim();
  const enabled = query.length >= minChars;

  useEffect(() => {
    // Nothing to fetch yet — `enabled` already gates `showList` below, so
    // stale suggestions from a longer query simply stay hidden.
    if (!enabled) return;
    let cancelled = false;
    fetcherRef.current(debouncedValue)
      .then((results) => {
        if (cancelled) return;
        setSuggestions(results);
        setActiveIndex(-1);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedValue, enabled]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const choose = useCallback(
    (label: string) => {
      onSelect(label);
      setOpen(false);
      setActiveIndex(-1);
    },
    [onSelect],
  );

  /** Call from the input's onChange so typing re-opens a dismissed list. */
  const openList = useCallback(() => {
    setOpen(true);
    setActiveIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!enabled || suggestions.length === 0) {
        if (event.key === "Escape") setOpen(false);
        return;
      }

      if (!open) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setOpen(true);
          setActiveIndex(0);
        }
        return;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActiveIndex((index) => (index + 1) % suggestions.length);
          break;
        case "ArrowUp":
          event.preventDefault();
          setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
          break;
        case "Enter":
          // With nothing highlighted, Enter belongs to the form, not the list.
          if (activeIndex >= 0) {
            event.preventDefault();
            choose(suggestions[activeIndex].label);
          }
          break;
        case "Tab":
          if (activeIndex >= 0) choose(suggestions[activeIndex].label);
          break;
        case "Escape":
          event.preventDefault();
          setOpen(false);
          break;
      }
    },
    [activeIndex, choose, enabled, open, suggestions],
  );

  return {
    containerRef,
    /** True when the list has matches that should be rendered. */
    showList: open && enabled && suggestions.length > 0,
    open,
    setOpen,
    openList,
    suggestions,
    activeIndex,
    setActiveIndex,
    choose,
    handleKeyDown,
  };
}
