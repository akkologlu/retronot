-- Fix Duplicate Participants
-- Add a unique constraint to ensure a user can only be a participant once per retro.

-- 1. Clean up duplicates (keep the most recent one)
DELETE FROM public.retro_participants a USING (
  SELECT min(ctid) as ctid, retro_id, user_id
  FROM public.retro_participants
  WHERE user_id IS NOT NULL
  GROUP BY retro_id, user_id HAVING COUNT(*) > 1
) b
WHERE a.retro_id = b.retro_id
AND a.user_id = b.user_id
AND a.ctid <> b.ctid;

-- 2. Add Unique Constraint
ALTER TABLE public.retro_participants
ADD CONSTRAINT retro_participants_retro_id_user_id_key UNIQUE (retro_id, user_id);
