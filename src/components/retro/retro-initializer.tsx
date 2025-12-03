'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useRetroStore } from '@/lib/store/retro-store'
import { useRetroRealtime } from '@/hooks/use-retro-realtime'
import { Database } from '@/types/supabase'

type Retro = Database['public']['Tables']['retros']['Row']
type Participant = Database['public']['Tables']['retro_participants']['Row']
type Card = Database['public']['Tables']['retro_cards']['Row']
type Group = Database['public']['Tables']['retro_groups']['Row']
type Vote = Database['public']['Tables']['retro_votes']['Row']
type ActionItem = Database['public']['Tables']['action_items']['Row']

interface RetroInitializerProps {
  retro: Retro
  participants: Participant[]
  cards: Card[]
  groups: Group[]
  votes: Vote[]
  actionItems: ActionItem[]
}

export default function RetroInitializer({
  retro,
  participants,
  cards,
  groups,
  votes,
  actionItems,
}: RetroInitializerProps) {
  const initialized = useRef(false)
  const {
    setRetro,
    setParticipants,
    setCards,
    setGroups,
    setVotes,
    setActionItems,
  } = useRetroStore()

  // Initialize store only once
  if (!initialized.current) {
    setRetro(retro)
    setParticipants(participants)
    setCards(cards)
    setGroups(groups)
    setVotes(votes)
    setActionItems(actionItems)
    initialized.current = true
  }

  // Start Realtime Subscription
  useRetroRealtime(retro.id)

  // Handle Phase Redirection
  const { retro: currentRetro } = useRetroStore()
  const router = useRouter()

  useEffect(() => {
    if (!currentRetro) return

    const path = window.location.pathname
    const phase = currentRetro.phase

    if (phase === 'lobby' && !path.includes('/lobby')) {
      router.push(`/retro/${currentRetro.id}/lobby`)
    } else if (phase === 'summary' && !path.includes('/summary')) {
      router.push(`/retro/${currentRetro.id}/summary`)
    } else if (phase !== 'lobby' && phase !== 'summary' && !path.includes('/board')) {
      router.push(`/retro/${currentRetro.id}/board`)
    }
  }, [currentRetro?.phase, currentRetro?.id, router])

  return null
}
