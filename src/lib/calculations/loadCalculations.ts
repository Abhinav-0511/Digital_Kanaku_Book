/**
 * Single source of truth for load money math on the client. Used for the
 * live pre-save preview only — the database trigger (0001_init_schema.sql,
 * calculate_load_amounts) recomputes and enforces the authoritative values
 * on every insert/update, so these two implementations must stay in sync.
 */

export interface LoadCalculationInput {
  weight: number;
  rate: number;
  gstEnabled: boolean;
  gstPercentage: number;
}

export interface LoadCalculationResult {
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
}

/** Half-up rounding to 2 decimal places, avoiding binary-float drift. */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const cents = Math.round((value + Number.EPSILON) * 100);
  return cents / 100;
}

export function calculateLoadAmounts({
  weight,
  rate,
  gstEnabled,
  gstPercentage,
}: LoadCalculationInput): LoadCalculationResult {
  const safeWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
  const safeRate = Number.isFinite(rate) && rate >= 0 ? rate : 0;
  const safeGstPercentage = gstEnabled && Number.isFinite(gstPercentage)
    ? Math.min(Math.max(gstPercentage, 0), 100)
    : 0;

  const baseAmount = round2(safeWeight * safeRate);
  const gstAmount = gstEnabled ? round2((baseAmount * safeGstPercentage) / 100) : 0;
  const totalAmount = round2(baseAmount + gstAmount);

  return { baseAmount, gstAmount, totalAmount };
}
