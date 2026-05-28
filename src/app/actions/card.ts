"use server";

import { createClient } from "@/lib/supabase/server";
import { cardRatelimit } from "@/lib/ratelimit";
import { CardContentSchema, isValidUUID } from "@/lib/schemas";

export async function createCard(
  retroId: string,
  content: string,
  columnName: string,
) {
  if (!isValidUUID(retroId)) return { error: "Invalid retro ID" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  try {
    const { success } = await cardRatelimit.limit(user.id);
    if (!success) return { error: "Too many cards. Slow down." };
  } catch {
    // Redis unavailable — allow the request
  }

  const parsed = CardContentSchema.safeParse(content);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: card, error } = await supabase
    .from("retro_cards")
    .insert({
      retro_id: retroId,
      content: parsed.data,
      column_name: columnName,
      author_id: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { card };
}

export async function updateCardContent(cardId: string, content: string) {
  if (!isValidUUID(cardId)) return { error: "Invalid card ID" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = CardContentSchema.safeParse(content);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("retro_cards")
    .update({ content: parsed.data })
    .eq("id", cardId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteCard(cardId: string) {
  if (!isValidUUID(cardId)) return { error: "Invalid card ID" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Only allow deleting own cards
  const { error } = await supabase
    .from("retro_cards")
    .delete()
    .eq("id", cardId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
