-- Enforce vote limit at DB level to prevent client-side bypass
CREATE OR REPLACE FUNCTION public.check_vote_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vote_lim INT;
  current_votes INT;
BEGIN
  SELECT COALESCE((config->>'voteLimit')::int, 5) INTO vote_lim
    FROM public.retros WHERE id = NEW.retro_id;

  SELECT COUNT(*) INTO current_votes
    FROM public.retro_votes
    WHERE retro_id = NEW.retro_id AND participant_id = NEW.participant_id;

  IF current_votes >= vote_lim THEN
    RAISE EXCEPTION 'Vote limit exceeded (limit: %)', vote_lim;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_vote_limit ON public.retro_votes;
CREATE TRIGGER enforce_vote_limit
  BEFORE INSERT ON public.retro_votes
  FOR EACH ROW EXECUTE FUNCTION public.check_vote_limit();
