-- Fix Users RLS to allow viewing other profiles
-- The existing policy "Users can view own profile" restricts users to only see themselves.
-- We need to allow authenticated users to see basic profile info (name, avatar) of others
-- so they can be displayed in the Retro Lobby.

-- 1. Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- 2. Create a new permissive policy for SELECT
-- Allow any authenticated user to view any profile in the public.users table.
-- This table only contains public info (name, avatar, email).
CREATE POLICY "Authenticated users can view profiles" ON public.users
FOR SELECT
TO authenticated
USING (true);
