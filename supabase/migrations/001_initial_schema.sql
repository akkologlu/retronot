-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE (Public profile synced with auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TEAMS TABLE
CREATE TABLE public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TEAM MEMBERS TABLE
CREATE TABLE public.team_members (
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (team_id, user_id)
);

-- RETROS TABLE
CREATE TABLE public.retros (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'start-stop-continue', 'sad-mad-happy', etc.
  config JSONB DEFAULT '{}'::jsonb, -- allowGuests, voteLimit, etc.
  phase TEXT DEFAULT 'lobby' CHECK (phase IN ('lobby', 'write', 'group', 'vote', 'discuss', 'summary')),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RETRO PARTICIPANTS (Includes guests)
CREATE TABLE public.retro_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retro_id UUID REFERENCES public.retros(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id), -- Nullable for guests
  guest_name TEXT, -- Only for guests
  guest_id UUID, -- Generated UUID for guests to track them in session
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  online BOOLEAN DEFAULT false
);

-- RETRO CARDS
CREATE TABLE public.retro_cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retro_id UUID REFERENCES public.retros(id) ON DELETE CASCADE,
  author_id UUID, -- user_id or guest_id logic handled in app, or link to participant
  participant_id UUID REFERENCES public.retro_participants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  column_name TEXT NOT NULL, -- 'start', 'stop', etc.
  group_id UUID, -- For grouping phase
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RETRO GROUPS
CREATE TABLE public.retro_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retro_id UUID REFERENCES public.retros(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RETRO VOTES
CREATE TABLE public.retro_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retro_id UUID REFERENCES public.retros(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.retro_cards(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.retro_participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ACTION ITEMS
CREATE TABLE public.action_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retro_id UUID REFERENCES public.retros(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  owner_id UUID REFERENCES public.users(id), -- Optional owner
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INVITE LINKS
CREATE TABLE public.invite_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS POLICIES

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retro_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retro_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retro_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retro_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Teams: Members can view
CREATE POLICY "Members can view teams" ON public.teams FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
);
CREATE POLICY "Owners can update teams" ON public.teams FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Team Members: Members can view other members
CREATE POLICY "Members can view team members" ON public.team_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid())
);

-- Retros: Team members can view/create
CREATE POLICY "Team members can view retros" ON public.retros FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = retros.team_id AND user_id = auth.uid())
);
CREATE POLICY "Team members can create retros" ON public.retros FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = retros.team_id AND user_id = auth.uid())
);
CREATE POLICY "Team members can update retros" ON public.retros FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = retros.team_id AND user_id = auth.uid())
);

-- Participants: Everyone in the retro can view participants
CREATE POLICY "Participants can view other participants" ON public.retro_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.retro_participants rp WHERE rp.retro_id = retro_participants.retro_id AND (rp.user_id = auth.uid() OR rp.guest_id::text = current_setting('request.headers')::json->>'x-guest-id'))
);
-- Note: Guest access policies are tricky with standard Auth. We might need a "public" retro policy if guests are truly anonymous, or use a signed token.
-- For now, assuming guests are handled via a custom flow or we allow public insert if they have the retro ID (secured by app logic).
-- SIMPLIFICATION: Allow anyone to insert into retro_participants if they have the retro_id (invite flow handles this).
CREATE POLICY "Anyone can join as participant" ON public.retro_participants FOR INSERT WITH CHECK (true);

-- Cards, Groups, Votes: Visible to participants
CREATE POLICY "Participants can view cards" ON public.retro_cards FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.retro_participants WHERE retro_id = retro_cards.retro_id AND (user_id = auth.uid() OR guest_id::text = current_setting('request.headers')::json->>'x-guest-id'))
);
CREATE POLICY "Participants can create cards" ON public.retro_cards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.retro_participants WHERE retro_id = retro_cards.retro_id AND (user_id = auth.uid() OR guest_id::text = current_setting('request.headers')::json->>'x-guest-id'))
);
-- Update: Authors can update their own cards.
CREATE POLICY "Authors can update own cards" ON public.retro_cards FOR UPDATE USING (
  participant_id IN (SELECT id FROM public.retro_participants WHERE user_id = auth.uid() OR guest_id::text = current_setting('request.headers')::json->>'x-guest-id')
);

-- REALTIME SETUP
-- Enable realtime for all retro tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.retros;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_items;
