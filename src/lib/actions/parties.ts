"use server";

import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/errors";
import { findOrCreateLookup, searchLookup } from "./_lookups";
import type { DailySummary, Load, Party } from "@/types/domain";
import { mapLoadRow, type LoadRow } from "@/lib/loadMapper";

export async function searchParties(query: string): Promise<Party[]> {
  return searchLookup("parties", query) as Promise<Party[]>;
}

export async function findOrCreateParty(name: string) {
  return findOrCreateLookup("parties", name);
}

export interface PartyHistory {
  party: Party | null;
  summary: DailySummary;
  loads: Load[];
}

export async function getPartyHistory(partyId: string): Promise<PartyHistory> {
  const supabase = await createClient();
  const empty: DailySummary = {
    loadCount: 0,
    totalWeight: 0,
    totalBaseAmount: 0,
    totalGstAmount: 0,
    totalDriverAdvance: 0,
    totalAmount: 0,
  };

  const partyRes = await supabase.from("parties").select("id, name").eq("id", partyId).maybeSingle();
  if (partyRes.error || !partyRes.data) {
    logServerError("getPartyHistory:party", partyRes.error);
    return { party: null, summary: empty, loads: [] };
  }

  const loadsRes = await supabase
    .from("loads")
    .select(
      "id, load_date, vehicle_number, company_id, party_id, weight, rate, driver_advance, gst_enabled, gst_percentage, base_amount, gst_amount, total_amount, created_at, updated_at, companies(name), parties(name)",
    )
    .eq("party_id", partyId)
    .order("load_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (loadsRes.error || !loadsRes.data) {
    logServerError("getPartyHistory:loads", loadsRes.error);
    return { party: partyRes.data, summary: empty, loads: [] };
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

  return { party: partyRes.data, summary, loads };
}
