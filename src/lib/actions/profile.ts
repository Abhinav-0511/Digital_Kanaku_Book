"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { createClient, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { nameEntrySchema } from "@/lib/validation/schemas";
import type { Profile } from "@/types/domain";

/**
 * Every page calls this for weightUnit, and the (app) layout calls it again
 * for the header — without dedup that's two `profiles` round trips on every
 * single navigation, one of them a genuine serial wait (the layout's call
 * must finish before the page even starts rendering). `cache()` collapses
 * repeat calls within the same request to one, same as getAuthedUser().
 */
export const getCurrentProfile = cache(async (): Promise<{ profile: Profile | null; email: string | null }> => {
  const user = await getAuthedUser();
  if (!user) return { profile: null, email: null };

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error || !data) {
    if (error) logServerError("getCurrentProfile", error);
    return { profile: null, email: user.email ?? null };
  }

  return {
    profile: {
      id: data.id,
      name: data.name,
      weightUnit: data.weight_unit,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
    email: user.email ?? null,
  };
});

export async function updateProfileName(name: string): Promise<{ success: boolean; error?: string }> {
  const parsed = nameEntrySchema.safeParse(name);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };
  }

  const user = await getAuthedUser();
  if (!user) return { success: false, error: "You need to be logged in." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ name: parsed.data }).eq("id", user.id);
  if (error) {
    logServerError("updateProfileName", error);
    return { success: false, error: friendlyErrorMessage(error) };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateWeightUnit(weightUnit: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = weightUnit.trim();
  if (!trimmed || trimmed.length > 20) {
    return { success: false, error: "Enter a valid unit label" };
  }

  const user = await getAuthedUser();
  if (!user) return { success: false, error: "You need to be logged in." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ weight_unit: trimmed }).eq("id", user.id);
  if (error) {
    logServerError("updateWeightUnit", error);
    return { success: false, error: friendlyErrorMessage(error) };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}
