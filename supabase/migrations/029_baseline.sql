-- ============================================================
-- 029_baseline.sql — Consolidated schema (squash of 001–028)
-- Reference file for fresh database setup.
-- DO NOT apply on top of an existing database that already
-- has migrations 001–028 applied.
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.team_members (
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE public.retros (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  phase TEXT DEFAULT 'lobby' CHECK (phase IN ('lobby', 'write', 'group', 'vote', 'discuss', 'summary')),
  created_by UUID REFERENCES public.users(id),
  current_discussion_card_id UUID, -- set after retro_cards table created (FK added below)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.retro_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retro_id UUID REFERENCES public.retros(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  guest_name TEXT,
  guest_id UUID,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  online BOOLEAN DEFAULT false,
  CONSTRAINT retro_participants_retro_id_user_id_key UNIQUE (retro_id, user_id)
);

CREATE TABLE public.retro_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retro_id UUID REFERENCES public.retros(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.retro_cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retro_id UUID REFERENCES public.retros(id) ON DELETE CASCADE,
  author_id UUID,
  participant_id UUID REFERENCES public.retro_participants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  column_name TEXT NOT NULL,
  group_id UUID REFERENCES public.retro_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Back-fill FK on retros.current_discussion_card_id
ALTER TABLE public.retros
  ADD CONSTRAINT retros_current_discussion_card_id_fkey
  FOREIGN KEY (current_discussion_card_id)
  REFERENCES public.retro_cards(id)
  ON DELETE SET NULL;

CREATE TABLE public.retro_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retro_id UUID REFERENCES public.retros(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.retro_cards(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.retro_participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.action_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retro_id UUID REFERENCES public.retros(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.retro_cards(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE public.invite_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_retro_participants_retro_id ON public.retro_participants(retro_id);
CREATE INDEX IF NOT EXISTS idx_retro_participants_user_id  ON public.retro_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_retro_participants_guest_id ON public.retro_participants(guest_id);
CREATE INDEX IF NOT EXISTS idx_retro_cards_retro_id        ON public.retro_cards(retro_id);
CREATE INDEX IF NOT EXISTS idx_retro_groups_retro_id       ON public.retro_groups(retro_id);

-- ============================================================
-- REALTIME
-- ============================================================

ALTER TABLE public.retros           REPLICA IDENTITY FULL;
ALTER TABLE public.retro_participants REPLICA IDENTITY FULL;
ALTER TABLE public.retro_cards      REPLICA IDENTITY FULL;
ALTER TABLE public.retro_groups     REPLICA IDENTITY FULL;
ALTER TABLE public.retro_votes      REPLICA IDENTITY FULL;
ALTER TABLE public.action_items     REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.retros;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_items;

-- ============================================================
-- AUTH TRIGGER — sync auth.users → public.users
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER — bypass RLS safely)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_team_member(lookup_team_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = lookup_team_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_create_retro(target_team_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.teams WHERE id = target_team_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.team_members WHERE team_id = target_team_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.join_team_via_invite(invite_token TEXT)
RETURNS void AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT * INTO v_invite FROM public.invite_links
  WHERE token = invite_token
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite token';
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_invite.team_id, auth.uid(), 'member')
  ON CONFLICT (team_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retros            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retro_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retro_cards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retro_groups      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retro_votes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_links      ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- teams
CREATE POLICY "Members and owners can view teams" ON public.teams
  FOR SELECT USING (auth.uid() = owner_id OR public.is_team_member(id));
CREATE POLICY "Owners can update teams" ON public.teams
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- team_members
CREATE POLICY "Members can view team members" ON public.team_members
  FOR SELECT USING (user_id = auth.uid() OR public.is_team_member(team_id));
CREATE POLICY "Owners can add members" ON public.team_members
  FOR INSERT WITH CHECK (public.is_team_member(team_id) OR auth.uid() = (SELECT owner_id FROM public.teams WHERE id = team_id));
CREATE POLICY "Owners can remove members" ON public.team_members
  FOR DELETE USING (auth.uid() = (SELECT owner_id FROM public.teams WHERE id = team_id));

-- retros
CREATE POLICY "Team members can view retros" ON public.retros
  FOR SELECT USING (public.can_create_retro(team_id));
CREATE POLICY "Users can create retros for their teams" ON public.retros
  FOR INSERT WITH CHECK (public.can_create_retro(team_id));
CREATE POLICY "Team members can update retros" ON public.retros
  FOR UPDATE USING (public.can_create_retro(team_id));

-- retro_participants
CREATE POLICY "Participants can view other participants" ON public.retro_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.retro_participants rp
      WHERE rp.retro_id = retro_participants.retro_id
        AND (rp.user_id = auth.uid() OR rp.guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id')
    )
  );
CREATE POLICY "Users can join as participant" ON public.retro_participants
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Participants can update own record" ON public.retro_participants
  FOR UPDATE USING (user_id = auth.uid());

-- retro_cards
CREATE POLICY "Participants can view cards" ON public.retro_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.retro_participants rp
      WHERE rp.retro_id = retro_cards.retro_id
        AND (rp.user_id = auth.uid() OR rp.guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id')
    )
  );
CREATE POLICY "Participants can create cards" ON public.retro_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.retro_participants rp
      WHERE rp.retro_id = retro_cards.retro_id
        AND (rp.user_id = auth.uid() OR rp.guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id')
    )
  );
CREATE POLICY "Participants can update any card" ON public.retro_cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.retro_participants rp
      WHERE rp.retro_id = retro_cards.retro_id
        AND (rp.user_id = auth.uid() OR rp.guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id')
    )
  );
CREATE POLICY "Participants can delete any card" ON public.retro_cards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.retro_participants rp
      WHERE rp.retro_id = retro_cards.retro_id
        AND (rp.user_id = auth.uid() OR rp.guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id')
    )
  );

-- retro_groups
CREATE POLICY "Participants can view groups" ON public.retro_groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.retro_participants rp WHERE rp.retro_id = retro_groups.retro_id AND (rp.user_id = auth.uid()))
  );
CREATE POLICY "Participants can create groups" ON public.retro_groups
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.retro_participants rp WHERE rp.retro_id = retro_groups.retro_id AND (rp.user_id = auth.uid()))
  );
