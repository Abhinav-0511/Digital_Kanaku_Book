import "server-only";

import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { nameEntrySchema } from "@/lib/validation/schemas";
import type { Company, Party } from "@/types/domain";

type LookupTable = "companies" | "parties";

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function searchLookup(table: LookupTable, query: string): Promise<Company[] | Party[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const trimmed = query.trim();
  let request = supabase.from(table).select("id, name").order("name").limit(20);
  if (trimmed) {
    request = request.ilike("name_normalized", `%${normalizeName(trimmed)}%`);
  }

  const { data, error } = await request;
  if (error) {
    logServerError(`searchLookup:${table}`, error);
    return [];
  }
  return data ?? [];
}

export async function findOrCreateLookup(
  table: LookupTable,
  rawName: string,
): Promise<{ success: true; id: string; name: string } | { success: false; error: string }> {
  const parsed = nameEntrySchema.safeParse(rawName);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Required" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You need to be logged in." };
  }

  const name = parsed.data;
  const nameNormalized = normalizeName(name);

  const existing = await supabase
    .from(table)
    .select("id, name")
    .eq("name_normalized", nameNormalized)
    .maybeSingle();

  if (existing.data) {
    return { success: true, id: existing.data.id, name: existing.data.name };
  }

  const inserted = await supabase
    .from(table)
    .insert({ user_id: user.id, name, name_normalized: nameNormalized })
    .select("id, name")
    .single();

  if (inserted.error || !inserted.data) {
    // Concurrent duplicate insert (e.g. rapid double-tap on "+ Add new") —
    // fall back to the row that won the race instead of erroring out.
    if ((inserted.error as { code?: string } | null)?.code === "23505") {
      const retry = await supabase
        .from(table)
        .select("id, name")
        .eq("name_normalized", nameNormalized)
        .maybeSingle();
      if (retry.data) {
        return { success: true, id: retry.data.id, name: retry.data.name };
      }
    }
    logServerError(`findOrCreateLookup:${table}`, inserted.error);
    return { success: false, error: friendlyErrorMessage(inserted.error, "Couldn't save that. Please try again.") };
  }

  return { success: true, id: inserted.data.id, name: inserted.data.name };
}
