-- Migration 020: Fix Teams and Members RLS to allow Retro Creation checks
-- The "retros" INSERT policy checks "teams" and "team_members". 
-- If the user cannot SELECT from those tables due to their own RLS policies, the check fails.

-- 1. Update TEAMS policy to explicitly allow owners to view
DROP POLICY IF EXISTS "Members can view teams" ON public.teams;
CREATE POLICY "Members and owners can view teams" ON public.teams FOR SELECT USING (
  auth.uid() = owner_id OR
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
);

-- 2. Update TEAM MEMBERS policy to explicitly allow users to view their own membership
DROP POLICY IF EXISTS "Members can view team members" ON public.team_members;
CREATE POLICY "Members can view team members" ON public.team_members FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid())
);

-- 3. Ensure RETROS policy is correct (re-applying from 019 just in case)
DROP POLICY IF EXISTS "Team members and owners can create retros" ON public.retros;
CREATE POLICY "Team members and owners can create retros" ON public.retros
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = retros.team_id 
    AND user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = retros.team_id
    AND owner_id = auth.uid()
  )
);
