-- Add card_id to action_items table
ALTER TABLE public.action_items ADD COLUMN card_id UUID REFERENCES public.retro_cards(id) ON DELETE CASCADE;
