-- Migration 048 dropped "Participants can view action items" and replaced it with
-- a team-members-only policy. Retro participants who are not team members
-- (invited via retro link) and retros without a team lost realtime + query access.
-- Postgres OR-s multiple permissive SELECT policies, so adding this back
-- restores visibility for live session participants without removing team access.

CREATE POLICY "Participants can view action items" ON public.action_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.retro_participants rp
      WHERE rp.retro_id = action_items.retro_id
        AND rp.user_id = auth.uid()
    )
  );
