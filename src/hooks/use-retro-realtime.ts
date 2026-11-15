import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRetroStore } from "@/lib/store/retro-store";
import { autoTransferModerator } from "@/app/actions/retro";
import type { Database } from "@/types/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

type CardRow = Database["public"]["Tables"]["retro_cards"]["Row"];
type ParticipantRow = Database["public"]["Tables"]["retro_participants"]["Row"];
type GroupRow = Database["public"]["Tables"]["retro_groups"]["Row"];
type VoteRow = Database["public"]["Tables"]["retro_votes"]["Row"];
type ActionItemRow = Database["public"]["Tables"]["action_items"]["Row"];
type RetroRow = Database["public"]["Tables"]["retros"]["Row"];

type PresenceEntry = {
  user_id?: string;
  draft?: { column: string; length: number } | null;
};

function getOnlineUserIds(channel: RealtimeChannel | null) {
  const online = new Set<string>();
  if (!channel) return online;
  Object.values(channel.presenceState())
    .flat()
    .forEach((entry) => {
      const uid = (entry as PresenceEntry).user_id;
      if (uid) online.add(uid);
    });
  return online;
}

// Server-side heartbeat for claim_moderator, which treats a moderator as gone
// once their last beat is older than 90s (migration 058).
const HEARTBEAT_MS = 20_000;
// Time a departed moderator gets to reconnect before someone claims the role.
const MODERATOR_GRACE_MS = 10_000;
// The server refuses a claim until the moderator's heartbeat expires.
const MODERATOR_CLAIM_RETRY_MS = 20_000;

// An unmount may be followed by a remount (Back can briefly leave the retro
// route), so the away signal waits and is cancelled if the retro mounts again.
// Sending it at once could reach the server after the remount's first beat.
const AWAY_DELAY_MS = 3_000;
const pendingAway = new Map<string, ReturnType<typeof setTimeout>>();

// Presence is the source of truth for online status; the DB column goes stale.
// An empty presence state means the channel has not synced yet, so keep the fallback.
function resolveOnline(
  channel: RealtimeChannel | null,
  userId: string | null,
  fallback: boolean,
) {
  const online = getOnlineUserIds(channel);
  if (!userId || online.size === 0) return fallback;
  return online.has(userId);
}

