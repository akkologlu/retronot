-- Allow users to join a team directly from a retro link.
-- This supports two flows:
--   1) Direct retro URL shared via browser → check_retro_access + join_team_via_retro
--   2) Fix invite flow → recreate join_team_via_invite with consistent param name

-- ============================================================
-- 1. Recreate join_team_via_invite with p_token param name
--    (matches the TypeScript types that the app already uses)
-- ============================================================
DROP FUNCTION IF EXISTS public.join_team_via_invite(TEXT);

CREATE OR REPLACE FUNCTION public.join_team_via_invite(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT team_id INTO v_team_id
  FROM public.invite_links
  WHERE token = p_token
    AND (expires_at IS NULL OR expires_at > now());

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite token';
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'member')
  ON CONFLICT (team_id, user_id) DO NOTHING;
END;
$$;

-- ============================================================
-- 2. check_retro_access — lets us check if a retro exists and
--    whether the current user is a team member, bypassing RLS.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_retro_access(p_retro_id UUID)
RETURNS TABLE(
  team_id UUID,
  team_name TEXT,
  retro_name TEXT,
  is_team_member BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.team_id,
    t.name::TEXT AS team_name,
    r.name::TEXT AS retro_name,
    EXISTS(
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = r.team_id AND tm.user_id = auth.uid()
    ) AS is_team_member
  FROM public.retros r
  JOIN public.teams t ON t.id = r.team_id
  WHERE r.id = p_retro_id;
END;
$$;

-- ============================================================
-- 3. join_team_via_retro — adds user to team + participants
--    when they access a retro URL directly.
-- ============================================================
CREATE OR REPLACE FUNCTION public.join_team_via_retro(p_retro_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT team_id INTO v_team_id
  FROM public.retros
  WHERE id = p_retro_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Retro not found';
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'member')
  ON CONFLICT (team_id, user_id) DO NOTHING;

  INSERT INTO public.retro_participants (retro_id, user_id, online)
  VALUES (p_retro_id, v_user_id, true)
  ON CONFLICT (retro_id, user_id) DO NOTHING;
END;
$$;
