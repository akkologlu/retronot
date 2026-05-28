-- ============================================================
-- Migration 051: Production readiness fixes
-- C5 Atomic group dissolution RPC
-- C6 Vote limit trigger: enforce minimum 1
-- H7 current_discussion_card_id FK: ON DELETE SET NULL
-- M1 Phase-gate card INSERT to write phase only
-- M2 Prevent content overwrite of other users' cards
-- M3 Make author reveal one-way (cannot un-reveal)
-- ============================================================

-- -------------------------------------------------------
-- C5: Atomic group dissolution via RPC
-- Replaces client-side check+delete which had a race window
-- where two concurrent drags could orphan a card.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dissolve_group_if_empty(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_retro_id uuid;
BEGIN
  SELECT retro_id INTO v_retro_id FROM public.retro_groups WHERE id = p_group_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.retro_participants
    WHERE retro_id = v_retro_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant of this retro';
  END IF;

  -- Atomic: check count and delete in one transaction
  IF (SELECT COUNT(*) FROM public.retro_cards WHERE group_id = p_group_id) <= 1 THEN
    UPDATE public.retro_cards SET group_id = NULL WHERE group_id = p_group_id;
    DELETE FROM public.retro_groups WHERE id = p_group_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dissolve_group_if_empty(uuid) TO authenticated;

-- -------------------------------------------------------
-- C6: Vote limit trigger — enforce minimum voteLimit of 1
-- Prevents voteLimit=0 in config from making vote phase unusable.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_vote_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vote_lim INT;
  current_votes INT;
BEGIN
  SELECT GREATEST(COALESCE((config->>'voteLimit')::int, 5), 1) INTO vote_lim
    FROM public.retros WHERE id = NEW.retro_id;

  SELECT COUNT(*) INTO current_votes
    FROM public.retro_votes
    WHERE retro_id = NEW.retro_id AND participant_id = NEW.participant_id;

  IF current_votes >= vote_lim THEN
    RAISE EXCEPTION 'Vote limit exceeded (limit: %)', vote_lim;
  END IF;

  RETURN NEW;
END;
$$;

-- -------------------------------------------------------
-- H7: Fix current_discussion_card_id FK to use ON DELETE SET NULL
-- Without this, deleting a card during discuss phase would fail with
-- a FK violation if it was the currently-displayed card.
-- -------------------------------------------------------
ALTER TABLE public.retros
  DROP CONSTRAINT IF EXISTS retros_current_discussion_card_id_fkey;

ALTER TABLE public.retros
  ADD CONSTRAINT retros_current_discussion_card_id_fkey
  FOREIGN KEY (current_discussion_card_id)
  REFERENCES public.retro_cards(id)
  ON DELETE SET NULL;

-- -------------------------------------------------------
-- M1: Phase-gate card INSERT to write phase only
-- Prevents stale clients from inserting cards during group/vote/discuss.
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Participants can create cards" ON public.retro_cards;

CREATE POLICY "Participants can create cards" ON public.retro_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.retro_participants rp
      WHERE rp.retro_id = retro_cards.retro_id
        AND rp.user_id = auth.uid()
    )
    AND (
      SELECT phase FROM public.retros WHERE id = retro_cards.retro_id
    ) = 'write'
  );

-- -------------------------------------------------------
-- M2: Prevent participants from overwriting another user's card content
-- The "Participants can group any card" policy allows updating any card
-- for grouping (group_id change), but we block content changes to others' cards.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_card_content_overwrite()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content
    AND OLD.author_id IS DISTINCT FROM auth.uid()
  THEN
    RAISE EXCEPTION 'Cannot edit another participant''s card content';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS no_content_overwrite ON public.retro_cards;
CREATE TRIGGER no_content_overwrite
  BEFORE UPDATE ON public.retro_cards
  FOR EACH ROW EXECUTE FUNCTION public.prevent_card_content_overwrite();

-- -------------------------------------------------------
-- M3: Make author reveal one-way (cannot un-reveal)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_unrevealing_card()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.author_revealed = true AND NEW.author_revealed = false THEN
    RAISE EXCEPTION 'Card reveal cannot be undone';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS no_unreveal ON public.retro_cards;
CREATE TRIGGER no_unreveal
  BEFORE UPDATE ON public.retro_cards
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unrevealing_card();
