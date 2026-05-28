-- Hide other users' cards during write phase (true anonymity)
DROP POLICY IF EXISTS "Participants can view cards" ON public.retro_cards;

CREATE POLICY "Participants can view cards" ON public.retro_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.retro_participants rp
      WHERE rp.retro_id = retro_cards.retro_id
        AND rp.user_id = auth.uid()
    )
    AND (
      author_id = auth.uid()
      OR (
        SELECT phase FROM public.retros WHERE id = retro_cards.retro_id
      ) <> 'write'
    )
  );
