import type { DailySummary, Load } from "@/types/domain";

export interface LoadRow {
  id: string;
  load_date: string;
  vehicle_number: string;
  company_id: string;
  party_id: string;
  weight: number;
  rate: number;
  driver_advance: number;
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
    driverAdvance: Number(row.driver_advance),
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
    (acc, l) => ({
      loadCount: acc.loadCount + 1,
      totalWeight: acc.totalWeight + l.weight,
      totalBaseAmount: acc.totalBaseAmount + l.baseAmount,
      totalGstAmount: acc.totalGstAmount + l.gstAmount,
      totalDriverAdvance: acc.totalDriverAdvance + l.driverAdvance,
      totalAmount: acc.totalAmount + l.totalAmount,
    }),
    { loadCount: 0, totalWeight: 0, totalBaseAmount: 0, totalGstAmount: 0, totalDriverAdvance: 0, totalAmount: 0 },
  );
}
