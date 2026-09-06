"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { nameEntrySchema } from "@/lib/validation/schemas";
import type { Profile } from "@/types/domain";

export async function getCurrentProfile(): Promise<{ profile: Profile | null; email: string | null }> {
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
}

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
