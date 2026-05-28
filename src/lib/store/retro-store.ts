import { create } from "zustand";
import { Database } from "@/types/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Retro = Database["public"]["Tables"]["retros"]["Row"];
type Participant = Database["public"]["Tables"]["retro_participants"]["Row"];
type Card = Database["public"]["Tables"]["retro_cards"]["Row"];
type Group = Database["public"]["Tables"]["retro_groups"]["Row"];
type Vote = Database["public"]["Tables"]["retro_votes"]["Row"];
type ActionItem = Database["public"]["Tables"]["action_items"]["Row"];

export interface ParticipantUser {
  fullName: string | null;
  avatarUrl: string | null;
}

interface RetroState {
  retro: Retro | null;
  participants: Participant[];
  cards: Card[];
  groups: Group[];
  votes: Vote[];
  actionItems: ActionItem[];
  participantUsers: Record<string, ParticipantUser>;

  setRetro: (retro: Retro) => void;
  setParticipants: (participants: Participant[]) => void;
  setParticipantUsers: (map: Record<string, ParticipantUser>) => void;
  setCards: (cards: Card[]) => void;
  setGroups: (groups: Group[]) => void;
  setVotes: (votes: Vote[]) => void;
  setActionItems: (items: ActionItem[]) => void;
  addActionItem: (item: ActionItem) => void;
  updateActionItem: (item: ActionItem) => void;
  removeActionItem: (id: string) => void;

  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: string) => void;
  updateParticipant: (participant: Participant) => void;
  setParticipantOnline: (userId: string, online: boolean) => void;

  addCard: (card: Card) => void;
  updateCard: (card: Card) => void;
  removeCard: (id: string) => void;

  addGroup: (group: Group) => void;
  updateGroup: (group: Group) => void;
  removeGroup: (id: string) => void;

  addVote: (vote: Vote) => void;
  removeVote: (id: string) => void;
  pendingVoteIds: Set<string>;
  addPendingVoteId: (id: string) => void;
  removePendingVoteId: (id: string) => void;

  drafts: Record<string, { column: string; length: number }>;
  setDraft: (
    userId: string,
    draft: { column: string; length: number } | null,
  ) => void;
  setDrafts: (
    drafts: Record<string, { column: string; length: number }>,
  ) => void;

  realtimeChannel: RealtimeChannel | null;
  setRealtimeChannel: (channel: RealtimeChannel | null) => void;

  reset: () => void;
}

const initialState = {
  retro: null,
  participants: [],
  cards: [],
  groups: [],
  votes: [],
  actionItems: [],
  participantUsers: {},
  drafts: {},
  realtimeChannel: null,
  pendingVoteIds: new Set<string>(),
};

export const useRetroStore = create<RetroState>((set) => ({
  ...initialState,

  setRetro: (retro) => set({ retro }),
  setParticipants: (participants) => set({ participants }),
  setParticipantUsers: (participantUsers) => set({ participantUsers }),
  setCards: (cards) => set({ cards }),
  setGroups: (groups) => set({ groups }),
  setVotes: (votes) => set({ votes }),
  setActionItems: (actionItems) => set({ actionItems }),
  addActionItem: (item) =>
    set((state) => ({
      actionItems: state.actionItems.some((i) => i.id === item.id)
        ? state.actionItems
        : [...state.actionItems, item],
    })),
  updateActionItem: (item) =>
    set((state) => ({
      actionItems: state.actionItems.map((i) => (i.id === item.id ? item : i)),
    })),
  removeActionItem: (id) =>
    set((state) => ({
      actionItems: state.actionItems.filter((i) => i.id !== id),
    })),
  setRealtimeChannel: (realtimeChannel) => set({ realtimeChannel }),

  addParticipant: (participant) =>
    set((state) => ({
      participants: state.participants.some((p) => p.id === participant.id)
        ? state.participants
        : [...state.participants, participant],
    })),
  removeParticipant: (id) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== id),
    })),
  updateParticipant: (participant) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participant.id ? participant : p,
      ),
    })),
  setParticipantOnline: (userId, online) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.user_id === userId ? { ...p, online } : p,
      ),
    })),

  addCard: (card) =>
    set((state) => ({
      cards: state.cards.some((c) => c.id === card.id)
        ? state.cards
        : [...state.cards, card],
    })),
  updateCard: (card) =>
    set((state) => ({
      cards: state.cards.map((c) => (c.id === card.id ? card : c)),
    })),
  removeCard: (id) =>
    set((state) => ({ cards: state.cards.filter((c) => c.id !== id) })),

  addGroup: (group) =>
    set((state) => ({
      groups: state.groups.some((g) => g.id === group.id)
        ? state.groups
        : [...state.groups, group],
    })),
  updateGroup: (group) =>
    set((state) => ({
      groups: state.groups.map((g) => (g.id === group.id ? group : g)),
    })),
  removeGroup: (id) =>
    set((state) => ({ groups: state.groups.filter((g) => g.id !== id) })),

  addVote: (vote) =>
    set((state) => ({
      votes: state.votes.some((v) => v.id === vote.id)
        ? state.votes
        : [...state.votes, vote],
    })),
  removeVote: (id) =>
    set((state) => ({ votes: state.votes.filter((v) => v.id !== id) })),
  addPendingVoteId: (id) =>
    set((state) => {
      const next = new Set(state.pendingVoteIds);
      next.add(id);
      return { pendingVoteIds: next };
    }),
  removePendingVoteId: (id) =>
    set((state) => {
      const next = new Set(state.pendingVoteIds);
      next.delete(id);
      return { pendingVoteIds: next };
    }),

  setDraft: (userId, draft) =>
    set((state) => {
      const newDrafts = { ...state.drafts };
      if (draft) {
        newDrafts[userId] = draft;
      } else {
        delete newDrafts[userId];
      }
      return { drafts: newDrafts };
    }),

  setDrafts: (drafts) => set({ drafts }),

  reset: () => set(initialState),
}));
