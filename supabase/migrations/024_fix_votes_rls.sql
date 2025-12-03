-- Fix RLS policies for retro_votes
-- Previously, RLS was enabled but no policies were defined, blocking all access.

-- 1. Allow participants to view votes in their retro
CREATE POLICY "Participants can view votes" ON public.retro_votes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.retro_participants rp
    WHERE rp.retro_id = retro_votes.retro_id
    AND (rp.user_id = auth.uid())
  )
);

-- 2. Allow participants to insert their own votes
CREATE POLICY "Participants can vote" ON public.retro_votes
FOR INSERT WITH CHECK (
  -- Ensure the participant_id belongs to the current user
  participant_id IN (
    SELECT id FROM public.retro_participants
    WHERE user_id = auth.uid()
  )
  -- AND ensure the retro_id matches the participant's retro (integrity check)
  AND EXISTS (
    SELECT 1 FROM public.retro_participants rp
    WHERE rp.id = participant_id
    AND rp.retro_id = retro_id
  )
);

-- 3. Allow participants to retract (delete) their own votes
CREATE POLICY "Participants can retract votes" ON public.retro_votes
FOR DELETE USING (
  participant_id IN (
    SELECT id FROM public.retro_participants
    WHERE user_id = auth.uid()
  )
);
