-- Custom retro templates per team
CREATE TABLE public.retro_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.retro_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view templates" ON public.retro_templates
  FOR SELECT USING (public.is_team_member(team_id));

CREATE POLICY "Team members can create templates" ON public.retro_templates
  FOR INSERT WITH CHECK (public.is_team_member(team_id) AND auth.uid() = created_by);

CREATE POLICY "Template creator can update" ON public.retro_templates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Template creator can delete" ON public.retro_templates
  FOR DELETE USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_retro_templates_team ON public.retro_templates(team_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_templates;
