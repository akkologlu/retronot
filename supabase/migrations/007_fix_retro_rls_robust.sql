-- Robust Fix for Retro Access
-- The previous RLS policy might be failing due to nested RLS checks or recursion limits.
-- This approach uses a SECURITY DEFINER function to check access directly, bypassing RLS on joined tables.

-- 1. Create a helper function to check retro access
CREATE OR REPLACE FUNCTION public.can_view_retro(r_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check if user is a member of the team that owns the retro
  -- OR if the user is a participant in the retro
  RETURN EXISTS (
    SELECT 1
    FROM public.retros r
    LEFT JOIN public.team_members tm ON r.team_id = tm.team_id AND tm.user_id = auth.uid()
    LEFT JOIN public.retro_participants rp ON r.id = rp.retro_id AND rp.user_id = auth.uid()
    WHERE r.id = r_id
    AND (tm.team_id IS NOT NULL OR rp.id IS NOT NULL)
  );
END;
$$;

-- 2. Update Retros RLS to use the secure function
DROP POLICY IF EXISTS "Team members and participants can view retros" ON public.retros;
DROP POLICY IF EXISTS "Team members can view retros" ON public.retros;

CREATE POLICY "Users can view accessible retros" ON public.retros FOR SELECT USING (
  public.can_view_retro(id)
);
