'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { inviteRatelimit } from '@/lib/ratelimit'
import { INVITE_EXPIRY_MS, INVITE_TOKEN_BYTES } from '@/lib/constants'
import { CreateTeamSchema } from '@/lib/schemas'

export async function createTeam(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = CreateTeamSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { name } = parsed.data

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ name, owner_id: user.id })
    .select()
    .single()

  if (teamError) return { error: teamError.message }

  const { error: memberError } = await supabase
    .from('team_members')
    .insert({ team_id: team.id, user_id: user.id, role: 'owner' as const })

  if (memberError) {
    await supabase.from('teams').delete().eq('id', team.id)
    return { error: memberError.message }
  }

  revalidatePath('/')
  return { success: true, teamId: team.id }
}

export async function createInviteLink(teamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { success } = await inviteRatelimit.limit(user.id)
    if (!success) return { error: 'Too many invite links created. Try again later.' }
  } catch {
    // Redis unavailable — allow the request
  }

  const token = randomBytes(INVITE_TOKEN_BYTES).toString('hex')

  const { error } = await supabase
    .from('invite_links')
    .insert({
      team_id: teamId,
      token,
      created_by: user.id,
      expires_at: new Date(Date.now() + INVITE_EXPIRY_MS).toISOString(),
    })
    .select()
    .single()

  if (error) return { error: error.message }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  return { url: `${baseUrl}/invite/${token}` }
}

export async function leaveTeam(teamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: team } = await supabase.from('teams').select('owner_id').eq('id', teamId).single()
  if (!team) return { error: 'Team not found' }
  if (team.owner_id === user.id) return { error: 'Team owner cannot leave. Transfer ownership or delete the team.' }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/teams')
  return { success: true }
}

export async function toggleActionItem(itemId: string, completed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('action_items')
    .update({ completed })
    .eq('id', itemId)

  if (error) return { error: error.message }
  revalidatePath('/teams', 'layout')
  return { success: true }
}

export async function removeMember(teamId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: team } = await supabase.from('teams').select('owner_id').eq('id', teamId).single()
  if (!team) return { error: 'Team not found' }
  if (team.owner_id !== user.id) return { error: 'Only the team owner can remove members' }
  if (userId === user.id) return { error: 'Cannot remove yourself' }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}`)
  return { success: true }
}
