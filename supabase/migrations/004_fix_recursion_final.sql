-- Final fix for infinite recursion
-- The issue is a cycle: team_members INSERT -> teams SELECT (RLS) -> team_members SELECT (RLS)

-- 1. Create a helper function to check team ownership securely (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_team_owner(t_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = t_id AND owner_id = auth.uid());
$$;

-- 2. Drop existing policies on team_members that might cause recursion
DROP POLICY IF EXISTS "Owners can add members" ON public.team_members;
DROP POLICY IF EXISTS "Owners can remove members" ON public.team_members;

-- 3. Re-create policies using the secure function
-- This avoids querying the 'teams' table directly in the policy, preventing the RLS cycle.

CREATE POLICY "Owners can add members" ON public.team_members
FOR INSERT WITH CHECK (
  public.is_team_owner(team_id)
);

CREATE POLICY "Owners can remove members" ON public.team_members
FOR DELETE USING (
  public.is_team_owner(team_id)
);

-- 4. Ensure the SELECT policy is also using the secure function from 002
-- (Just in case 002 wasn't run or needs a refresh)
DROP POLICY IF EXISTS "Members can view team members" ON public.team_members;

CREATE OR REPLACE FUNCTION public.get_user_team_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid();
$$;

CREATE POLICY "Members can view team members" ON public.team_members
FOR SELECT USING (
  team_id IN (SELECT public.get_user_team_ids())
);
