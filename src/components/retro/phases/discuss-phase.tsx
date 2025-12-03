'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRetroStore } from '@/lib/store/retro-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function DiscussPhase() {
  const { retro, cards, votes, actionItems, setActionItems, groups } = useRetroStore()
  const [isUpdating, setIsUpdating] = useState(false)
  const [newActionItem, setNewActionItem] = useState('')
  const supabase = createClient() as any
  const initializedRef = useRef(false)

  // Group cards and sort by votes
  const discussionItems = useMemo(() => {
    const items: { type: 'single' | 'group', id: string, cards: typeof cards, voteCount: number }[] = []
    const processedCardIds = new Set<string>()

    // Process groups first
    groups.forEach(group => {
      const groupCards = cards.filter(c => c.group_id === group.id)
      if (groupCards.length > 0) {
        const groupVoteCount = groupCards.reduce((acc, card) => {
          return acc + votes.filter(v => v.card_id === card.id).length
        }, 0)
        
        items.push({
          type: 'group',
          id: groupCards[0].id, // Use the first card's ID as the representative ID for the group
          cards: groupCards,
          voteCount: groupVoteCount
        })
        groupCards.forEach(c => processedCardIds.add(c.id))
      }
    })

    // Process remaining single cards
    cards.forEach(card => {
      if (!processedCardIds.has(card.id)) {
        const voteCount = votes.filter(v => v.card_id === card.id).length
        items.push({
          type: 'single',
          id: card.id,
          cards: [card],
          voteCount
        })
      }
    })

    return items.sort((a, b) => b.voteCount - a.voteCount)
  }, [cards, votes, groups])

  // Determine current item (topic)
  const currentCardId = retro?.current_discussion_card_id
  
  // Find the discussion item that contains the currentCardId
  const activeIndex = discussionItems.findIndex(item => 
    item.id === currentCardId || item.cards.some(c => c.id === currentCardId)
  )
  
  // If no card is selected or invalid, default to the first one
  const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex
  const activeItem = discussionItems[safeActiveIndex]

  // Check if current user is the creator (moderator)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
    })
  }, [supabase])

  const isModerator = retro?.created_by === userId

  // Effect to set initial card if none selected (only moderator triggers this to avoid race conditions)
  useEffect(() => {
    if (isModerator && !currentCardId && discussionItems.length > 0 && retro && !initializedRef.current) {
      initializedRef.current = true
      updateCurrentCard(discussionItems[0].id)
    }
  }, [isModerator, currentCardId, discussionItems, retro])

  const updateCurrentCard = async (cardId: string) => {
    if (!retro || isUpdating) return
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('retros')
        .update({ current_discussion_card_id: cardId } as any)
        .eq('id', retro.id)

      if (error) throw error
    } catch (error) {
      console.error('Failed to update discussion card:', error)
      toast.error('Failed to update discussion card')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleNext = () => {
    if (safeActiveIndex < discussionItems.length - 1) {
      updateCurrentCard(discussionItems[safeActiveIndex + 1].id)
    }
  }

  const handlePrevious = () => {
    if (safeActiveIndex > 0) {
      updateCurrentCard(discussionItems[safeActiveIndex - 1].id)
    }
  }

  const handleNextPhase = async () => {
    if (!retro || isUpdating) return
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('retros')
        .update({ phase: 'summary' } as any)
        .eq('id', retro.id)

      if (error) throw error
    } catch (error) {
      console.error('Failed to move to next phase:', error)
      toast.error('Failed to move to next phase')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddActionItem = async () => {
    if (!newActionItem.trim() || !retro || !activeItem || isUpdating) return
    setIsUpdating(true)
    
    // Use the representative ID (first card) for the group
    const targetCardId = activeItem.id 

    try {
      const { error } = await supabase
        .from('action_items')
        .insert({
          retro_id: retro.id,
          card_id: targetCardId,
          content: newActionItem.trim(),
          completed: false
        })

      if (error) throw error
      
      setNewActionItem('')
    } catch (error) {
      console.error('Failed to add action item:', error)
      toast.error('Failed to add action item')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteActionItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('action_items')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Failed to delete action item:', error)
      toast.error('Failed to delete action item')
    }
  }

  if (!activeItem) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Discussion Phase</h2>
        <p className="text-muted-foreground">No cards to discuss.</p>
        {isModerator && (
           <Button onClick={handleNextPhase} className="mt-4">
             Finish Retro
           </Button>
        )}
      </div>
    )
  }

  // Get all action items for any card in the current group/item
  const activeCardIds = new Set(activeItem.cards.map(c => c.id))
  const relevantActionItems = actionItems.filter(item => item.card_id && activeCardIds.has(item.card_id))

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between w-full mb-8">
        <h2 className="text-3xl font-bold">Discussion Phase</h2>
        <div className="text-muted-foreground">
          Topic {safeActiveIndex + 1} of {discussionItems.length}
        </div>
      </div>
      
      <div className="w-full max-w-2xl space-y-4">
        {activeItem.cards.map((card) => {
          const cardVoteCount = votes.filter(v => v.card_id === card.id).length
          return (
            <Card key={card.id} className="shadow-lg border-2 border-primary/20">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-xl flex justify-between items-center">
                  <span className="text-sm font-normal text-muted-foreground">{card.column_name}</span>
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                    <span className="text-xs font-medium text-primary">{cardVoteCount} votes</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-2xl font-medium leading-relaxed">{card.content}</p>
              </CardContent>
            </Card>
          )
        })}
        
        {activeItem.type === 'group' && (
           <div className="text-center text-sm text-muted-foreground mt-2">
             Group Total: {activeItem.voteCount} votes
           </div>
        )}
      </div>

      {/* Action Items Section */}
      <div className="w-full max-w-2xl mt-8">
        <h3 className="text-xl font-semibold mb-4">Action Items</h3>
        
        <div className="space-y-3 mb-4">
          {relevantActionItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 bg-muted/50 p-3 rounded-md">
                <div className="flex-1">{item.content}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteActionItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
          {relevantActionItems.length === 0 && (
            <p className="text-muted-foreground italic text-sm">No action items yet.</p>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add an action item..."
            value={newActionItem}
            onChange={(e) => setNewActionItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddActionItem()}
          />
          <Button onClick={handleAddActionItem} disabled={!newActionItem.trim() || isUpdating}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {isModerator && (
        <div className="flex items-center gap-4 mt-8">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={handlePrevious} 
            disabled={safeActiveIndex === 0 || isUpdating}
            className="w-32"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {safeActiveIndex === discussionItems.length - 1 ? (
            <Button 
              size="lg" 
              onClick={handleNextPhase} 
              disabled={isUpdating}
              className="w-32 bg-green-600 hover:bg-green-700"
            >
              Finish
              <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              size="lg" 
              onClick={handleNext} 
              disabled={isUpdating}
              className="w-32"
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      
      {!isModerator && (
        <div className="mt-8 text-muted-foreground animate-pulse">
          Waiting for moderator to navigate...
        </div>
      )}
    </div>
  )
}
