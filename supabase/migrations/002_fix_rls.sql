-- Fix infinite recursion in team_members policy

-- 1. Drop the problematic policy
DROP POLICY IF EXISTS "Members can view team members" ON public.team_members;

-- 2. Create a security definer function to bypass RLS for membership check
-- This function runs with the privileges of the creator (postgres), avoiding the recursion loop.
CREATE OR REPLACE FUNCTION public.get_user_team_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid();
$$;

-- 3. Re-create the SELECT policy using the function
CREATE POLICY "Members can view team members" ON public.team_members
FOR SELECT USING (
  team_id IN (SELECT public.get_user_team_ids())
);

-- 4. Add INSERT policy for Team Owners (so they can add members)
-- This was missing and is required for creating teams (adding self) and inviting others.
CREATE POLICY "Owners can add members" ON public.team_members
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);

-- 5. Add DELETE policy for Team Owners
CREATE POLICY "Owners can remove members" ON public.team_members
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);