export function useRetroRealtime(retroId: string, userId?: string) {
  const supabase = createClient();

  const {
    addCard,
    updateCard,
    removeCard,
    addParticipant,
    updateParticipant,
    removeParticipant,
    setParticipantOnline,
    addGroup,
    updateGroup,
    removeGroup,
    addVote,
    removeVote,
    addActionItem,
    updateActionItem,
    removeActionItem,
    applyServerRetro,
    setLocalDiscussionCard,
    setDraft,
    setRealtimeChannel,
    reset,
  } = useRetroStore();

  // Debounce timers for offline marking — prevents flickering on transient disconnects
  const offlineTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    const channel = supabase.channel(`retro:${retroId}`);
    setRealtimeChannel(channel);

    // Claims the moderator role once the moderator has left presence and this
    // user is the longest-joined participant still online.
    let claimTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleModeratorClaim = (delayMs: number) => {
      if (!userId || claimTimer) return;
      claimTimer = setTimeout(async () => {
        claimTimer = null;
        const state = useRetroStore.getState();
        const retro = state.retro;
        if (!retro) return;
        const moderatorId = retro.moderator_id ?? retro.created_by;
        const onlineUserIds = getOnlineUserIds(state.realtimeChannel);
        if (
          moderatorId === userId ||
          (moderatorId && onlineUserIds.has(moderatorId))
        )
          return;

        const successor = state.participants
          .filter(
            (pt) =>
              pt.user_id &&
              pt.user_id !== moderatorId &&
              onlineUserIds.has(pt.user_id),
          )
          .sort(
            (a, b) =>
              new Date(a.joined_at).getTime() -
              new Date(b.joined_at).getTime(),
          )[0];
        if (successor?.user_id !== userId) return;

        const result = await autoTransferModerator(retro.id, userId);
        if (result?.error === "A moderator is already active") {
          scheduleModeratorClaim(MODERATOR_CLAIM_RETRY_MS);
        }
      }, delayMs);
    };

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "retro_cards",
          filter: `retro_id=eq.${retroId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") addCard(payload.new as CardRow);
          if (payload.eventType === "UPDATE") {
            const newCard = payload.new as CardRow;
            updateCard(newCard);

            if (newCard.group_id) {
              const currentGroups = useRetroStore.getState().groups;
              const groupExists = currentGroups.some(
                (g) => g.id === newCard.group_id,
              );
              if (!groupExists) {
                supabase
                  .from("retro_groups")
                  .select("*")
                  .eq("id", newCard.group_id)
                  .single()
                  .then(({ data, error }) => {
                    if (data && !error) addGroup(data as GroupRow);
                  });
              }
            }
          }
          if (payload.eventType === "DELETE")
            removeCard((payload.old as Partial<CardRow>).id!);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "retro_participants",
          filter: `retro_id=eq.${retroId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            supabase
              .from("retro_participants")
              .select("*, users(*)")
              .eq("id", (payload.new as ParticipantRow).id)
              .single()
              .then(({ data }) => {
                if (data)
                  addParticipant({
                    ...(data as ParticipantRow & { users: unknown }),
                    online: resolveOnline(channel, data.user_id, data.online),
                  });
              });
          }
          if (payload.eventType === "UPDATE") {
            const row = payload.new as ParticipantRow;
            const existing = useRetroStore
              .getState()
              .participants.find((p) => p.id === row.id);
            updateParticipant({ ...row, online: existing?.online ?? row.online });
          }
          if (payload.eventType === "DELETE")
            removeParticipant((payload.old as Partial<ParticipantRow>).id!);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "retro_groups",
          filter: `retro_id=eq.${retroId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") addGroup(payload.new as GroupRow);
          if (payload.eventType === "UPDATE")
            updateGroup(payload.new as GroupRow);
          if (payload.eventType === "DELETE")
            removeGroup((payload.old as Partial<GroupRow>).id!);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "retro_votes",
          filter: `retro_id=eq.${retroId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") addVote(payload.new as VoteRow);
          if (payload.eventType === "DELETE")
            removeVote((payload.old as Partial<VoteRow>).id!);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "retros",
          filter: `id=eq.${retroId}`,
        },
        (payload) => {
          applyServerRetro(payload.new as RetroRow);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "action_items",
          filter: `retro_id=eq.${retroId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT")
            addActionItem(payload.new as ActionItemRow);
          if (payload.eventType === "UPDATE")
            updateActionItem(payload.new as ActionItemRow);
          if (payload.eventType === "DELETE")
            removeActionItem((payload.old as Partial<ActionItemRow>).id!);
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { user_id, draft } = payload as {
          user_id: string;
          draft: { column: string; length: number } | null;
        };
        setDraft(user_id, draft ?? null);
      })
      .on("broadcast", { event: "card_sync" }, ({ payload }) => {
        const { action, card, cardId, oldId } = payload as {
          action: "insert" | "update" | "delete" | "replace";
          card?: CardRow;
          cardId?: string;
          oldId?: string;
        };
        if (action === "insert" && card) addCard(card);
        if (action === "update" && card) updateCard(card);
        if (action === "delete" && cardId) removeCard(cardId);
        if (action === "replace" && oldId && card) {
          removeCard(oldId);
          addCard(card);
        }
      })
      .on("broadcast", { event: "discussion_card" }, ({ payload }) => {
        const { card_id } = payload as { card_id: string };
        setLocalDiscussionCard(card_id);
      })
      .on("broadcast", { event: "card_reveal" }, ({ payload }) => {
        const { card_id } = payload as { card_id: string };
        const card = useRetroStore
          .getState()
          .cards.find((c) => c.id === card_id);
        if (card) updateCard({ ...card, author_revealed: true });
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        (newPresences as PresenceEntry[]).forEach((p) => {
          if (p.user_id) {
            // Cancel any pending offline timer — user is back
            const timer = offlineTimers.current.get(p.user_id);
            if (timer) {
              clearTimeout(timer);
              offlineTimers.current.delete(p.user_id);
            }
            setParticipantOnline(p.user_id, true);
            if (p.draft) setDraft(p.user_id, p.draft);
          }
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        (leftPresences as PresenceEntry[]).forEach((p) => {
          if (p.user_id) {
            const uid = p.user_id;
            setDraft(uid, null);

            // Debounce offline marking: wait 5s before marking offline.
            // If a 'join' or 'sync' arrives in the meantime, the timer is cancelled.
            const existingTimer = offlineTimers.current.get(uid);
            if (existingTimer) clearTimeout(existingTimer);

            const offlineTimer = setTimeout(() => {
              offlineTimers.current.delete(uid);
              // Re-check presence state before marking offline
              const ch = useRetroStore.getState().realtimeChannel;
              if (getOnlineUserIds(ch).has(uid)) return; // Still online, don't mark offline
              setParticipantOnline(uid, false);
            }, 5000);
            offlineTimers.current.set(uid, offlineTimer);

            const retro = useRetroStore.getState().retro;
            if (uid === (retro?.moderator_id ?? retro?.created_by)) {
              scheduleModeratorClaim(MODERATOR_GRACE_MS);
            }
          }
        });
      })
      .on("presence", { event: "sync" }, () => {
        const onlineUserIds = getOnlineUserIds(channel);
        // Cancel offline timers for users confirmed online by sync
        onlineUserIds.forEach((uid) => {
          const timer = offlineTimers.current.get(uid);
          if (timer) {
            clearTimeout(timer);
            offlineTimers.current.delete(uid);
          }
        });
        useRetroStore.getState().participants.forEach((p) => {
          if (p.user_id)
            setParticipantOnline(p.user_id, onlineUserIds.has(p.user_id));
        });

        // Covers a moderator who was already gone when this user arrived,
        // so no leave event will ever fire for them.
        const retro = useRetroStore.getState().retro;
        const moderatorId = retro?.moderator_id ?? retro?.created_by;
        if (moderatorId && onlineUserIds.size > 0 && !onlineUserIds.has(moderatorId)) {
          scheduleModeratorClaim(MODERATOR_GRACE_MS);
        }
      })
      .subscribe(async (status) => {
        // Re-track presence on every (re)connect so the user stays visible
        if (status === "SUBSCRIBED" && userId) {
          await channel.track({ user_id: userId, draft: null });
        }
      });

    return () => {
      if (claimTimer) clearTimeout(claimTimer);
      offlineTimers.current.forEach((t) => clearTimeout(t));
      offlineTimers.current.clear();
      supabase.removeChannel(channel);
      setRealtimeChannel(null);
      reset();
    };
  }, [retroId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lets the server tell whether this user is still in the session. Closing the
  // page drops the heartbeat at once, so a handover need not wait for it to expire.
  useEffect(() => {
    if (!userId) return;
    const beat = () => {
      supabase.rpc("touch_participant", { p_retro_id: retroId }).then(
        () => {},
        () => {},
      );
    };
    const markAway = () => {
      navigator.sendBeacon(`/api/retro/${retroId}/away`);
    };
    clearTimeout(pendingAway.get(retroId));
    pendingAway.delete(retroId);
    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);
    window.addEventListener("pagehide", markAway);
    // Coming back from the back/forward cache.
    window.addEventListener("pageshow", beat);
    return () => {
      clearInterval(interval);
      window.removeEventListener("pagehide", markAway);
      window.removeEventListener("pageshow", beat);
      pendingAway.set(
        retroId,
        setTimeout(() => {
          pendingAway.delete(retroId);
          markAway();
        }, AWAY_DELAY_MS),
      );
    };
  }, [retroId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Safety-net poll: recovers missed realtime events (INSERT/UPDATE/DELETE).
  // Uses per-item add/update/remove so optimistic state is never clobbered.
  useEffect(() => {
    const syncMissedEvents = async () => {
      // Retro row — single, safe to overwrite
      const { data: retro } = await supabase
        .from("retros")
        .select("*")
        .eq("id", retroId)
        .single();
      if (retro) applyServerRetro(retro as RetroRow);

      // Participants — joins between the SSR snapshot and the channel subscribing
      // never produce an event for this client, so the list has to converge here.
      const { data: serverParticipants } = await supabase
        .from("retro_participants")
        .select("*, users(*)")
        .eq("retro_id", retroId);
      if (serverParticipants) {
        const { participants: current, realtimeChannel: ch } =
          useRetroStore.getState();
        const currentById = new Map(current.map((p) => [p.id, p]));
        const serverIds = new Set(serverParticipants.map((p) => p.id));
        serverParticipants.forEach((p) => {
          const existing = currentById.get(p.id);
          const row = {
            ...(p as ParticipantRow & { users: unknown }),
            online: resolveOnline(ch, p.user_id, existing?.online ?? p.online),
          };
          if (existing) updateParticipant(row);
          else addParticipant(row);
        });
        current.forEach((p) => {
          if (!serverIds.has(p.id)) removeParticipant(p.id);
        });
      }

      // Groups — most critical, postgres_changes historically unreliable on this table
      const { data: serverGroups } = await supabase
        .from("retro_groups")
        .select("*")
        .eq("retro_id", retroId);
      if (serverGroups) {
        const currentGroups = useRetroStore.getState().groups;
        const storeIds = new Set(currentGroups.map((g) => g.id));
        const serverIds = new Set(serverGroups.map((g) => g.id));
        serverGroups.forEach((g) => {
          if (!storeIds.has(g.id)) addGroup(g as GroupRow);
          else updateGroup(g as GroupRow);
        });
        currentGroups.forEach((g) => {
          if (!serverIds.has(g.id)) removeGroup(g.id);
        });
      }

      // Cards — sync group_id assignments missed during group phase
      const { data: serverCards } = await supabase
        .from("retro_cards")
        .select("*")
        .eq("retro_id", retroId);
      if (serverCards) {
        const currentCards = useRetroStore.getState().cards;
        const storeIds = new Set(currentCards.map((c) => c.id));
        serverCards.forEach((c) => {
          if (!storeIds.has(c.id)) addCard(c as CardRow);
          else updateCard(c as CardRow);
        });
      }

      // Votes — add missing, remove phantom (missed INSERT/DELETE events)
      const { data: serverVotes } = await supabase
        .from("retro_votes")
        .select("*")
        .eq("retro_id", retroId);
      if (serverVotes) {
        const currentVotes = useRetroStore.getState().votes;
        const pendingIds = useRetroStore.getState().pendingVoteIds;
        const storeIds = new Set(currentVotes.map((v) => v.id));
        const serverIds = new Set(serverVotes.map((v) => v.id));
        serverVotes.forEach((v) => {
          if (!storeIds.has(v.id)) addVote(v as VoteRow);
        });
        currentVotes.forEach((v) => {
          if (!serverIds.has(v.id) && !pendingIds.has(v.id)) removeVote(v.id);
        });
      }

      // Action items — sync across all participants in discuss phase
      const { data: serverActionItems } = await supabase
        .from("action_items")
        .select("*")
        .eq("retro_id", retroId);
      if (serverActionItems) {
        const currentItems = useRetroStore.getState().actionItems;
        const storeIds = new Set(currentItems.map((i) => i.id));
        const serverIds = new Set(serverActionItems.map((i) => i.id));
        serverActionItems.forEach((i) => {
          if (!storeIds.has(i.id)) addActionItem(i as ActionItemRow);
          else updateActionItem(i as ActionItemRow);
        });
        currentItems.forEach((i) => {
          if (!serverIds.has(i.id)) removeActionItem(i.id);
        });
      }
    };

    const interval = setInterval(syncMissedEvents, 5000);
    return () => clearInterval(interval);
  }, [retroId]); // eslint-disable-line react-hooks/exhaustive-deps
}
