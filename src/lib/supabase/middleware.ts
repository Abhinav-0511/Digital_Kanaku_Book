import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { AUTH_USER_ID_HEADER, AUTH_USER_EMAIL_HEADER } from "./authHeaders";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * `auth.getUser()` re-validates the JWT against the Auth server — a real
 * network round trip. It only needs to happen once per request, here. We
 * forward the verified id/email to the rest of the request via headers so
 * `getAuthedUser()` (src/lib/supabase/server.ts) doesn't have to pay for a
 * second round trip for the same request. Any client-supplied value for
 * these headers is stripped first so this can't be spoofed.
 */
export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(AUTH_USER_ID_HEADER);
  requestHeaders.delete(AUTH_USER_EMAIL_HEADER);

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase not configured yet — let requests through untouched so the
  // rest of the app can render (it will surface a clear config error).
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicPath = isPublicPath(pathname);

  if (!user && !publicPath) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && publicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user) {
    requestHeaders.set(AUTH_USER_ID_HEADER, user.id);
    if (user.email) requestHeaders.set(AUTH_USER_EMAIL_HEADER, user.email);
    const responseWithUser = NextResponse.next({ request: { headers: requestHeaders } });
    supabaseResponse.cookies.getAll().forEach((cookie) => responseWithUser.cookies.set(cookie));
    supabaseResponse = responseWithUser;
  }

  return supabaseResponse;
}
