'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useRetroStore } from '@/lib/store/retro-store'
import { useRetroRealtime } from '@/hooks/use-retro-realtime'
import { useBlockBackNavigation } from '@/hooks/use-block-back-navigation'
import { createClient } from '@/lib/supabase/client'
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
  userId: string
}

export default function RetroInitializer({
  retro,
  participants,
  cards,
  groups,
  votes,
  actionItems,
  userId,
}: RetroInitializerProps) {
  const {
    setRetro,
    setParticipants,
    setCards,
    setGroups,
    setVotes,
    setActionItems,
    setParticipantUsers,
    realtimeChannel,
  } = useRetroStore()

  useEffect(() => {
    setRetro(retro)
    setParticipants(participants)
    setCards(cards)
    setGroups(groups)
    setVotes(votes)
    setActionItems(actionItems)

    const userIds = participants.map(p => p.user_id).filter((id): id is string => !!id)
    if (userIds.length > 0) {
      const supabase = createClient()
      supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', userIds)
        .then(({ data }) => {
          if (!data) return
          const map: Record<string, { fullName: string | null; avatarUrl: string | null }> = {}
          for (const u of data) {
            map[u.id] = { fullName: u.full_name, avatarUrl: u.avatar_url }
          }
          setParticipantUsers(map)
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retro.id])

  // Start Realtime Subscription
  useRetroRealtime(retro.id, userId)

  // Track presence so online/offline status works for all phases (including lobby)
  useEffect(() => {
    if (!realtimeChannel || !userId) return
    realtimeChannel.track({ user_id: userId, draft: null })
  }, [realtimeChannel, userId])

  // Handle Phase Redirection
  const { retro: currentRetro } = useRetroStore()
  const router = useRouter()
  const pathname = usePathname()
  const previousPhaseRef = useRef<string | null>(null)

  const currentPhase = currentRetro?.phase
  useBlockBackNavigation(
    !!currentPhase && currentPhase !== 'lobby' && currentPhase !== 'summary' && pathname.includes('/board')
  )

  // The URL always follows the phase. Using replace keeps past phases out of history.
  useEffect(() => {
    if (!currentRetro) return

    const phase = currentRetro.phase
    const phaseChangedLive = previousPhaseRef.current !== null && previousPhaseRef.current !== phase
    previousPhaseRef.current = phase

    if (phase === 'lobby' && !pathname.includes('/lobby')) {
      router.replace(`/retro/${currentRetro.id}/lobby`)
    } else if (phase === 'summary' && !pathname.includes('/summary')) {
      // Give the "Retro Complete" overlay on the board time to play.
      if (phaseChangedLive) {
        const t = setTimeout(() => router.replace(`/retro/${currentRetro.id}/summary`), 2000)
        return () => clearTimeout(t)
      }
      router.replace(`/retro/${currentRetro.id}/summary`)
    } else if (phase !== 'lobby' && phase !== 'summary' && !pathname.includes('/board')) {
      router.replace(`/retro/${currentRetro.id}/board`)
    }
  }, [currentRetro?.phase, currentRetro?.id, pathname, router]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
