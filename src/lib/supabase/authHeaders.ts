/**
 * Header names used to forward the proxy's already-verified user identity
 * to the rest of the request (see middleware.ts / server.ts). Kept in one
 * place so the "set" side (proxy) and "read" side (getAuthedUser) can't
 * drift apart on the header name.
 */
export const AUTH_USER_ID_HEADER = "x-authed-user-id";
export const AUTH_USER_EMAIL_HEADER = "x-authed-user-email";
