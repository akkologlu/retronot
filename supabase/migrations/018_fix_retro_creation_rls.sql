-- Fix RLS policy for creating retros
-- Allow team owners to create retros even if they are not explicitly in team_members (though they should be)
-- Or just ensure the policy covers the owner case explicitly.

DROP POLICY IF EXISTS "Team members can create retros" ON public.retros;

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
