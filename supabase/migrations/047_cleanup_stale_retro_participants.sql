-- One-time cleanup: remove retro_participants rows for users
-- who are no longer members of the team that owns the retro.
-- Guest participants (user_id IS NULL) are preserved.
DELETE FROM public.retro_participants rp
USING public.retros r
WHERE rp.retro_id = r.id
  AND rp.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = r.team_id
      AND tm.user_id = rp.user_id
  );
