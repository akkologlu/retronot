-- Migration 019: Fix Team Members and RLS
-- 1. Ensure all team owners are in team_members
INSERT INTO public.team_members (team_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members tm WHERE tm.team_id = t.id AND tm.user_id = t.owner_id
);

-- 2. Ensure public.users exists for the auth user (idempotent-ish via ON CONFLICT if we could, but we can't easily access auth.users here without security definer)
-- We'll skip this for now as RLS is the main error.

-- 3. Re-apply the RLS policy for retros to be absolutely sure
DROP POLICY IF EXISTS "Team members can create retros" ON public.retros;
DROP POLICY IF EXISTS "Team members and owners can create retros" ON public.retros;

CREATE POLICY "Team members and owners can create retros" ON public.retros
FOR INSERT WITH CHECK (
  -- User is a member
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = retros.team_id 
    AND user_id = auth.uid()
  )
  OR
  -- User is the owner (direct check on teams table)
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = retros.team_id
    AND owner_id = auth.uid()
  )
);

-- 4. Grant permissions just in case (usually not needed for service role but good for explicit)
GRANT ALL ON public.retros TO authenticated;
GRANT ALL ON public.retro_participants TO authenticated;
