'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createRetro(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const teamId = formData.get('teamId') as string
  const templateType = formData.get('templateType') as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // 1. Create Retro
  const { data: retro, error } = await (supabase
    .from('retros') as any)
    .insert({
      name,
      team_id: teamId,
      template_type: templateType,
      created_by: user.id,
      phase: 'lobby',
      config: {
        allowGuests: true, // Default
        voteLimit: 5, // Default
      }
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // 2. Add Creator as Participant
  await (supabase.from('retro_participants') as any).insert({
    retro_id: retro.id,
    user_id: user.id,
    online: true,
  })

  revalidatePath('/')
  redirect(`/retro/${retro.id}/lobby`)
}
