import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCAL_DISCUSSION_CARD_GUARD_MS,
  useRetroStore,
} from "@/lib/store/retro-store";
import type { Database } from "@/types/supabase";

type Retro = Database["public"]["Tables"]["retros"]["Row"];
type Participant = Database["public"]["Tables"]["retro_participants"]["Row"];

const retro = {
  id: "retro-1",
  name: "Sprint 1",
  phase: "discuss",
  current_discussion_card_id: "card-a",
} as Retro;

const store = () => useRetroStore.getState();

describe("discussion card guard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    store().reset();
    store().setRetro(retro);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies a local card change immediately", () => {
    store().setLocalDiscussionCard("card-b");
    expect(store().retro?.current_discussion_card_id).toBe("card-b");
  });

  it("ignores a stale card from the server while the guard is active", () => {
    store().setLocalDiscussionCard("card-b");
    store().applyServerRetro(retro);
    expect(store().retro?.current_discussion_card_id).toBe("card-b");
  });

  it("still applies other fields of a guarded server row", () => {
    store().setLocalDiscussionCard("card-b");
    store().applyServerRetro({ ...retro, moderator_id: "user-2" });
    expect(store().retro?.moderator_id).toBe("user-2");
    expect(store().retro?.current_discussion_card_id).toBe("card-b");
  });

  it("accepts the server value once the guard expires", () => {
    store().setLocalDiscussionCard("card-b");
    vi.advanceTimersByTime(LOCAL_DISCUSSION_CARD_GUARD_MS + 1);
    store().applyServerRetro(retro);
    expect(store().retro?.current_discussion_card_id).toBe("card-a");
    expect(store().localDiscussionCard).toBeNull();
  });

  it("follows server rows when there was no local change", () => {
    store().applyServerRetro({
      ...retro,
      current_discussion_card_id: "card-c",
    });
    expect(store().retro?.current_discussion_card_id).toBe("card-c");
  });
});

describe("updateParticipant", () => {
  it("keeps joined user data when a realtime row has none", () => {
    store().reset();
    const joined = {
      id: "p-1",
      user_id: "user-1",
      online: true,
      users: { full_name: "Ada" },
    } as unknown as Participant;
    store().setParticipants([joined]);

    store().updateParticipant({
      id: "p-1",
      user_id: "user-1",
      online: false,
    } as Participant);

    expect(store().participants[0]).toMatchObject({
      online: false,
      users: { full_name: "Ada" },
    });
  });
});
