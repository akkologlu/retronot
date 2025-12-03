-- Fix RLS for retro_participants
-- The existing policy is recursive ("participants can view participants") which can fail or be inefficient.
-- We should allow Team Members to view participants as well.

-- 1. Create a secure function to check if user can view participants
CREATE OR REPLACE FUNCTION public.can_view_participants(r_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Allow if user is a member of the team owning the retro
  IF EXISTS (
    SELECT 1
    FROM public.retros r
    JOIN public.team_members tm ON r.team_id = tm.team_id
    WHERE r.id = r_id AND tm.user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Allow if user is explicitly listed as a participant (for guests or non-team members)
  IF EXISTS (
    SELECT 1 FROM public.retro_participants
    WHERE retro_id = r_id AND user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Update Policy
DROP POLICY IF EXISTS "Participants can view other participants" ON public.retro_participants;
DROP POLICY IF EXISTS "Anyone can join as participant" ON public.retro_participants;

CREATE POLICY "Users can view participants" ON public.retro_participants FOR SELECT USING (
  public.can_view_participants(retro_id)
);

-- Re-add the insert policy (simplified for now, as we use RPC for joining usually, but good to have)
CREATE POLICY "Users can insert participants" ON public.retro_participants FOR INSERT WITH CHECK (
  -- Allow if user is a team member
  EXISTS (
    SELECT 1
    FROM public.retros r
    JOIN public.team_members tm ON r.team_id = tm.team_id
    WHERE r.id = retro_id AND tm.user_id = auth.uid()
  )
);
