import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "./env";
import { AUTH_USER_ID_HEADER, AUTH_USER_EMAIL_HEADER, AUTH_ACCESS_TOKEN_HEADER } from "./authHeaders";

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

/**
 * The current session's access token — needed only to build a cache-safe
 * client (see createTokenClient below). Mirrors getAuthedUser()'s pattern:
 * the proxy already validated (and, if needed, refreshed) the session once
 * via getUser() and forwards its token via a trusted header, so the common
 * case is a header read, no second session lookup. The fallback calls
 * getSession() directly — Supabase's own guidance prefers getUser() for
 * anything security-deciding, but this token is never itself trusted for
 * that: it's only ever used to make a request through PostgREST, which
 * independently verifies its signature before honoring any RLS policy.
 */
export const getAccessToken = cache(async (): Promise<string | null> => {
  const headerList = await headers();
  const headerToken = headerList.get(AUTH_ACCESS_TOKEN_HEADER);
  if (headerToken) return headerToken;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session.access_token;
});

/**
 * A Supabase client authorized by a bearer token instead of cookies — the
 * only kind of client `unstable_cache` is allowed to use internally (it
 * throws if a cached function touches cookies()/headers()). Every read it
 * makes still goes through the exact same RLS policies as the cookie-based
 * client; nothing about the security boundary changes, only how the token
 * is carried. `persistSession`/`autoRefreshToken` are off because this is a
 * short-lived, single-query client, not a session manager.
 */
export function createTokenClient(accessToken: string) {
  const { url, anonKey } = getSupabaseEnv();
  return createSupabaseJsClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
