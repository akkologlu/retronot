'use client'

import { useState, useEffect } from 'react'

import { useRetroStore } from '@/lib/store/retro-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ThumbsUp } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { toast } from 'sonner'
import { cn } from '../../../lib/utils'

export default function VotePhase() {
  const { retro, cards, votes, participants, groups } = useRetroStore()
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
    })
  }, [supabase])

  const currentParticipant = participants.find(p => p.user_id === userId)
  const isOwner = retro?.created_by === userId
  console.log('VotePhase Debug:', { isOwner, createdBy: retro?.created_by, userId })
  
  // Get vote limit from config or default to 5
  const voteLimit = (retro?.config as any)?.vote_limit || 5
  const myVotes = votes.filter(v => v.participant_id === currentParticipant?.id)
  const votesRemaining = voteLimit - myVotes.length

  // Organize cards into groups and singles
  const groupedCards = groups.map(group => ({
    ...group,
    cards: cards.filter(c => c.group_id === group.id)
  })).filter(g => g.cards.length > 0)

  const ungroupedCards = cards.filter(c => !c.group_id)

  const handleVote = async (targetId: string, isGroup: boolean = false) => {
    if (!retro || !currentParticipant) return
    if (votesRemaining <= 0) {
      toast.error('No votes remaining')
      return
    }

    // If voting on a group, find the first card to attach the vote to
    let cardId = targetId
    if (isGroup) {
      const group = groupedCards.find(g => g.id === targetId)
      if (!group || group.cards.length === 0) return
      // Sort by created_at to consistently pick the "primary" card
      const sortedCards = [...group.cards].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      cardId = sortedCards[0].id
    }

    const { error } = await (supabase.from('retro_votes') as any).insert({
      retro_id: retro.id,
      card_id: cardId,
      participant_id: currentParticipant.id
    })
    
    if (error) {
      console.error('Vote error:', error)
      toast.error(error.message || 'Failed to vote')
    }
  }

  const handleRemoveVote = async (targetId: string, isGroup: boolean = false) => {
    if (!retro || !currentParticipant) return

    let voteToRemoveId: string | undefined

    if (isGroup) {
      const group = groupedCards.find(g => g.id === targetId)
      if (!group) return
      // Find a vote by this user on any card in the group
      const vote = myVotes.find(v => group.cards.some(c => c.id === v.card_id))
      voteToRemoveId = vote?.id
    } else {
      // Find a vote by this user on this specific card
      const vote = myVotes.find(v => v.card_id === targetId)
      voteToRemoveId = vote?.id
    }

    if (!voteToRemoveId) return

    const { error } = await (supabase.from('retro_votes') as any)
      .delete()
      .eq('id', voteToRemoveId)
      .eq('participant_id', currentParticipant.id) // Extra safety

    if (error) {
      console.error('Remove vote error:', error)
      toast.error('Failed to remove vote')
    }
  }

  const handleNextPhase = async () => {
    if (!retro) return
    const { error } = await (supabase
      .from('retros') as any)
      .update({ phase: 'discuss' })
      .eq('id', retro.id)
    
    if (error) toast.error('Failed to update phase')
  }

  const getVoteCount = (targetId: string, isGroup: boolean = false) => {
    if (isGroup) {
      const group = groupedCards.find(g => g.id === targetId)
      if (!group) return 0
      return votes.filter(v => group.cards.some(c => c.id === v.card_id)).length
    }
    return votes.filter(v => v.card_id === targetId).length
  }

  const getMyVoteCount = (targetId: string, isGroup: boolean = false) => {
    if (isGroup) {
      const group = groupedCards.find(g => g.id === targetId)
      if (!group) return 0
      return myVotes.filter(v => group.cards.some(c => c.id === v.card_id)).length
    }
    return myVotes.filter(v => v.card_id === targetId).length
  }

  const renderVotingDots = (targetId: string, isGroup: boolean = false) => {
    const myCount = getMyVoteCount(targetId, isGroup)
    const canVote = votesRemaining > 0

    return (
      <div 
        className={cn(
          "flex h-8 min-w-[60px] cursor-pointer items-center justify-between gap-2 rounded px-2 transition-colors hover:bg-muted/50",
          !canVote && "cursor-not-allowed opacity-50"
        )}
        onClick={() => {
          if (canVote) handleVote(targetId, isGroup)
        }}
        title={canVote ? "Click area to add vote" : "No votes remaining"}
      >
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 select-none">
          Tap to vote
        </span>
        
        <div className="flex items-center gap-1">
          {/* Render filled dots for existing votes */}
          {Array.from({ length: myCount }).map((_, i) => (
            <button
              key={`vote-${i}`}
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveVote(targetId, isGroup)
              }}
              className="h-4 w-4 rounded-full bg-primary hover:bg-destructive transition-colors"
              title="Click dot to remove vote"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Voting Phase</h2>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Your Votes:</span>
            <div className="flex gap-1">
              {Array.from({ length: voteLimit }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full ${
                    i < votesRemaining ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        {isOwner && (
          <Button onClick={handleNextPhase}>
            Next Phase
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {/* Render Groups */}
        {groupedCards.map(group => {
          return (
          <Card key={group.id} className="relative flex flex-col border-primary/50 bg-primary/5">
             <CardContent className="flex flex-1 flex-col p-4 pt-4">
              <div className="mb-2 text-sm font-semibold text-primary">
                Group: {group.name}
              </div>
              <div className="mb-4 flex-1 space-y-2">
                {group.cards.map(card => (
                  <div key={card.id} className="rounded border bg-background p-2 text-sm shadow-sm">
                    {card.content}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <div className="flex flex-col">
                  {/* Hidden total vote count */}
                </div>
                {renderVotingDots(group.id, true)}
              </div>
            </CardContent>
          </Card>
        )})}

        {/* Render Ungrouped Cards */}
        {ungroupedCards.map(card => {
          return (
          <Card key={card.id} className="relative">
            <CardContent className="p-4 pt-8">
              <div className="mb-4">{card.content}</div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  {/* Hidden total vote count */}
                </div>
                {renderVotingDots(card.id)}
              </div>
            </CardContent>
          </Card>
        )})}
      </div>
    </div>
  )
}
