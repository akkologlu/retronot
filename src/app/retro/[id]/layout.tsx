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

  if (!user) {
    // TODO: Handle guest access via invite token or public retro if allowed
    // For now, redirect to login
    redirect('/login')
  }

  const { id: retroId } = await params

  // Fetch all initial data
  const [
    { data: retro },
    { data: participants },
    { data: cards },
    { data: groups },
    { data: votes },
    { data: actionItems }
  ] = await Promise.all([
    supabase.from('retros').select('*').eq('id', retroId).single(),
    supabase.from('retro_participants').select('*, users(*)').eq('retro_id', retroId),
    supabase.from('retro_cards').select('*').eq('retro_id', retroId),
    supabase.from('retro_groups').select('*').eq('retro_id', retroId),
    supabase.from('retro_votes').select('*').eq('retro_id', retroId),
    supabase.from('action_items').select('*').eq('retro_id', retroId)
  ])

  if (!retro) {
    return <div>Retro not found</div>
  }



  return (
    <div className="flex h-screen flex-col bg-background">
      <RetroInitializer
        retro={retro}
        participants={participants || []}
        cards={cards || []}
        groups={groups || []}
        votes={votes || []}
        actionItems={actionItems || []}
      />
      <div className="flex flex-1 overflow-hidden">
        <ParticipantsSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
