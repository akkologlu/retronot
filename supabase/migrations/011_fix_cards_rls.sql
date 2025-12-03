-- Fix Retro Cards RLS
-- 1. Add DELETE policy (missing)
-- 2. Update UPDATE policy to check author_id (since we use that for auth users)

-- Drop existing restrictive policies if needed, or just add new ones.
-- The existing "Authors can update own cards" uses participant_id.
-- We will add a new one for author_id.

CREATE POLICY "Authors can delete own cards" ON public.retro_cards FOR DELETE USING (
  author_id = auth.uid()
);

CREATE POLICY "Authors can update own cards (by user_id)" ON public.retro_cards FOR UPDATE USING (
  author_id = auth.uid()
);

-- Also ensure we can insert. The existing policy checks if user is a participant.
-- That is fine.
