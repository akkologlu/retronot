-- 1. New 'review' phase: open action items from the previous retro are reviewed
--    between lobby and write.
ALTER TABLE public.retros DROP CONSTRAINT IF EXISTS retros_phase_check;
ALTER TABLE public.retros ADD CONSTRAINT retros_phase_check
  CHECK (phase IN ('lobby', 'review', 'write', 'group', 'vote', 'discuss', 'summary'));

-- 2. Only the retro moderator can add or delete action items.
--    Policy names differ between the incremental and baseline setups, so drop by command.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'action_items'
      AND cmd IN ('INSERT', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.action_items', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Moderators can create action items" ON public.action_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.retros r
      WHERE r.id = action_items.retro_id
        AND COALESCE(r.moderator_id, r.created_by) = auth.uid()
    )
  );

CREATE POLICY "Moderators can delete action items" ON public.action_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.retros r
      WHERE r.id = action_items.retro_id
        AND COALESCE(r.moderator_id, r.created_by) = auth.uid()
    )
  );
