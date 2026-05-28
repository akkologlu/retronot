-- Refresh realtime publication for retro_cards to ensure the author_revealed
-- column (added in 050) is included in postgres_changes payloads.
-- Same pattern used in migration 028 for action_items.
ALTER PUBLICATION supabase_realtime DROP TABLE public.retro_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_cards;
