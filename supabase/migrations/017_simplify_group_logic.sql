-- Migration 017: Simplify Group Logic with Triggers
-- This migration moves the group dissolution logic to the database.

-- 1. Ensure FK Constraint exists (Idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_retro_cards_group'
  ) THEN
    ALTER TABLE public.retro_cards
    ADD CONSTRAINT fk_retro_cards_group
    FOREIGN KEY (group_id)
    REFERENCES public.retro_groups(id)
    ON DELETE SET NULL;
  END IF;
END
$$;

-- 2. Create Function to Handle Group Dissolution
CREATE OR REPLACE FUNCTION public.handle_group_dissolution()
RETURNS TRIGGER AS $$
DECLARE
  group_card_count INTEGER;
BEGIN
  -- Check the group that was just affected (OLD.group_id for DELETE/UPDATE, NEW.group_id for INSERT/UPDATE)
  -- Actually, we only care when a card leaves a group (UPDATE or DELETE)
  
  IF (TG_OP = 'UPDATE' AND OLD.group_id IS NOT NULL) THEN
    -- Check how many cards are left in the OLD group
    SELECT count(*) INTO group_card_count FROM public.retro_cards WHERE group_id = OLD.group_id;
    
    -- If 1 or 0 cards left, dissolve the group
    IF group_card_count <= 1 THEN
      -- 1. Ungroup remaining cards (if any)
      UPDATE public.retro_cards SET group_id = NULL WHERE group_id = OLD.group_id;
      -- 2. Delete the group
      DELETE FROM public.retro_groups WHERE id = OLD.group_id;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE' AND OLD.group_id IS NOT NULL) THEN
     -- Similar logic for DELETE
    SELECT count(*) INTO group_card_count FROM public.retro_cards WHERE group_id = OLD.group_id;
    
    IF group_card_count <= 1 THEN
      UPDATE public.retro_cards SET group_id = NULL WHERE group_id = OLD.group_id;
      DELETE FROM public.retro_groups WHERE id = OLD.group_id;
    END IF;
  END IF;

  RETURN NULL; -- Trigger is AFTER, so return value doesn't matter
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger on retro_cards
DROP TRIGGER IF EXISTS on_group_dissolution ON public.retro_cards;

CREATE TRIGGER on_group_dissolution
AFTER UPDATE OR DELETE ON public.retro_cards
FOR EACH ROW
EXECUTE FUNCTION public.handle_group_dissolution();
