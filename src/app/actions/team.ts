'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createTeam(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // 1. Create Team
  const { data: team, error: teamError } = await (supabase
    .from('teams') as any)
    .insert({
      name,
      owner_id: user.id,
    })
    .select()
    .single()

  if (teamError) {
    return { error: teamError.message }
  }

  // 2. Add Creator as Member (Owner)
  const { error: memberError } = await (supabase
    .from('team_members') as any)
    .insert({
      team_id: team.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    // Rollback team creation if member insertion fails (optional, but good practice)
    await supabase.from('teams').delete().eq('id', team.id)
    return { error: memberError.message }
  }

  revalidatePath('/')
  return { success: true }
}

export async function createInviteLink(teamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user is owner or member (policy handles this, but good to be explicit if needed)
  // For now, rely on RLS.

  // Generate a random token
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  const { data, error } = await (supabase
    .from('invite_links') as any)
    .insert({
      team_id: teamId,
      token,
      created_by: user.id,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Return the full URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  return { url: `${baseUrl}/invite/${token}` }
}
