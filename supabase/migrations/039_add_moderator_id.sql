-- Support moderator transfer (defaults to created_by)
ALTER TABLE public.retros ADD COLUMN moderator_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Backfill: set moderator_id = created_by for existing retros
UPDATE public.retros SET moderator_id = created_by WHERE moderator_id IS NULL;
