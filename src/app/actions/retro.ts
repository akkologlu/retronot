"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Database } from "@/types/supabase";
import { CreateRetroSchema, parseRetroConfig } from "@/lib/schemas";
import { isValidUUID } from "@/lib/schemas";

type Phase = Database["public"]["Tables"]["retros"]["Row"]["phase"];

const VALID_TRANSITIONS: Partial<Record<Phase, Phase>> = {
  lobby: "write",
  write: "group",
  group: "vote",
  vote: "discuss",
  discuss: "summary",
};

export async function createRetro(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = CreateRetroSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const {
    name,
    teamId,
    templateType,
    voteLimit,
    writeTimerMinutes,
    voteTimerMinutes,
  } = parsed.data;

  const BUILT_IN = new Set([
    "start-stop-continue",
    "sad-mad-happy",
    "keep-problem-try",
  ]);
  let customColumns: string[] | undefined;
  if (!BUILT_IN.has(templateType)) {
    const { data: tpl } = await supabase
      .from("retro_templates")
      .select("columns")
      .eq("id", templateType)
      .single();
    if (tpl) {
      customColumns = (tpl.columns as { name: string }[]).map((c) => c.name);
    }
  }

  const config = {
    allowGuests: false,
    voteLimit,
    phaseTimers: {
      ...(writeTimerMinutes > 0 ? { write: writeTimerMinutes } : {}),
      ...(voteTimerMinutes > 0 ? { vote: voteTimerMinutes } : {}),
    },
    ...(customColumns ? { customColumns } : {}),
  };

  const { data: retro, error } = await supabase
    .from("retros")
    .insert({
      name,
      team_id: teamId,
      template_type: templateType,
      created_by: user.id,
      phase: "lobby" as Phase,
      config,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await supabase.from("retro_participants").insert({
    retro_id: retro.id,
    user_id: user.id,
    online: true,
  });

  revalidatePath("/");
  redirect(`/retro/${retro.id}/lobby`);
}

export async function advancePhase(retroId: string) {
  if (!isValidUUID(retroId)) return { error: "Invalid retro ID" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: retro, error: fetchError } = await supabase
    .from("retros")
    .select("*")
    .eq("id", retroId)
    .single();

  if (!retro) return { error: fetchError?.message ?? "Retro not found" };

  const moderatorId = retro.moderator_id ?? retro.created_by;
  if (moderatorId !== user.id) return { error: "Not authorized" };

  const nextPhase = VALID_TRANSITIONS[retro.phase];
  if (!nextPhase) return { error: "No next phase" };

  const updatePayload: Record<string, unknown> = { phase: nextPhase };
  if ("phase_started_at" in retro)
    updatePayload.phase_started_at = new Date().toISOString();

  // Use .eq('phase', retro.phase) to prevent double-advance race: if two
  // concurrent calls race, the second sees the phase already changed → 0 rows
  // updated → no error, silently ignored.
  const { error } = await supabase
    .from("retros")
    .update(updatePayload)
    .eq("id", retroId)
    .eq("phase", retro.phase);

  if (error) return { error: error.message };
  return { success: true, nextPhase };
}

export async function setDiscussionCard(
  retroId: string,
  cardId: string | null,
) {
  if (!isValidUUID(retroId)) return { error: "Invalid retro ID" };
  if (cardId !== null && !isValidUUID(cardId))
    return { error: "Invalid card ID" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: retro } = await supabase
    .from("retros")
    .select("*")
    .eq("id", retroId)
    .single();

  if (!retro) return { error: "Retro not found" };

  const moderatorId = retro.moderator_id ?? retro.created_by;
  if (moderatorId !== user.id) return { error: "Not authorized" };

  if (retro.phase !== "discuss") return { error: "Wrong phase" };

  const { error } = await supabase
    .from("retros")
    .update({ current_discussion_card_id: cardId })
    .eq("id", retroId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function archiveRetro(
  retroId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: retro } = await supabase
    .from("retros")
    .select("created_by")
    .eq("id", retroId)
    .single();

  if (!retro || retro.created_by !== user.id)
    return { error: "Not authorized" };

  const { error } = await supabase
    .from("retros")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", retroId);

  if (error) return { error: error.message };

  revalidatePath("/");
  return {};
}

export async function unarchiveRetro(
  retroId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: retro } = await supabase
    .from("retros")
    .select("created_by")
    .eq("id", retroId)
    .single();

  if (!retro || retro.created_by !== user.id)
    return { error: "Not authorized" };

  const { error } = await supabase
    .from("retros")
    .update({ archived_at: null })
    .eq("id", retroId);

  if (error) return { error: error.message };

  revalidatePath("/");
  return {};
}

export async function adjustPhaseTimer(
  retroId: string,
  remainingMinutes: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: retro } = await supabase
    .from("retros")
    .select("*")
    .eq("id", retroId)
    .single();

  if (!retro) return { error: "Retro not found" };

  const moderatorId = retro.moderator_id ?? retro.created_by;
  if (moderatorId !== user.id) return { error: "Not authorized" };

  const phase = retro.phase;
  if (phase !== "write" && phase !== "vote")
    return { error: "No timer for this phase" };
  if (!retro.phase_started_at) return { error: "Phase not started" };

  const elapsedMs = Date.now() - new Date(retro.phase_started_at).getTime();
  // Round total (elapsed + remaining) to nearest minute to minimise drift
  const newDuration = Math.round(
    (elapsedMs + Math.max(0, remainingMinutes) * 60_000) / 60_000,
  );
  const clamped = Math.max(1, Math.min(120, newDuration));

  const config = parseRetroConfig(retro.config);
  const newConfig = {
    ...config,
    phaseTimers: {
      ...config.phaseTimers,
      [phase]: clamped,
    },
  };

  const { error } = await supabase
    .from("retros")
    .update({ config: newConfig })
    .eq("id", retroId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function transferModerator(retroId: string, newUserId: string) {
  if (!isValidUUID(retroId) || !isValidUUID(newUserId))
    return { error: "Invalid ID" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: retro } = await supabase
    .from("retros")
    .select("*")
    .eq("id", retroId)
    .single();

  if (!retro) return { error: "Retro not found" };

  const currentModerator = retro.moderator_id ?? retro.created_by;
  if (currentModerator !== user.id) return { error: "Not authorized" };

  const { data: participant } = await supabase
    .from("retro_participants")
    .select("id")
    .eq("retro_id", retroId)
    .eq("user_id", newUserId)
    .single();
  if (!participant) return { error: "User is not a retro participant" };

  const { error } = await supabase
    .from("retros")
    .update({ moderator_id: newUserId })
    .eq("id", retroId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function autoTransferModerator(
  retroId: string,
  newUserId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== newUserId) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.rpc("claim_moderator", {
    p_retro_id: retroId,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function revealCardAuthor(cardId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: card } = await supabase
    .from("retro_cards")
    .select("author_id")
    .eq("id", cardId)
    .single();

  if (!card) return { error: "Card not found" };
  if (card.author_id !== user.id) return { error: "Not your card" };

  const { error } = await supabase
    .from("retro_cards")
    .update({ author_revealed: true })
    .eq("id", cardId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function markPreviousActionDone(itemId: string) {
  if (!isValidUUID(itemId)) return { error: "Invalid item ID" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify user is a participant in the retro that owns this action item
  const { data: item } = await supabase
    .from("action_items")
    .select("retro_id")
    .eq("id", itemId)
    .single();
  if (!item) return { error: "Action item not found" };

  const { data: participant } = await supabase
    .from("retro_participants")
    .select("id")
    .eq("retro_id", item.retro_id)
    .eq("user_id", user.id)
    .single();
  if (!participant) return { error: "Not authorized" };

  const { error } = await supabase
    .from("action_items")
    .update({ completed: true })
    .eq("id", itemId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function carryOverActionItem(itemId: string, toRetroId: string) {
  if (!isValidUUID(itemId) || !isValidUUID(toRetroId))
    return { error: "Invalid ID" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: original } = await supabase
    .from("action_items")
    .select("content, assigned_to_user_id")
    .eq("id", itemId)
    .single();

  if (!original) return { error: "Action item not found" };

  const { error } = await supabase.from("action_items").insert({
    retro_id: toRetroId,
    content: original.content,
    assigned_to_user_id: original.assigned_to_user_id,
    created_by: user.id,
    carried_over_from: itemId,
  });

  if (error) return { error: error.message };
  return { success: true };
}
