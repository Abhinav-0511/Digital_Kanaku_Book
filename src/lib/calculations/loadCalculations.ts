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

export interface LoadAmountBreakdownInput {
  weight: number;
  rate: number;
  companyRate: number;
  gstEnabled: boolean;
  gstPercentage: number;
  partyName: string;
  companyName: string;
}

export interface LoadAmountBreakdownResult {
  /** Amount paid to the party for this load (rate × weight + GST). Zero when partyName is blank or "Myself". */
  partyAmount: number;
  /** Amount received from the company for this load (companyRate × weight + GST). Zero when companyName is blank or "Godown". */
  companyAmount: number;
  /** Profit on this load: companyAmount − partyAmount. */
  difference: number;
}

function isSentinelOrBlank(name: string, sentinel: string): boolean {
  const trimmed = name.trim().toLowerCase();
  return trimmed === "" || trimmed === sentinel;
}

/**
 * Party amount is money paid out (cost), company amount is money received
 * (revenue) — both weight × rate + GST, using the load's own GST settings.
 * A load with no real party (blank or "Myself" — e.g. self-use, no payout)
 * has no cost, so partyAmount is 0. A load with no real company (blank or
 * "Godown" — e.g. an internal transfer, no billing) has no revenue, so
 * companyAmount is 0. The difference is the profit earned on the load.
 */
export function calculateLoadAmountBreakdown({
  weight,
  rate,
  companyRate,
  gstEnabled,
  gstPercentage,
  partyName,
  companyName,
}: LoadAmountBreakdownInput): LoadAmountBreakdownResult {
  const partyTotal = calculateLoadAmounts({ weight, rate, gstEnabled, gstPercentage }).totalAmount;
  const companyTotal = calculateLoadAmounts({ weight, rate: companyRate, gstEnabled, gstPercentage }).totalAmount;

  const partyAmount = isSentinelOrBlank(partyName, "myself") ? 0 : partyTotal;
  const companyAmount = isSentinelOrBlank(companyName, "godown") ? 0 : companyTotal;
  const difference = round2(companyAmount - partyAmount);

  return { partyAmount, companyAmount, difference };
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
