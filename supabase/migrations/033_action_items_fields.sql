-- Add assignee, due date, and author tracking to action items
ALTER TABLE public.action_items
  ADD COLUMN assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN due_date DATE,
  ADD COLUMN created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_action_items_assigned ON public.action_items(assigned_to_user_id)
  WHERE assigned_to_user_id IS NOT NULL;

-- Allow participants to update action items (assignee, completion, due date)
DROP POLICY IF EXISTS "Participants can update action items" ON public.action_items;
CREATE POLICY "Participants can update action items" ON public.action_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.retro_participants rp
      WHERE rp.retro_id = action_items.retro_id
        AND rp.user_id = auth.uid()
    )
  );
