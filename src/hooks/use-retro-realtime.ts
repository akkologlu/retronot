import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRetroStore } from '@/lib/store/retro-store'
import { Database } from '@/types/supabase'

export function useRetroRealtime(retroId: string) {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const {
    addCard, updateCard, removeCard,
    addParticipant, updateParticipant, removeParticipant,
    addGroup, updateGroup, removeGroup,
    addVote, removeVote,
    addActionItem, updateActionItem, removeActionItem,
    setRetro,
    setDraft,
    setDrafts,
    setRealtimeChannel
  } = useRetroStore()

  useEffect(() => {
    const channel = supabase.channel(`retro:${retroId}`)
    setRealtimeChannel(channel)

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'retro_cards', filter: `retro_id=eq.${retroId}` },
        (payload) => {
          console.log('Realtime Card Event:', payload)
          if (payload.eventType === 'INSERT') addCard(payload.new as any)
          if (payload.eventType === 'UPDATE') {
            const newCard = payload.new as any
            updateCard(newCard)

            // Fallback: If card is in a group we don't have, fetch it
            if (newCard.group_id) {
              const currentGroups = useRetroStore.getState().groups
              const groupExists = currentGroups.some(g => g.id === newCard.group_id)
              
              if (!groupExists) {
                console.log('Fetching missing group:', newCard.group_id)
                supabase
                  .from('retro_groups')
                  .select('*')
                  .eq('id', newCard.group_id)
                  .single()
                  .then(({ data, error }) => {
                    if (data && !error) {
                      addGroup(data as any)
                    }
                  })
              }
            }
          }
          if (payload.eventType === 'DELETE') {
            console.log('Realtime DELETE received:', payload)
            removeCard(payload.old.id)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'retro_participants', filter: `retro_id=eq.${retroId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') addParticipant(payload.new as any)
          if (payload.eventType === 'UPDATE') updateParticipant(payload.new as any)
          // DELETE might be tricky if we don't have the ID in old, but usually we do
          if (payload.eventType === 'DELETE') removeParticipant(payload.old.id)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'retro_groups', filter: `retro_id=eq.${retroId}` },
        (payload) => {
          console.log('Realtime Group Event Received:', payload)
          if (payload.eventType === 'INSERT') {
             console.log('Adding group from realtime:', payload.new)
             addGroup(payload.new as any)
          }
          if (payload.eventType === 'UPDATE') updateGroup(payload.new as any)
          if (payload.eventType === 'DELETE') removeGroup(payload.old.id)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'retro_votes', filter: `retro_id=eq.${retroId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') addVote(payload.new as any)
          if (payload.eventType === 'DELETE') removeVote(payload.old.id)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'retros', filter: `id=eq.${retroId}` },
        (payload) => {
           setRetro(payload.new as any)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'action_items', filter: `retro_id=eq.${retroId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') addActionItem(payload.new as any)
          if (payload.eventType === 'UPDATE') updateActionItem(payload.new as any)
          if (payload.eventType === 'DELETE') removeActionItem(payload.old.id)
        }
      )

      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((p: any) => {
          if (p.user_id && p.draft) {
            setDraft(p.user_id, p.draft)
          }
        })
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((p: any) => {
          if (p.user_id) {
            setDraft(p.user_id, null)
          }
        })
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        
        const newDrafts: Record<string, { column: string; length: number }> = {}
        Object.values(state).flat().forEach((p: any) => {
          if (p.user_id && p.draft) {
            newDrafts[p.user_id] = p.draft
          }
        })
        setDrafts(newDrafts)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      setRealtimeChannel(null)
    }
  }, [retroId, supabase, addCard, updateCard, removeCard, addParticipant, updateParticipant, removeParticipant, addGroup, updateGroup, removeGroup, addVote, removeVote, addActionItem, updateActionItem, removeActionItem, setRetro, setDraft, setDrafts, setRealtimeChannel])

  // Polling Fallback
  useEffect(() => {
    const fetchState = async () => {
      const { data: cards } = await supabase.from('retro_cards').select('*').eq('retro_id', retroId)
      if (cards) useRetroStore.getState().setCards(cards)

      const { data: groups } = await supabase.from('retro_groups').select('*').eq('retro_id', retroId)
      if (groups) useRetroStore.getState().setGroups(groups)
      
      const { data: votes } = await supabase.from('retro_votes').select('*').eq('retro_id', retroId)
      if (votes) useRetroStore.getState().setVotes(votes)

      const { data: actionItems } = await supabase.from('action_items').select('*').eq('retro_id', retroId)
      if (actionItems) useRetroStore.getState().setActionItems(actionItems)
    }

    const interval = setInterval(fetchState, 5000)
    return () => clearInterval(interval)
  }, [retroId, supabase])
}
