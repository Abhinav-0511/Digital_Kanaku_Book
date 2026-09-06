import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component without a mutable response —
          // safe to ignore because middleware refreshes the session cookie.
        }
      },
    },
  });
}

/**
 * `auth.getUser()` re-validates the JWT against the Auth server on every
 * call — necessary for security, but a page or action often needs the
 * current user in several places (layout auth check, several parallel data
 * fetches, a mutation's ownership check). `cache()` dedupes those into a
 * single network round trip per request/action invocation.
 */
export const getAuthedUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
});
