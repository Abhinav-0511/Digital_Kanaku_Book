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
  /** Second party splitting this load, billed at the same rate/GST — see calculateLoadAmountBreakdown. */
  party2Enabled?: boolean;
  party2Weight?: number;
  party2Name?: string;
}

export interface LoadAmountBreakdownResult {
  /** Amount paid to the party for this load (rate × weight + GST). Zero when partyName is blank or "Myself". */
  partyAmount: number;
  /** weight + party2Weight when party2 is enabled, else weight — what the company is billed against. */
  combinedWeight: number;
  /** Combined weight × company rate, before GST. */
  companyBaseAmount: number;
  /** GST % billed to the company — always applied; see calculateLoadAmountBreakdown. */
  companyGstPercentage: number;
  /** GST amount on the company side. */
  companyGstAmount: number;
  /** Company base + GST, regardless of whether a company is set on this load. */
  companyTotal: number;
  /** Amount received from the company for this load (companyTotal). Zero when companyName is blank or "Godown". */
  companyAmount: number;
  /** party2Weight × rate, before GST. Zero when party2 is disabled. */
  party2BaseAmount: number;
  /** GST amount on the second party's share. */
  party2GstAmount: number;
  /** party2BaseAmount + party2GstAmount. */
  party2TotalAmount: number;
  /** Amount paid to the second party (party2Weight × rate + GST). Zero when party2 is disabled or party2Name is blank. */
  party2Amount: number;
  /** partyAmount with GST excluded. Zero under the same conditions as partyAmount. */
  partyAmountExGst: number;
  /** party2Amount with GST excluded. Zero under the same conditions as party2Amount. */
  party2AmountExGst: number;
  /** companyAmount with GST excluded. Zero under the same conditions as companyAmount. */
  companyAmountExGst: number;
  /** Company base − (party base + party2 base), GST excluded from both sides — see calculateLoadAmountBreakdown. */
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
 * companyAmount is 0.
 *
 * partyAmount/companyAmount/party2Amount are GST-inclusive — that's the
 * money that actually changes hands, so that's what's shown wherever a
 * "Party Amount" / "Company Amount" figure is displayed. difference (and
 * therefore profit) is computed from the GST-excluded base amounts instead:
 * GST charged on one side rarely lines up with GST paid on the other
 * (different rates, one side may not be GST-registered at all), so including
 * it in the profit math would misstate the actual margin.
 */
export function calculateLoadAmountBreakdown({
  weight,
  rate,
  companyRate,
  gstEnabled,
  gstPercentage,
  partyName,
  companyName,
  party2Enabled = false,
  party2Weight = 0,
  party2Name = "",
}: LoadAmountBreakdownInput): LoadAmountBreakdownResult {
  const partyCalc = calculateLoadAmounts({ weight, rate, gstEnabled, gstPercentage });

  // The company is billed on the full load — both parties' weight combined —
  // even though each party is paid separately for their own share.
  const combinedWeight = party2Enabled ? round2(weight + party2Weight) : weight;

  const companyGstPercentage = gstEnabled ? gstPercentage : STANDARD_GST_PERCENTAGE;
  const companyCalc = calculateLoadAmounts({
    weight: combinedWeight,
    rate: companyRate,
    gstEnabled: true,
    gstPercentage: companyGstPercentage,
  });

  const party2Calc = party2Enabled
    ? calculateLoadAmounts({ weight: party2Weight, rate, gstEnabled, gstPercentage })
    : { baseAmount: 0, gstAmount: 0, totalAmount: 0 };

  const partyIncluded = !isSentinelOrBlank(partyName, "myself");
  const party2Included = party2Enabled && !isSentinelOrBlank(party2Name, "myself");
  const companyIncluded = !isSentinelOrBlank(companyName, "godown");

  const partyAmount = partyIncluded ? partyCalc.totalAmount : 0;
  const party2Amount = party2Included ? party2Calc.totalAmount : 0;
  const companyAmount = companyIncluded ? companyCalc.totalAmount : 0;

  const partyBase = partyIncluded ? partyCalc.baseAmount : 0;
  const party2Base = party2Included ? party2Calc.baseAmount : 0;
  const companyBase = companyIncluded ? companyCalc.baseAmount : 0;
  const difference = round2(companyBase - round2(partyBase + party2Base));

  return {
    partyAmount,
    combinedWeight,
    companyBaseAmount: companyCalc.baseAmount,
    companyGstPercentage,
    companyGstAmount: companyCalc.gstAmount,
    companyTotal: companyCalc.totalAmount,
    companyAmount,
    party2BaseAmount: party2Calc.baseAmount,
    party2GstAmount: party2Calc.gstAmount,
    party2TotalAmount: party2Calc.totalAmount,
    party2Amount,
    partyAmountExGst: partyBase,
    party2AmountExGst: party2Base,
    companyAmountExGst: companyBase,
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
