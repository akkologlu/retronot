-- Team members should see all action items for their team's retros,
-- not just retros they participated in. Add separate policies for this.

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

DROP POLICY IF EXISTS "Team members can update action items" ON public.action_items;
CREATE POLICY "Team members can update action items" ON public.action_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.retros r
      INNER JOIN public.team_members tm ON tm.team_id = r.team_id
      WHERE r.id = action_items.retro_id
        AND tm.user_id = auth.uid()
    )
  );
