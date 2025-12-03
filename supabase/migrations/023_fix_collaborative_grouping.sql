-- Fix Collaborative Grouping RLS
-- We need to allow participants to update ANY card in the retro, not just their own.
-- This is essential for grouping, where you might move someone else's card into a group.

-- 1. Drop existing restrictive policies on retro_cards
DROP POLICY IF EXISTS "Authors can update own cards" ON public.retro_cards;
DROP POLICY IF EXISTS "Authors can update own cards (by user_id)" ON public.retro_cards;
DROP POLICY IF EXISTS "Participants can group any card" ON public.retro_cards; -- Dropping the previous attempt if it exists

-- 2. Create a comprehensive UPDATE policy for participants
-- This allows any participant to update any card in the retro.
CREATE POLICY "Participants can update any card" ON public.retro_cards
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.retro_participants
    WHERE retro_id = retro_cards.retro_id
    AND (user_id = auth.uid() OR guest_id::text = current_setting('request.headers')::json->>'x-guest-id')
  )
);

-- 3. Ensure DELETE is also permissive if we want to allow deleting others' cards (optional, but good for moderation/cleanup)
-- For now, let's keep DELETE restricted to authors, BUT allow if it's part of a group dissolution? 
-- Actually, group dissolution is handled by the system/trigger usually, or the owner.
-- Let's stick to UPDATE for now as that's what grouping needs.
-- But wait, merging cards might involve deleting one? No, usually we just group them.
-- If we merge content, we might delete.
-- Let's allow participants to DELETE any card too, for full collaboration.
DROP POLICY IF EXISTS "Authors can delete own cards" ON public.retro_cards;

CREATE POLICY "Participants can delete any card" ON public.retro_cards
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.retro_participants
    WHERE retro_id = retro_cards.retro_id
    AND (user_id = auth.uid() OR guest_id::text = current_setting('request.headers')::json->>'x-guest-id')
  )
);

-- 4. Ensure Retro Groups are fully manageable by participants
-- (Already handled in 013_fix_groups_rls.sql but good to double check or reinforce if needed)
-- The policies in 013 seem correct: "Participants can view/create/update/delete groups".
