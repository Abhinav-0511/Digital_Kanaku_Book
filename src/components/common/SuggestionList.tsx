"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Suggestion } from "@/hooks/useTypeahead";

interface SuggestionListProps {
  id: string;
  suggestions: Suggestion[];
  activeIndex: number;
  /** The typed text, bolded inside each suggestion so the match is obvious. */
  query: string;
  onSelect: (label: string) => void;
  onHover: (index: number) => void;
  /** Rendered under the list, e.g. the "Add new …" row. */
  footer?: React.ReactNode;
}

export function SuggestionList({
  id,
  suggestions,
  activeIndex,
  query,
  onSelect,
  onHover,
  footer,
}: SuggestionListProps) {
  return (
    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
      <ul id={id} role="listbox" className="max-h-64 overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <SuggestionRow
            key={suggestion.key}
            id={`${id}-option-${index}`}
            label={suggestion.label}
            query={query}
            active={index === activeIndex}
            onSelect={() => onSelect(suggestion.label)}
            onHover={() => onHover(index)}
          />
        ))}
      </ul>
      {footer}
    </div>
  );
}

function SuggestionRow({
  id,
  label,
  query,
  active,
  onSelect,
  onHover,
}: {
  id: string;
  label: string;
  query: string;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <li ref={ref} id={id} role="option" aria-selected={active}>
      <button
        type="button"
        tabIndex={-1}
        className={cn("block w-full px-3 py-2.5 text-left text-sm", active ? "bg-muted" : "hover:bg-muted")}
        // mousedown, not click: the input must not blur before we set the value.
        onMouseDown={(event) => {
          event.preventDefault();
          onSelect();
        }}
        onMouseEnter={onHover}
      >
        {highlight(label, query)}
      </button>
    </li>
  );
}

/** Bolds the part of `label` the user has already typed, when it lines up. */
function highlight(label: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return label;
  const index = label.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index === -1) return label;
  return (
    <>
      {label.slice(0, index)}
      <span className="font-semibold text-foreground">{label.slice(index, index + trimmed.length)}</span>
      {label.slice(index + trimmed.length)}
    </>
  );
}
