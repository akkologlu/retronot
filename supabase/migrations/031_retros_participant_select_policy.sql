-- Retro participants (non-team-members) must be able to SELECT their retro row.
-- Without this, Supabase Realtime filters out retros UPDATE events for them,
-- so phase changes never reach invited participants in the lobby.

CREATE POLICY "Retro participants can view retro" ON public.retros
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.retro_participants rp
      WHERE rp.retro_id = retros.id
        AND rp.user_id = auth.uid()
    )
  );
