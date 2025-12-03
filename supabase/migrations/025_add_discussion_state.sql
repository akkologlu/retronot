-- Add current_discussion_card_id to retros table
ALTER TABLE public.retros ADD COLUMN current_discussion_card_id UUID REFERENCES public.retro_cards(id) ON DELETE SET NULL;
