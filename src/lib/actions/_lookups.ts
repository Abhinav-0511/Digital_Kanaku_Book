import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { nameEntrySchema } from "@/lib/validation/schemas";
import type { Company, Party } from "@/types/domain";
import type { Database } from "@/types/database.types";

type LookupTable = "companies" | "parties";

export interface RenameResult {
  success: boolean;
  error?: string;
  name?: string;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Escapes LIKE wildcards so a typed % or _ matches literally. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/**
 * Suggestions for the company/party fields. Matches are anchored to the
 * start of the name — typing "su" offers Suresh Traders, not Basudev — which
 * is how people actually recall these names. Only when nothing starts with
 * the query do we widen to a contains match, so a half-remembered name in
 * the middle ("traders") still finds something instead of a dead end.
 *
 * Takes an explicit client rather than building its own, so it can be
 * called from inside a cached function (which isn't allowed to touch
 * cookies() itself — see lib/supabase/server.ts:createTokenClient) as well
 * as from an uncached one. RLS scopes every result to the caller, so no
 * separate user_id filter is needed here regardless of which client it is.
 */
export async function searchLookup(
  supabase: SupabaseClient<Database>,
  table: LookupTable,
  query: string,
): Promise<Company[] | Party[]> {
  const trimmed = query.trim();
  const select = () => supabase.from(table).select("id, name").order("name").limit(20);

  if (!trimmed) {
    const { data, error } = await select();
    if (error) {
      logServerError(`searchLookup:${table}`, error);
      return [];
    }
    return data ?? [];
  }

  const pattern = escapeLikePattern(normalizeName(trimmed));

  const prefix = await select().ilike("name_normalized", `${pattern}%`);
  if (prefix.error) {
    logServerError(`searchLookup:${table}`, prefix.error);
    return [];
  }
  if (prefix.data && prefix.data.length > 0) return prefix.data;

  const contains = await select().ilike("name_normalized", `%${pattern}%`);
  if (contains.error) {
    logServerError(`searchLookup:${table}`, contains.error);
    return [];
  }
  return contains.data ?? [];
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
