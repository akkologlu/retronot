-- Allow participants to rename groups
DROP POLICY IF EXISTS "Participants can update groups" ON public.retro_groups;

CREATE POLICY "Participants can update groups" ON public.retro_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.retro_participants rp
      WHERE rp.retro_id = retro_groups.retro_id
        AND rp.user_id = auth.uid()
    )
  );
