-- Refresh realtime publication for action_items to ensure new columns are picked up
ALTER PUBLICATION supabase_realtime DROP TABLE public.action_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_items;
