"use server";

import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/errors";
import { findOrCreateLookup, searchLookup } from "./_lookups";
import type { DailySummary, Load, Party } from "@/types/domain";
import { LOAD_SELECT, mapLoadRow, summarize, type LoadRow } from "@/lib/loadMapper";

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

  const partyRes = await supabase.from("parties").select("id, name").eq("id", partyId).maybeSingle();
  if (partyRes.error || !partyRes.data) {
    logServerError("getPartyHistory:party", partyRes.error);
    return { party: null, summary: summarize([]), loads: [] };
  }

  const loadsRes = await supabase
    .from("loads")
    .select(LOAD_SELECT)
    .eq("party_id", partyId)
    .order("load_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (loadsRes.error || !loadsRes.data) {
    logServerError("getPartyHistory:loads", loadsRes.error);
    return { party: partyRes.data, summary: summarize([]), loads: [] };
  }

  const loads = (loadsRes.data as unknown as LoadRow[]).map(mapLoadRow);
  return { party: partyRes.data, summary: summarize(loads), loads };
}
