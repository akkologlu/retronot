-- Migration 035 blocked all card SELECTs during write phase, which broke
-- realtime delivery for all participants (Supabase filters events via RLS).
-- Anonymization is handled in the UI (blurred cards for other authors).
-- This migration replaces the policy to allow any participant to see all cards.

DROP POLICY IF EXISTS "Participants can view cards" ON public.retro_cards;

CREATE POLICY "Participants can view cards" ON public.retro_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM retro_participants rp
      WHERE rp.retro_id = retro_cards.retro_id
        AND rp.user_id = auth.uid()
    )
  );
