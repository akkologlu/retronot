-- Force add retro_groups to realtime publication
-- This is to ensure that even if it was missed or removed, it is added back.
-- We use a DO block to avoid error if it's already there (though simple SQL might error, 
-- usually ALTER PUBLICATION ... ADD TABLE is safe to run if we catch the error or if we don't care about the error in migration tool).
-- Actually, Supabase migrations usually stop on error. 
-- The safest way is to drop and re-add or just try to add.

-- Since we can't easily check membership in standard SQL without querying pg_publication_tables,
-- we will try to add it. If it fails, it means it's already there.
-- But to be safe and avoid migration failure, we can use a PL/pgSQL block.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'retro_groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_groups;
  END IF;
END
$$;
