-- Fix: action items SELECT should be visible to all team members,
-- not just retro participants. Users who joined after a retro or were
-- cleaned up from retro_participants (see 047) would otherwise lose visibility.

DROP POLICY IF EXISTS "Participants can view action items" ON public.action_items;
DROP POLICY IF EXISTS "Team members can view action items" ON public.action_items;

CREATE POLICY "Team members can view action items" ON public.action_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.retros r
      INNER JOIN public.team_members tm ON tm.team_id = r.team_id
      WHERE r.id = action_items.retro_id
        AND tm.user_id = auth.uid()
    )
  );
