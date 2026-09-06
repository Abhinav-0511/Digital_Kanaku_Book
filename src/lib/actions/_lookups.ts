import "server-only";

import { createClient, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { nameEntrySchema } from "@/lib/validation/schemas";
import type { Company, Party } from "@/types/domain";

type LookupTable = "companies" | "parties";

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function searchLookup(table: LookupTable, query: string): Promise<Company[] | Party[]> {
  const user = await getAuthedUser();
  if (!user) return [];

  const supabase = await createClient();
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

/**
 * Finds an existing company/party by normalized name, or creates it —
 * atomically, in a single round trip (see migration 0003). This is what
 * lets the Add Load form "just work": whatever name is typed is used
 * as-is, matched case/space-insensitively against what already exists,
 * and created automatically if it doesn't.
 */
export async function findOrCreateLookup(
  table: LookupTable,
  rawName: string,
): Promise<{ success: true; id: string; name: string } | { success: false; error: string }> {
  const parsed = nameEntrySchema.safeParse(rawName);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Required" };
  }

  const user = await getAuthedUser();
  if (!user) {
    return { success: false, error: "You need to be logged in." };
  }

  const name = parsed.data;
  const nameNormalized = normalizeName(name);
  const rpcName = table === "companies" ? "find_or_create_company" : "find_or_create_party";

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc(rpcName, { p_user_id: user.id, p_name: name, p_name_normalized: nameNormalized })
    .single();

  if (error || !data) {
    logServerError(`findOrCreateLookup:${table}`, error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't save that. Please try again.") };
  }

  return { success: true, id: data.id, name: data.name };
}
