-- Add soft-delete support to retros
ALTER TABLE public.retros ADD COLUMN archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_retros_archived_at ON public.retros(archived_at) WHERE archived_at IS NOT NULL;
