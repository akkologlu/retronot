-- When a user leaves a team, remove their retro_participants rows
-- for all retros belonging to that team.
CREATE OR REPLACE FUNCTION public.cleanup_retro_participants_on_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.retro_participants rp
  USING public.retros r
  WHERE rp.retro_id = r.id
    AND r.team_id = OLD.team_id
    AND rp.user_id = OLD.user_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cleanup_retro_participants_on_leave
  AFTER DELETE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_retro_participants_on_leave();
