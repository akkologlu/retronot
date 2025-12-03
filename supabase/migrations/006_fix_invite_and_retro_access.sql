-- Fix Invite Flow and Retro Access

-- 1. Create a secure function to join a team via invite token
-- This is necessary because normal users cannot INSERT into team_members (only owners can).
-- This function runs as SECURITY DEFINER (admin privileges) to bypass that restriction,
-- but strictly validates the token first.

CREATE OR REPLACE FUNCTION public.join_team_via_invite(invite_token TEXT)
RETURNS UUID -- Returns the team_id joined
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate token and get team_id
  SELECT team_id INTO v_team_id
  FROM public.invite_links
  WHERE token = invite_token
    AND (expires_at IS NULL OR expires_at > now());

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite token';
  END IF;

  -- Add user to team (idempotent)
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'member')
  ON CONFLICT (team_id, user_id) DO NOTHING;

  RETURN v_team_id;
END;
$$;

-- 2. Update Retros RLS to allow Participants (Guests & Members) to view
-- This fixes the "Retro not found" error for users who are participants but maybe not fully synced members,
-- or for guests if we enable guest access later.

DROP POLICY IF EXISTS "Team members can view retros" ON public.retros;

CREATE POLICY "Team members and participants can view retros" ON public.retros FOR SELECT USING (
  -- User is a team member
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = retros.team_id AND user_id = auth.uid())
  OR
  -- User is a participant (auth user)
  EXISTS (SELECT 1 FROM public.retro_participants WHERE retro_id = retros.id AND user_id = auth.uid())
);
