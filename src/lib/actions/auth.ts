"use server";

import { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation/schemas";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function loginAction(input: { email: string; password: string }): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    logServerError("loginAction", error);
    return { success: false, error: friendlyErrorMessage(error, "Incorrect email or password.") };
  }

  return { success: true };
}

export async function registerAction(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  });

  if (error) {
    logServerError("registerAction", error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't create your account. Please try again.") };
  }

  return { success: true };
}

export async function forgotPasswordAction(input: { email: string }): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: siteUrl ? `${siteUrl}/reset-password` : undefined,
  });

  if (error) {
    logServerError("forgotPasswordAction", error);
    // Do not reveal whether the email exists — same message either way.
  }

  return { success: true };
}

export async function resetPasswordAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    logServerError("resetPasswordAction", error);
    return { success: false, error: friendlyErrorMessage(error, "Couldn't reset your password. Please try again.") };
  }

  return { success: true };
}

export async function logoutAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logServerError("logoutAction", error);
    return { success: false, error: "Couldn't log out. Please try again." };
  }
  return { success: true };
}
