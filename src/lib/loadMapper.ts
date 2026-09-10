import { calculateLoadAmountBreakdown } from "@/lib/calculations/loadCalculations";
import type { DailySummary, Load } from "@/types/domain";

export const LOAD_SELECT =
  "id, load_date, vehicle_number, company_id, party_id, weight, rate, company_rate, driver_advance, vehicle_rent, diesel_cost, gst_enabled, gst_percentage, base_amount, gst_amount, total_amount, created_at, updated_at, companies(name), parties(name)";

export interface LoadRow {
  id: string;
  load_date: string;
  vehicle_number: string;
  company_id: string | null;
  party_id: string | null;
  weight: number;
  rate: number;
  company_rate: number;
  driver_advance: number;
  vehicle_rent: number;
  diesel_cost: number;
  gst_enabled: boolean;
  gst_percentage: number;
  base_amount: number;
  gst_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  companies: { name: string } | { name: string }[] | null;
  parties: { name: string } | { name: string }[] | null;
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
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function summarize(loads: Load[]): DailySummary {
  return loads.reduce<DailySummary>(
    (acc, l) => {
      const { partyAmount, companyAmount } = calculateLoadAmountBreakdown({
        weight: l.weight,
        rate: l.rate,
        companyRate: l.companyRate,
        gstEnabled: l.gstEnabled,
        gstPercentage: l.gstPercentage,
        partyName: l.partyName,
        companyName: l.companyName,
      });
      return {
        loadCount: acc.loadCount + 1,
        totalWeight: acc.totalWeight + l.weight,
        totalBaseAmount: acc.totalBaseAmount + l.baseAmount,
        totalPartyAmount: acc.totalPartyAmount + partyAmount,
        totalCompanyAmount: acc.totalCompanyAmount + companyAmount,
        totalGstAmount: acc.totalGstAmount + l.gstAmount,
        totalDriverAdvance: acc.totalDriverAdvance + l.driverAdvance,
        totalVehicleRent: acc.totalVehicleRent + l.vehicleRent,
        totalDieselCost: acc.totalDieselCost + l.dieselCost,
        totalAmount: acc.totalAmount + l.totalAmount,
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
    },
  );
}
