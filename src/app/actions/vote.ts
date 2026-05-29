"use server";

import { createClient } from "@/lib/supabase/server";
import { voteRatelimit } from "@/lib/ratelimit";
import { isValidUUID } from "@/lib/schemas";

export async function createVote(retroId: string, cardId: string) {
  if (!isValidUUID(retroId) || !isValidUUID(cardId))
    return { error: "Invalid ID" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  try {
    const { success } = await voteRatelimit.limit(user.id);
    if (!success) return { error: "Too many vote requests. Slow down." };
  } catch {
    // Redis unavailable — allow the request
  }

  // Get participant id
  const { data: participant } = await supabase
    .from("retro_participants")
    .select("id")
    .eq("retro_id", retroId)
    .eq("user_id", user.id)
    .single();

  if (!participant) return { error: "Not a participant" };

  const { data: vote, error } = await supabase
    .from("retro_votes")
    .insert({
      retro_id: retroId,
      card_id: cardId,
      participant_id: participant.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { vote };
}

export async function removeVote(voteId: string) {
  if (!isValidUUID(voteId)) return { error: "Invalid vote ID" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Look up the vote to find its retro_id for correct participant resolution
  const { data: vote } = await supabase
    .from("retro_votes")
    .select("retro_id, participant_id")
    .eq("id", voteId)
    .single();

  if (!vote) return { error: "Vote not found" };

  // Get participant id scoped to the correct retro
  const { data: participant } = await supabase
    .from("retro_participants")
    .select("id")
    .eq("retro_id", vote.retro_id)
    .eq("user_id", user.id)
    .single();

  if (!participant) return { error: "Not a participant" };
  if (participant.id !== vote.participant_id)
    return { error: "Not authorized" };

  const { error } = await supabase
    .from("retro_votes")
    .delete()
    .eq("id", voteId)
    .eq("participant_id", participant.id);

  if (error) return { error: error.message };
  return { success: true };
}
