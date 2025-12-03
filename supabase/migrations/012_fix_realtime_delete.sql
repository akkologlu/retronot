-- Enable REPLICA IDENTITY FULL for tables used in Realtime with filters.
-- This ensures that DELETE events contain the full row data (including retro_id),
-- allowing the client-side subscription filter (retro_id=eq.xyz) to work correctly.

ALTER TABLE public.retro_cards REPLICA IDENTITY FULL;
ALTER TABLE public.retro_participants REPLICA IDENTITY FULL;
ALTER TABLE public.retro_groups REPLICA IDENTITY FULL;
ALTER TABLE public.retro_votes REPLICA IDENTITY FULL;
ALTER TABLE public.action_items REPLICA IDENTITY FULL;
