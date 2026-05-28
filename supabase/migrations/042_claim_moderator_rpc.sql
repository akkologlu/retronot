-- Any retro participant can claim moderator role.
-- Uses SECURITY DEFINER to bypass RLS (which only allows team members to update retros).
CREATE OR REPLACE FUNCTION public.claim_moderator(p_retro_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.retro_participants
    WHERE retro_id = p_retro_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  UPDATE public.retros
  SET moderator_id = auth.uid()
  WHERE id = p_retro_id
    AND (moderator_id IS DISTINCT FROM auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_moderator(uuid) TO authenticated;
