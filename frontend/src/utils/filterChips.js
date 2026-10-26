import { useEffect, useState } from "react";
import { DateTime } from "luxon";

const isEmptyValue = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

/**
 * Format a yyyy-MM-dd range for display in a chip.
 */
export function formatDateRange(start, end) {
  const fmt = (d) => DateTime.fromISO(d).toFormat("dd/MM/yyyy");
  if (start && end) return `${fmt(start)} - ${fmt(end)}`;
  if (start) return `Từ ${fmt(start)}`;
  if (end) return `Đến ${fmt(end)}`;
  return "";
}

/**
 * Build chip descriptors from the applied filters.
 *
 * specs: [{ keys: ['startDate', 'endDate'], label: 'Ngày', format: (...values) => string }]
 * A spec produces a chip only when one of its keys differs from its default value.
 * Removing a chip resets its keys to the defaults and calls onChange with the new filters.
 */
export function buildFilterChips(applied, defaults, specs, onChange) {
  return specs.flatMap((spec) => {
    const active = spec.keys.some((key) => {
      const value = applied[key];
      return !isEmptyValue(value) && String(value) !== String(defaults[key] ?? "");
    });
    if (!active) return [];

    const text = spec.format(...spec.keys.map((key) => applied[key]));
    if (!text) return [];

    return [
      {
        key: spec.keys.join("|"),
        label: spec.label,
        value: text,
        onRemove: () => {
          const next = { ...applied };
          spec.keys.forEach((key) => {
            next[key] = defaults[key];
          });
          onChange(next);
        },
      },
    ];
  });
}

/**
 * Keeps a local draft of the filter form in sync with the applied filters,
 * so chip removal updates the visible form fields too.
 */
export function useFilterDraft(appliedFilters) {
  const appliedKey = JSON.stringify(appliedFilters);
  const [draft, setDraft] = useState(appliedFilters);

  useEffect(() => {
    setDraft(JSON.parse(appliedKey));
  }, [appliedKey]);

  return [draft, setDraft];
}
