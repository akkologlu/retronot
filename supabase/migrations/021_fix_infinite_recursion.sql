-- Migration 021: Fix Infinite Recursion in RLS
-- We use a SECURITY DEFINER function to check membership without triggering RLS recursively.

-- 1. Create helper function
CREATE OR REPLACE FUNCTION public.is_team_member(lookup_team_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.team_members 
    WHERE team_id = lookup_team_id 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update team_members policy
DROP POLICY IF EXISTS "Members can view team members" ON public.team_members;

CREATE POLICY "Members can view team members" ON public.team_members FOR SELECT USING (
  user_id = auth.uid() OR -- Can view own membership
  public.is_team_member(team_id) -- Can view members of teams I belong to
);

-- 3. Update teams policy (optional but good for consistency)
DROP POLICY IF EXISTS "Members and owners can view teams" ON public.teams;

CREATE POLICY "Members and owners can view teams" ON public.teams FOR SELECT USING (
  auth.uid() = owner_id OR
  public.is_team_member(id)
);
