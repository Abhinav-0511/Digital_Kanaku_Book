import { calculateLoadAmountBreakdown, calculateProfit, round2 } from "@/lib/calculations/loadCalculations";
import type { DailySummary, Load } from "@/types/domain";

export const LOAD_SELECT =
  "id, load_date, vehicle_number, company_id, party_id, party2_id, weight, rate, company_rate, driver_advance, vehicle_rent, diesel_cost, party2_weight, gst_enabled, gst_percentage, base_amount, gst_amount, party2_base_amount, party2_gst_amount, party2_total_amount, total_amount, created_at, updated_at, companies(name), parties!loads_party_id_fkey(name), party2:parties!loads_party2_id_fkey(name)";

export interface LoadRow {
  id: string;
  load_date: string;
  vehicle_number: string;
  company_id: string | null;
  party_id: string | null;
  party2_id: string | null;
  weight: number;
  rate: number;
  company_rate: number;
  driver_advance: number;
  vehicle_rent: number;
  diesel_cost: number;
  party2_weight: number;
  gst_enabled: boolean;
  gst_percentage: number;
  base_amount: number;
  gst_amount: number;
  party2_base_amount: number;
  party2_gst_amount: number;
  party2_total_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  companies: { name: string } | { name: string }[] | null;
  parties: { name: string } | { name: string }[] | null;
  party2: { name: string } | { name: string }[] | null;
}

function relatedName(rel: LoadRow["companies"]): string {
  if (!rel) return "";
  return Array.isArray(rel) ? (rel[0]?.name ?? "") : rel.name;
}

export function mapLoadRow(row: LoadRow): Load {
  return {
    id: row.id,
    loadDate: row.load_date,
    vehicleNumber: row.vehicle_number,
    companyId: row.company_id,
    companyName: relatedName(row.companies),
    partyId: row.party_id,
    partyName: relatedName(row.parties),
    party2Id: row.party2_id,
    party2Name: relatedName(row.party2),
    party2Weight: Number(row.party2_weight),
    weight: Number(row.weight),
    rate: Number(row.rate),
    companyRate: Number(row.company_rate),
    driverAdvance: Number(row.driver_advance),
    vehicleRent: Number(row.vehicle_rent),
    dieselCost: Number(row.diesel_cost),
    gstEnabled: row.gst_enabled,
    gstPercentage: Number(row.gst_percentage),
    baseAmount: Number(row.base_amount),
    gstAmount: Number(row.gst_amount),
    party2BaseAmount: Number(row.party2_base_amount),
    party2GstAmount: Number(row.party2_gst_amount),
    party2TotalAmount: Number(row.party2_total_amount),
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function summarize(loads: Load[]): DailySummary {
  const totals = loads.reduce<Omit<DailySummary, "totalProfit">>(
    (acc, l) => {
      const { partyAmount, party2Amount, companyAmount, difference } = calculateLoadAmountBreakdown({
        weight: l.weight,
        rate: l.rate,
        companyRate: l.companyRate,
        gstEnabled: l.gstEnabled,
        gstPercentage: l.gstPercentage,
        partyName: l.partyName,
        companyName: l.companyName,
        party2Enabled: Boolean(l.party2Id),
        party2Weight: l.party2Weight,
        party2Name: l.party2Name,
      });
      return {
        loadCount: acc.loadCount + 1,
        totalWeight: acc.totalWeight + l.weight + l.party2Weight,
        totalBaseAmount: acc.totalBaseAmount + l.baseAmount + l.party2BaseAmount,
        totalPartyAmount: acc.totalPartyAmount + partyAmount + party2Amount,
        totalCompanyAmount: acc.totalCompanyAmount + companyAmount,
        totalGstAmount: acc.totalGstAmount + l.gstAmount + l.party2GstAmount,
        totalDriverAdvance: acc.totalDriverAdvance + l.driverAdvance,
        totalVehicleRent: acc.totalVehicleRent + l.vehicleRent,
        totalDieselCost: acc.totalDieselCost + l.dieselCost,
        totalAmount: acc.totalAmount + l.totalAmount,
        // Summed per-load (GST-excluded on both sides), not derived from the
        // GST-inclusive totalPartyAmount/totalCompanyAmount above — see
        // calculateLoadAmountBreakdown.
        totalDifference: acc.totalDifference + difference,
      };
    },
    {
      loadCount: 0,
      totalWeight: 0,
      totalBaseAmount: 0,
      totalPartyAmount: 0,
      totalCompanyAmount: 0,
      totalGstAmount: 0,
      totalDriverAdvance: 0,
      totalVehicleRent: 0,
      totalDieselCost: 0,
      totalAmount: 0,
      totalDifference: 0,
    },
  );

  const totalDifference = round2(totals.totalDifference);
  const totalProfit = calculateProfit(totalDifference, totals.totalDriverAdvance, totals.totalVehicleRent, totals.totalDieselCost);

  return { ...totals, totalDifference, totalProfit };
}
