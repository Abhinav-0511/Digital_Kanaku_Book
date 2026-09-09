import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "./env";
import { AUTH_USER_ID_HEADER, AUTH_USER_EMAIL_HEADER } from "./authHeaders";

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

export interface AuthedUser {
  id: string;
  email: string | null;
}

/**
 * `auth.getUser()` re-validates the JWT against the Auth server — a real
 * network round trip. The proxy (src/proxy.ts -> lib/supabase/middleware.ts)
 * already does this once per request and forwards the verified id/email via
 * trusted headers (stripped of any client-supplied value there), so the
 * common case here is a header read with no network call at all. `cache()`
 * still dedupes repeat calls within the same request/action invocation, and
 * the network call remains as a fallback for anything that reaches this
 * code without going through the proxy.
 */
export const getAuthedUser = cache(async (): Promise<AuthedUser | null> => {
  const headerList = await headers();
  const headerId = headerList.get(AUTH_USER_ID_HEADER);
  if (headerId) {
    return { id: headerId, email: headerList.get(AUTH_USER_EMAIL_HEADER) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
});
