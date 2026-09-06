"use server";

import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/errors";
import { findOrCreateLookup, searchLookup } from "./_lookups";
import type { Company, DailySummary, Load } from "@/types/domain";
import { mapLoadRow, type LoadRow } from "@/lib/loadMapper";

export async function searchCompanies(query: string): Promise<Company[]> {
  return searchLookup("companies", query) as Promise<Company[]>;
}

export async function findOrCreateCompany(name: string) {
  return findOrCreateLookup("companies", name);
}

export interface CompanyHistory {
  company: Company | null;
  summary: DailySummary;
  loads: Load[];
}

export async function getCompanyHistory(companyId: string): Promise<CompanyHistory> {
  const supabase = await createClient();
  const empty: DailySummary = {
    loadCount: 0,
    totalWeight: 0,
    totalBaseAmount: 0,
    totalGstAmount: 0,
    totalDriverAdvance: 0,
    totalAmount: 0,
  };

  const companyRes = await supabase.from("companies").select("id, name").eq("id", companyId).maybeSingle();
  if (companyRes.error || !companyRes.data) {
    logServerError("getCompanyHistory:company", companyRes.error);
    return { company: null, summary: empty, loads: [] };
  }

  const loadsRes = await supabase
    .from("loads")
    .select(
      "id, load_date, vehicle_number, company_id, party_id, weight, rate, driver_advance, gst_enabled, gst_percentage, base_amount, gst_amount, total_amount, created_at, updated_at, companies(name), parties(name)",
    )
    .eq("company_id", companyId)
    .order("load_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (loadsRes.error || !loadsRes.data) {
    logServerError("getCompanyHistory:loads", loadsRes.error);
    return { company: companyRes.data, summary: empty, loads: [] };
  }

  const loads = (loadsRes.data as unknown as LoadRow[]).map(mapLoadRow);
  const summary = loads.reduce<DailySummary>(
    (acc, l) => ({
      loadCount: acc.loadCount + 1,
      totalWeight: acc.totalWeight + l.weight,
      totalBaseAmount: acc.totalBaseAmount + l.baseAmount,
      totalGstAmount: acc.totalGstAmount + l.gstAmount,
      totalDriverAdvance: acc.totalDriverAdvance + l.driverAdvance,
      totalAmount: acc.totalAmount + l.totalAmount,
    }),
    empty,
  );

  return { company: companyRes.data, summary, loads };
}
