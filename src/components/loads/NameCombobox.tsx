"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SuggestionList } from "@/components/common/SuggestionList";
import { useTypeahead } from "@/hooks/useTypeahead";

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
  /** Set false for filter/search contexts, where "Add new…" doesn't make sense. */
  showCreateOption?: boolean;
  /** Fires with the full option (id included) when a suggestion is explicitly
   * picked — click, or Enter/Tab on a highlighted row. Typing alone never
   * fires this, even if it happens to match a name exactly, so callers that
   * need a confirmed id (not just free text) can tell the two apart. */
  onSelectOption?: (option: NameOption) => void;
}

/**
 * A plain text field with a suggestion dropdown — not a combobox/popover
 * widget. Whatever text is in the field when the form is submitted is used
 * as-is; the server finds-or-creates the matching company/party by name, so
 * there is no separate "confirm new name" step to get stuck on.
 *
 * Suggestions narrow as you type: `searchLookup` matches names that *start
 * with* what's typed, so "su" offers Suresh Traders but not Basudev.
 */
export function NameCombobox({
  id,
  label,
  placeholder,
  value,
  onChange,
  search,
  disabled,
  error,
  showCreateOption = true,
  onSelectOption,
}: NameComboboxProps) {
  const listId = useId();

  const fetcher = useCallback(
    async (query: string) => (await search(query)).map((option) => ({ key: option.id, label: option.name })),
    [search],
  );

  // Suggestions live in a ref (not the closure directly) so handleSelect
  // below can be defined before useTypeahead hands them back, without
  // going stale — the callback isn't invoked until well after this
  // component has rendered with the current suggestion list.
  const suggestionsRef = useRef<{ key: string; label: string }[]>([]);

  const handleSelect = useCallback(
    (label: string) => {
      onChange(label);
      const match = suggestionsRef.current.find((s) => s.label === label);
      if (match) onSelectOption?.({ id: match.key, name: match.label });
    },
    [onChange, onSelectOption],
  );

  const { containerRef, showList, open, openList, setOpen, suggestions, activeIndex, setActiveIndex, choose, handleKeyDown } =
    useTypeahead({ value, fetcher, onSelect: handleSelect });

  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  const trimmed = value.trim();
  const exactMatch = suggestions.some((s) => s.label.toLowerCase() === trimmed.toLowerCase());
  const showCreate = showCreateOption && Boolean(trimmed) && !exactMatch;

  return (
    <div className="relative" ref={containerRef}>
      <Input
        id={id}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        placeholder={placeholder}
        className="h-11 text-base"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          openList();
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        aria-invalid={error}
      />
      {showList || (open && showCreate) ? (
        <SuggestionList
          id={listId}
          suggestions={showList ? suggestions : []}
          activeIndex={activeIndex}
          query={value}
          onSelect={choose}
          onHover={setActiveIndex}
          footer={
            showCreate ? (
              <button
                type="button"
                tabIndex={-1}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-primary hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                }}
              >
                <Plus className="size-4" />
                Add new {label.toLowerCase()} &quot;{trimmed}&quot;
              </button>
            ) : null
          }
        />
      ) : null}
    </div>
  );
}
