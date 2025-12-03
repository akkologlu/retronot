-- Enable RLS (ensure it is enabled)
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "Participants can view action items" ON public.action_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.retro_participants 
    WHERE retro_id = action_items.retro_id 
    AND (user_id = auth.uid() OR guest_id::text = current_setting('request.headers')::json->>'x-guest-id')
  )
);

-- INSERT
CREATE POLICY "Participants can create action items" ON public.action_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.retro_participants 
    WHERE retro_id = action_items.retro_id 
    AND (user_id = auth.uid() OR guest_id::text = current_setting('request.headers')::json->>'x-guest-id')
  )
);

-- UPDATE
CREATE POLICY "Participants can update action items" ON public.action_items
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.retro_participants 
    WHERE retro_id = action_items.retro_id 
    AND (user_id = auth.uid() OR guest_id::text = current_setting('request.headers')::json->>'x-guest-id')
  )
);

-- DELETE
CREATE POLICY "Participants can delete action items" ON public.action_items
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.retro_participants 
    WHERE retro_id = action_items.retro_id 
    AND (user_id = auth.uid() OR guest_id::text = current_setting('request.headers')::json->>'x-guest-id')
  )
);
