"use client";

import { useCallback, useId } from "react";
import { Input } from "@/components/ui/input";
import { SuggestionList } from "@/components/common/SuggestionList";
import { useTypeahead } from "@/hooks/useTypeahead";
import { getVehicleSuggestions } from "@/lib/actions/loads";
import { tidyVehicleNumberInput } from "@/lib/formatting/vehicle";

interface VehicleInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Minimum characters before fetching suggestions. Set 0 to show all previously entered vehicle numbers on focus (e.g. in a filter). */
  minChars?: number;
  /** Fires when a suggestion is explicitly picked — click, or Enter/Tab on a
   * highlighted row. Typing alone never fires this, even if it happens to
   * match a known vehicle number exactly. */
  onSelectSuggestion?: (value: string) => void;
  "aria-invalid"?: boolean;
}

/**
 * Vehicle number field backed by the numbers already used on past loads.
 * Matching is on the normalized form (spaces and case ignored) and anchored
 * to the start, so "tn38" narrows to TN 38 … and nothing else.
 */
export function VehicleInput({ value, onChange, onBlur, id, minChars = 2, onSelectSuggestion, ...rest }: VehicleInputProps) {
  const listId = useId();

  const fetcher = useCallback(
    async (query: string) =>
      (await getVehicleSuggestions(query)).map((suggestion) => ({ key: suggestion, label: suggestion })),
    [],
  );

  const handleSelect = useCallback(
    (selected: string) => {
      onChange(selected);
      onSelectSuggestion?.(selected);
    },
    [onChange, onSelectSuggestion],
  );

  const { containerRef, showList, openList, setOpen, suggestions, activeIndex, setActiveIndex, choose, handleKeyDown } =
    useTypeahead({ value, fetcher, onSelect: handleSelect, minChars });

  return (
    <div className="relative" ref={containerRef}>
      <Input
        id={id}
        autoComplete="off"
        autoCapitalize="characters"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        placeholder="TN 38 AB 1234"
        className="h-11 text-base uppercase placeholder:normal-case"
        value={value}
        onChange={(e) => {
          onChange(tidyVehicleNumberInput(e.target.value));
          openList();
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        {...rest}
      />
      {showList ? (
        <SuggestionList
          id={listId}
          suggestions={suggestions}
          activeIndex={activeIndex}
          query={value}
          onSelect={choose}
          onHover={setActiveIndex}
        />
      ) : null}
    </div>
  );
}
