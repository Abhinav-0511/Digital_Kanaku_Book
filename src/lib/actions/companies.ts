"use server";

import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/errors";
import { findOrCreateLookup, searchLookup } from "./_lookups";
import type { Company, DailySummary, Load } from "@/types/domain";
import { LOAD_SELECT, mapLoadRow, summarize, type LoadRow } from "@/lib/loadMapper";

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

  const companyRes = await supabase.from("companies").select("id, name").eq("id", companyId).maybeSingle();
  if (companyRes.error || !companyRes.data) {
    logServerError("getCompanyHistory:company", companyRes.error);
    return { company: null, summary: summarize([]), loads: [] };
  }

  const loadsRes = await supabase
    .from("loads")
    .select(LOAD_SELECT)
    .eq("company_id", companyId)
    .order("load_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (loadsRes.error || !loadsRes.data) {
    logServerError("getCompanyHistory:loads", loadsRes.error);
    return { company: companyRes.data, summary: summarize([]), loads: [] };
  }

  const loads = (loadsRes.data as unknown as LoadRow[]).map(mapLoadRow);
  return { company: companyRes.data, summary: summarize(loads), loads };
}
