-- Add carryover tracking to action items
ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS carried_over_from UUID REFERENCES public.action_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_action_items_carryover ON public.action_items(carried_over_from)
  WHERE carried_over_from IS NOT NULL;
