-- Fix Realtime Publication and Add Indexes for Performance

-- 1. Ensure retro_groups is in the publication (idempotent check not available in simple SQL, assuming it might be there)
-- ERROR: relation "retro_groups" is already member of publication "supabase_realtime"
-- Commenting out as it seems it was already added in initial schema.
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_groups;

-- 2. Add Indexes to improve RLS performance
-- RLS policies often check retro_participants for membership.
-- Without indexes, these checks can be slow, potentially causing Realtime to time out or fail.

CREATE INDEX IF NOT EXISTS idx_retro_participants_retro_id ON public.retro_participants(retro_id);
CREATE INDEX IF NOT EXISTS idx_retro_participants_user_id ON public.retro_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_retro_participants_guest_id ON public.retro_participants(guest_id);

CREATE INDEX IF NOT EXISTS idx_retro_cards_retro_id ON public.retro_cards(retro_id);
CREATE INDEX IF NOT EXISTS idx_retro_groups_retro_id ON public.retro_groups(retro_id);

-- 3. Ensure REPLICA IDENTITY is FULL for retro_groups (redundant but safe)
ALTER TABLE public.retro_groups REPLICA IDENTITY FULL;
