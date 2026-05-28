-- Add author self-reveal to retro_cards (Anonymity Gradient feature)
ALTER TABLE public.retro_cards
  ADD COLUMN IF NOT EXISTS author_revealed BOOLEAN DEFAULT false NOT NULL;

-- Allow card author to flip their own reveal flag
-- Existing write-phase RLS is too restrictive after write phase ends,
-- so we use a phase-agnostic policy scoped to the author_id field.
DROP POLICY IF EXISTS "Author can reveal card" ON public.retro_cards;
CREATE POLICY "Author can reveal card" ON public.retro_cards
  FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
