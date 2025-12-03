-- Migration 022: Robust Retro Creation Policy
-- Use a SECURITY DEFINER function to check permissions for creating a retro.
-- This bypasses RLS on 'teams' and 'team_members' during the check, preventing recursion and access errors.

-- 1. Create the helper function
CREATE OR REPLACE FUNCTION public.can_create_retro(target_team_id uuid)
RETURNS boolean AS $$
BEGIN
  -- 1. Allow if user is the Team Owner
  IF EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = target_team_id 
    AND owner_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  -- 2. Allow if user is a Team Member
  IF EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = target_team_id 
    AND user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the Retros Policy
DROP POLICY IF EXISTS "Team members and owners can create retros" ON public.retros;
DROP POLICY IF EXISTS "Team members can create retros" ON public.retros;

CREATE POLICY "Users can create retros for their teams" ON public.retros
FOR INSERT WITH CHECK (
  public.can_create_retro(team_id)
);

-- 3. Ensure Select Policy is also robust (using the function from 021 or similar logic)
-- We'll leave the select policy as is for now if it works, or update it to use the new function too.
-- Let's update it to be safe.
DROP POLICY IF EXISTS "Team members can view retros" ON public.retros;

CREATE POLICY "Team members can view retros" ON public.retros
FOR SELECT USING (
  public.can_create_retro(team_id)
);