CREATE POLICY "Participants can update groups" ON public.retro_groups
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.retro_participants rp WHERE rp.retro_id = retro_groups.retro_id AND (rp.user_id = auth.uid()))
  );
CREATE POLICY "Participants can delete groups" ON public.retro_groups
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.retro_participants rp WHERE rp.retro_id = retro_groups.retro_id AND (rp.user_id = auth.uid()))
  );

-- retro_votes
CREATE POLICY "Participants can view votes" ON public.retro_votes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.retro_participants rp WHERE rp.retro_id = retro_votes.retro_id AND rp.user_id = auth.uid())
  );
CREATE POLICY "Participants can vote" ON public.retro_votes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.retro_participants rp WHERE rp.retro_id = retro_votes.retro_id AND rp.id = participant_id AND rp.user_id = auth.uid())
  );
CREATE POLICY "Participants can remove own votes" ON public.retro_votes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.retro_participants rp WHERE rp.id = participant_id AND rp.user_id = auth.uid())
  );

-- action_items
CREATE POLICY "Participants can view action items" ON public.action_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.retro_participants rp WHERE rp.retro_id = action_items.retro_id AND rp.user_id = auth.uid())
  );
CREATE POLICY "Participants can create action items" ON public.action_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.retro_participants rp WHERE rp.retro_id = action_items.retro_id AND rp.user_id = auth.uid())
  );
CREATE POLICY "Participants can update action items" ON public.action_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.retro_participants rp WHERE rp.retro_id = action_items.retro_id AND rp.user_id = auth.uid())
  );
CREATE POLICY "Participants can delete action items" ON public.action_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.retro_participants rp WHERE rp.retro_id = action_items.retro_id AND rp.user_id = auth.uid())
  );

-- invite_links
CREATE POLICY "Team members can view invite links" ON public.invite_links
  FOR SELECT USING (public.is_team_member(team_id) OR auth.uid() = created_by);
CREATE POLICY "Team members can create invite links" ON public.invite_links
  FOR INSERT WITH CHECK (public.is_team_member(team_id) AND auth.uid() = created_by);

-- ============================================================
-- GRANTS
-- ============================================================

GRANT ALL ON public.retros             TO authenticated;
GRANT ALL ON public.retro_participants TO authenticated;
GRANT ALL ON public.retro_cards        TO authenticated;
GRANT ALL ON public.retro_groups       TO authenticated;
GRANT ALL ON public.retro_votes        TO authenticated;
GRANT ALL ON public.action_items       TO authenticated;
GRANT ALL ON public.teams              TO authenticated;
GRANT ALL ON public.team_members       TO authenticated;
GRANT ALL ON public.invite_links       TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
