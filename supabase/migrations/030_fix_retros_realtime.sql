-- Ensure retros table broadcasts UPDATE events via Supabase Realtime.
-- REPLICA IDENTITY FULL is required for column-level filters (id=eq.X) to work.

ALTER TABLE public.retros REPLICA IDENTITY FULL;

-- Idempotent: add to publication only if not already a member
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'retros'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.retros;
  END IF;
END $$;
