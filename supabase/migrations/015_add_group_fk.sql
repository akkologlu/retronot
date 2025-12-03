-- Add Foreign Key constraint to retro_cards.group_id
-- This ensures that if a group is deleted, the cards are automatically ungrouped (set to NULL)
-- preventing orphaned cards pointing to non-existent groups.

ALTER TABLE public.retro_cards
ADD CONSTRAINT fk_retro_cards_group
FOREIGN KEY (group_id)
REFERENCES public.retro_groups(id)
ON DELETE SET NULL;
