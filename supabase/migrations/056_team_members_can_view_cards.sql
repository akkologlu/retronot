-- The dashboard and lobby now show the source card content next to each
-- action item. Card SELECT is currently limited to retro_participants
-- (migration 041), but action_items are already visible to all team members
-- regardless of participation (migration 044/052). Without this, joining
-- action_items -> retro_cards silently returns null cards for team members
-- who didn't join that particular retro session.
-- Postgres OR-s multiple permissive SELECT policies, so this adds coverage
-- without touching the existing participant-based policy.

CREATE POLICY "Team members can view cards" ON public.retro_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.retros r
      INNER JOIN public.team_members tm ON tm.team_id = r.team_id
      WHERE r.id = retro_cards.retro_id
        AND tm.user_id = auth.uid()
    )
  );
