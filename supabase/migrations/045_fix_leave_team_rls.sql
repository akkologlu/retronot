-- Allow members to delete their own team_members row (leave team).
-- The server action already blocks owners from leaving via application logic.
CREATE POLICY "Members can leave team" ON public.team_members
  FOR DELETE USING (
    user_id = auth.uid()
    AND auth.uid() != (SELECT owner_id FROM public.teams WHERE id = team_id)
  );
