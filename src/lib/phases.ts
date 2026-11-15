import type { Database } from "@/types/supabase";
import { parseRetroConfig } from "@/lib/schemas";

export type Phase = Database["public"]["Tables"]["retros"]["Row"]["phase"];

export const PHASE_ORDER: Phase[] = [
  "lobby",
  "review",
  "write",
  "group",
  "vote",
  "discuss",
  "summary",
];

export const PHASE_LABELS: Record<Phase, string> = {
  lobby: "Lobby",
  review: "Action Item Review",
  write: "Writing",
  group: "Grouping",
  vote: "Voting",
  discuss: "Discussion",
  summary: "Summary",
};

// lobby moves to "review" instead when the previous retro has open action items
// (decided on the server in advancePhase).
export const NEXT_PHASE: Partial<Record<Phase, Phase>> = {
  lobby: "write",
  review: "write",
  write: "group",
  group: "vote",
  vote: "discuss",
  discuss: "summary",
};

// Moving back stops at the first board phase (never the lobby) and never
// leaves summary — a finished retro is what the next retro's review reads.
const BACK_TRANSITIONS: Partial<Record<Phase, Phase>> = {
  write: "review",
  group: "write",
  vote: "group",
  discuss: "vote",
};

export function getPreviousPhase(retro: {
  phase: Phase;
  config: unknown;
}): Phase | null {
  const previous = BACK_TRANSITIONS[retro.phase];
  if (!previous) return null;
  // write → review only when this retro actually had a review phase.
  if (
    previous === "review" &&
    !parseRetroConfig(retro.config).previousActionReview
  )
    return null;
  return previous;
}
