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

/** GST rate used to bill the company when the load's own GST setting doesn't supply one (see calculateLoadAmountBreakdown). */
export const STANDARD_GST_PERCENTAGE = 18;

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
  /** Weight × company rate, before GST. */
  companyBaseAmount: number;
  /** GST % billed to the company — always applied; see calculateLoadAmountBreakdown. */
  companyGstPercentage: number;
  /** GST amount on the company side. */
  companyGstAmount: number;
  /** Company base + GST, regardless of whether a company is set on this load. */
  companyTotal: number;
  /** Amount received from the company for this load (companyTotal). Zero when companyName is blank or "Godown". */
  companyAmount: number;
  /** Profit on this load: companyAmount − partyAmount. */
  difference: number;
}

/** Profit after the load's own out-of-pocket costs (driver advance, vehicle rent, diesel). */
export function calculateProfit(difference: number, driverAdvance: number, vehicleRent: number, dieselCost: number): number {
  return round2(difference - driverAdvance - vehicleRent - dieselCost);
}

function isSentinelOrBlank(name: string, sentinel: string): boolean {
  const trimmed = name.trim().toLowerCase();
  return trimmed === "" || trimmed === sentinel;
}

/**
 * Party amount is money paid out (cost), company amount is money received
 * (revenue) — both weight × rate + GST. The load's GST toggle only governs
 * the party side: whether the party (often an unregistered truck owner) is
 * billed GST is a case-by-case choice. The company side is a normal GST
 * invoice and is always billed with GST — using the load's own GST% when
 * one is set, and the standard rate otherwise (i.e. switching the load to
 * "No GST" turns off the party's GST, not the company's).
 *
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

  const companyGstPercentage = gstEnabled ? gstPercentage : STANDARD_GST_PERCENTAGE;
  const companyCalc = calculateLoadAmounts({
    weight,
    rate: companyRate,
    gstEnabled: true,
    gstPercentage: companyGstPercentage,
  });

  const partyAmount = isSentinelOrBlank(partyName, "myself") ? 0 : partyTotal;
  const companyAmount = isSentinelOrBlank(companyName, "godown") ? 0 : companyCalc.totalAmount;
  const difference = round2(companyAmount - partyAmount);

  return {
    partyAmount,
    companyBaseAmount: companyCalc.baseAmount,
    companyGstPercentage,
    companyGstAmount: companyCalc.gstAmount,
    companyTotal: companyCalc.totalAmount,
    companyAmount,
    difference,
  };
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
