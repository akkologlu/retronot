-- Get the latest retro and its config
SELECT id, name, config, phase 
FROM public.retros 
ORDER BY created_at DESC 
LIMIT 1;
