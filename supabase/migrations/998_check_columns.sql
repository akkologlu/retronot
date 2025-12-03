-- Check if card_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'action_items';
