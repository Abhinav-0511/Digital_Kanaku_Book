/**
 * Vehicle numbers are stored verbatim as the user typed them (display value)
 * plus a normalized form used only for search/matching. This mirrors the
 * `vehicle_number_normalized` column, which the DB trigger computes the same
 * way — keep these in sync.
 */
export function normalizeVehicleNumber(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "");
}

/** Light touch-up as the user types: trims and collapses double spaces,
 * but never forcibly changes casing so the field doesn't feel like it's
 * fighting the user while they type. */
export function tidyVehicleNumberInput(value: string): string {
  return value.replace(/\s{2,}/g, " ").trimStart();
}
