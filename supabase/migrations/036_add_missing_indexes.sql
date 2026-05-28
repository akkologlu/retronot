-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_retro_votes_retro_participant
  ON public.retro_votes(retro_id, participant_id);

CREATE INDEX IF NOT EXISTS idx_retro_cards_retro_group
  ON public.retro_cards(retro_id, group_id);

CREATE INDEX IF NOT EXISTS idx_action_items_retro_card
  ON public.action_items(retro_id, card_id);

CREATE INDEX IF NOT EXISTS idx_retros_team_created
  ON public.retros(team_id, created_at DESC);
