/**
 * Maps Supabase/Postgres errors to short, friendly messages. Raw error
 * details are logged server-side for debugging but never sent to the client.
 */
export function friendlyErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error && typeof error === "object") {
    const err = error as { code?: string; message?: string };

    if (err.code === "23505") {
      return "That name already exists. Please choose a different one.";
    }
    if (err.code === "23514" || err.code === "22003" || err.code === "23503") {
      return "Please check your details and try again.";
    }
    if (err.message?.toLowerCase().includes("invalid login credentials")) {
      return "Incorrect email or password.";
    }
    if (err.message?.toLowerCase().includes("user already registered")) {
      return "An account with this email already exists.";
    }
    if (err.message?.toLowerCase().includes("email not confirmed")) {
      return "Please confirm your email address before logging in.";
    }
    if (err.message?.toLowerCase().includes("not configured")) {
      return err.message!;
    }
  }

  return fallback;
}

export function logServerError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
}
