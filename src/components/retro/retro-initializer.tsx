'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRetroStore } from '@/lib/store/retro-store'
import { useRetroRealtime } from '@/hooks/use-retro-realtime'
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

  useEffect(() => {
    if (!currentRetro) return

    const path = window.location.pathname
    const phase = currentRetro.phase

    if (phase === 'lobby' && !path.includes('/lobby')) {
      router.push(`/retro/${currentRetro.id}/lobby`)
    } else if (phase === 'summary' && !path.includes('/summary')) {
      const t = setTimeout(() => router.push(`/retro/${currentRetro.id}/summary`), 2000)
      return () => clearTimeout(t)
    } else if (phase !== 'lobby' && phase !== 'summary' && !path.includes('/board')) {
      router.push(`/retro/${currentRetro.id}/board`)
    }
  }, [currentRetro?.phase, currentRetro?.id, router]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
