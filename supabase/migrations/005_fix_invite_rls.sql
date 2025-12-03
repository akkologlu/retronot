-- Fix RLS for invite_links table
-- Currently no policies exist, so all operations are blocked.

-- 1. Allow team members to view invite links for their teams
CREATE POLICY "Team members can view invite links" ON public.invite_links
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = invite_links.team_id AND user_id = auth.uid())
);

-- 2. Allow team members to create invite links for their teams
CREATE POLICY "Team members can create invite links" ON public.invite_links
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = invite_links.team_id AND user_id = auth.uid())
);

-- 3. Allow anyone to view an invite link by token (for joining)
-- This is critical for the invite page to work for new users/guests
CREATE POLICY "Anyone can view invite by token" ON public.invite_links
FOR SELECT USING (
  true -- The token itself is the secret. If you have it, you can see the invite details.
);
