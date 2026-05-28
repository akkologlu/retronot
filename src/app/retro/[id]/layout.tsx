import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RetroInitializer from '@/components/retro/retro-initializer'

import { ParticipantsSidebar } from '@/components/retro/participants-sidebar'

export default async function RetroLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { id: retroId } = await params

  if (!user) {
    redirect(`/login?next=/retro/${retroId}`)
  }

  // Fetch all initial data
  const [
    retroResult,
    participantsResult,
    cardsResult,
    groupsResult,
    votesResult,
    actionItemsResult,
  ] = await Promise.all([
    supabase.from('retros').select('*').eq('id', retroId).single(),
    supabase.from('retro_participants').select('*, users(*)').eq('retro_id', retroId),
    supabase.from('retro_cards').select('*').eq('retro_id', retroId),
    supabase.from('retro_groups').select('*').eq('retro_id', retroId),
    supabase.from('retro_votes').select('*').eq('retro_id', retroId),
    supabase.from('action_items').select('*').eq('retro_id', retroId)
  ])

  const retro = retroResult.data
  const participants = participantsResult.data
  const cards = cardsResult.data
  const groups = groupsResult.data
  const votes = votesResult.data
  const actionItems = actionItemsResult.data

  // Auto-join: add authenticated user as participant if not already in this retro
  const isParticipant = participants?.some(p => p.user_id === user.id)
  let effectiveParticipants = participants || []
  if (!isParticipant) {
    const { data: newParticipant } = await supabase
      .from('retro_participants')
      .insert({ retro_id: retroId, user_id: user.id, online: true })
      .select('*, users(*)')
      .single()
    if (newParticipant) {
      effectiveParticipants = [...effectiveParticipants, newParticipant]
    }
  }

  if (!retro) {
    return <div>Retro not found</div>
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <RetroInitializer
        retro={retro}
        participants={effectiveParticipants}
        cards={cards || []}
        groups={groups || []}
        votes={votes || []}
        actionItems={actionItems || []}
        userId={user.id}
      />
      <div className="flex flex-1 overflow-hidden">
        <ParticipantsSidebar />
        <main id="main-content" className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
