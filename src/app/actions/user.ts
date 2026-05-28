"use server";

import { createClient } from "@/lib/supabase/server";
import { UpdateProfileSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

export async function updateProfile(
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = UpdateProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [profileResult, authResult] = await Promise.all([
    supabase
      .from("users")
      .update({ full_name: parsed.data.fullName })
      .eq("id", user.id),
    supabase.auth.updateUser({ data: { full_name: parsed.data.fullName } }),
  ]);

  if (profileResult.error) return { error: profileResult.error.message };
  if (authResult.error) return { error: authResult.error.message };

  revalidatePath("/", "layout");
  return {};
}
