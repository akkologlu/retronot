-- Track exact time each phase started (for countdown timers)
ALTER TABLE public.retros ADD COLUMN phase_started_at TIMESTAMPTZ;
