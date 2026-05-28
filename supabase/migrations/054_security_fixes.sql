-- Fix claim_moderator: only allow claiming when no moderator is set or moderator is offline
CREATE OR REPLACE FUNCTION public.claim_moderator(p_retro_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_moderator uuid;
  v_moderator_online boolean;
BEGIN
  -- Must be a participant
  IF NOT EXISTS (
    SELECT 1 FROM public.retro_participants
    WHERE retro_id = p_retro_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  -- Get current moderator
  SELECT moderator_id INTO v_current_moderator
  FROM public.retros
  WHERE id = p_retro_id;

  -- If there's already a moderator, check if they're online
  IF v_current_moderator IS NOT NULL AND v_current_moderator IS DISTINCT FROM auth.uid() THEN
    SELECT online INTO v_moderator_online
    FROM public.retro_participants
    WHERE retro_id = p_retro_id AND user_id = v_current_moderator;

    -- Only allow claiming if current moderator is offline
    IF v_moderator_online IS TRUE THEN
      RAISE EXCEPTION 'A moderator is already active';
    END IF;
  END IF;

  UPDATE public.retros
  SET moderator_id = auth.uid()
  WHERE id = p_retro_id
    AND (moderator_id IS DISTINCT FROM auth.uid());
END;
$$;

-- Fix card DELETE policy: only card author can delete their own cards
-- First drop any existing delete policies on retro_cards
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'retro_cards' AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.retro_cards', pol.policyname);
  END LOOP;
END $$;

-- Create new policy: only card authors can delete their own cards
CREATE POLICY "Authors can delete own cards" ON public.retro_cards
  FOR DELETE USING (author_id = auth.uid());

-- Fix users profile visibility: restrict email exposure to team members only
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'users' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.users', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view teammates profiles" ON public.users
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid() AND tm2.user_id = id
    )
  );
