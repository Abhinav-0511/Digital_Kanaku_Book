"use server";

import { cache } from "react";
import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { createClient, createTokenClient, getAccessToken, getAuthedUser } from "@/lib/supabase/server";
import { friendlyErrorMessage, logServerError } from "@/lib/errors";
import { nameEntrySchema } from "@/lib/validation/schemas";
import { cacheTags, CACHE_TTL_SECONDS } from "@/lib/cache/tags";
import type { Profile } from "@/types/domain";

/**
 * Every page calls this for weightUnit, and the (app) layout calls it again
 * for the header. `cache()` collapses repeat calls within one request to
 * one (a genuine serial wait otherwise — the layout's call must finish
 * before the page even starts rendering); `unstable_cache` inside it also
 * avoids a fresh `profiles` round trip on every *separate* navigation.
 */
export const getCurrentProfile = cache(async (): Promise<{ profile: Profile | null; email: string | null }> => {
  const user = await getAuthedUser();
  if (!user) return { profile: null, email: null };
  const token = await getAccessToken();
  if (!token) return { profile: null, email: user.email ?? null };

  const cached = unstable_cache(
    async (userId: string, accessToken: string) => {
      const supabase = createTokenClient(accessToken);
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error || !data) {
        if (error) logServerError("getCurrentProfile", error);
        return null;
      }
      const profile: Profile = {
        id: data.id,
        name: data.name,
        weightUnit: data.weight_unit,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      return profile;
    },
    ["getCurrentProfile"],
    { tags: [cacheTags.profile(user.id)], revalidate: CACHE_TTL_SECONDS },
  );

  const profile = await cached(user.id, token);
  return { profile, email: user.email ?? null };
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

  revalidateTag(cacheTags.profile(user.id), { expire: 0 });
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

  revalidateTag(cacheTags.profile(user.id), { expire: 0 });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}
