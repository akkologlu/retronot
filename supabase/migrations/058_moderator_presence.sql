-- Moderator handover based on a server-side heartbeat.
--
-- Before: claim_moderator treated a NULL moderator_id as "no moderator" (the app
-- treats it as created_by), and judged the moderator online by
-- retro_participants.online, which is never set to false. Team members could
-- also change moderator_id directly through the retros UPDATE policy.

-- 1. Heartbeats. Written only through the functions below, never directly, and
--    kept out of the realtime publication so beats do not reach every client.
CREATE TABLE IF NOT EXISTS public.retro_presence (
  retro_id uuid NOT NULL REFERENCES public.retros(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (retro_id, user_id)
);

ALTER TABLE public.retro_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.retro_presence FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_participant(p_retro_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.retro_participants
    WHERE retro_id = p_retro_id AND user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.retro_presence (retro_id, user_id, last_seen_at)
  VALUES (p_retro_id, auth.uid(), now())
  ON CONFLICT (retro_id, user_id) DO UPDATE SET last_seen_at = now();
END;
$$;

-- Called when the page closes, so a handover does not wait for the heartbeat to expire.
CREATE OR REPLACE FUNCTION public.mark_participant_away(p_retro_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.retro_presence
  WHERE retro_id = p_retro_id AND user_id = auth.uid();
$$;

-- 2. The moderator is COALESCE(moderator_id, created_by), as everywhere in the app,
--    and counts as present while their heartbeat is younger than 90 seconds.
--    90s survives background tabs, whose timers browsers throttle to once a minute.
CREATE OR REPLACE FUNCTION public.claim_moderator(p_retro_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moderator uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.retro_participants
    WHERE retro_id = p_retro_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  SELECT COALESCE(moderator_id, created_by) INTO v_moderator
  FROM public.retros
  WHERE id = p_retro_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retro not found';
  END IF;

  IF v_moderator = auth.uid() THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.retro_presence
    WHERE retro_id = p_retro_id
      AND user_id = v_moderator
      AND last_seen_at > now() - interval '90 seconds'
  ) THEN
    RAISE EXCEPTION 'A moderator is already active';
  END IF;

  UPDATE public.retros SET moderator_id = auth.uid() WHERE id = p_retro_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_moderator(p_retro_id uuid, p_new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moderator uuid;
BEGIN
  SELECT COALESCE(moderator_id, created_by) INTO v_moderator
  FROM public.retros
  WHERE id = p_retro_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retro not found';
  END IF;

  IF v_moderator IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.retro_participants
    WHERE retro_id = p_retro_id AND user_id = p_new_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a retro participant';
  END IF;

  UPDATE public.retros SET moderator_id = p_new_user_id WHERE id = p_retro_id;
END;
$$;

-- 3. moderator_id changes only through the functions above. They run as their
--    owner, so current_user is only a client role when the change comes straight
--    from the API. This trigger function must stay SECURITY INVOKER.
CREATE OR REPLACE FUNCTION public.guard_moderator_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.moderator_id IS DISTINCT FROM OLD.moderator_id
     AND current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'moderator_id can only be changed through claim_moderator or transfer_moderator'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_moderator_id ON public.retros;
CREATE TRIGGER guard_moderator_id
  BEFORE UPDATE OF moderator_id ON public.retros
  FOR EACH ROW EXECUTE FUNCTION public.guard_moderator_id();

REVOKE ALL ON FUNCTION public.touch_participant(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_participant_away(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_moderator(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_moderator(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_participant_away(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_moderator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_moderator(uuid, uuid) TO authenticated;
