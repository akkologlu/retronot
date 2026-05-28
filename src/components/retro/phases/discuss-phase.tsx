'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRetroStore } from '@/lib/store/retro-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, CheckCircle, Plus, Trash2, Calendar, User, EyeOff, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { advancePhase, setDiscussionCard, revealCardAuthor } from '@/app/actions/retro'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { draftActionItem } from '@/lib/ai'
import { Database } from '@/types/supabase'

type ParticipantWithUser = Database['public']['Tables']['retro_participants']['Row'] & {
  users?: { full_name: string | null; email: string | null } | null
}

export default function DiscussPhase() {
  const { retro, cards, votes, actionItems, groups, addActionItem, removeActionItem, participants, participantUsers, updateCard, setRetro, realtimeChannel } = useRetroStore()
  const [isUpdating, setIsUpdating] = useState(false)
  const [revealingCardId, setRevealingCardId] = useState<string | null>(null)
  const [isDraftingAction, setIsDraftingAction] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newActionItem, setNewActionItem] = useState('')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const directionRef = useRef(1)
  const supabase = createClient()
  const initializedRef = useRef(false)
  const prevIndexRef = useRef(0)

  const liveItems = useMemo(() => {
    const items: { type: 'single' | 'group'; id: string; cards: typeof cards; voteCount: number }[] = []
    const processedCardIds = new Set<string>()

    groups.forEach(group => {
      const groupCards = cards.filter(c => c.group_id === group.id).sort((a, b) => a.id.localeCompare(b.id))
      if (groupCards.length > 0) {
        const groupVoteCount = groupCards.reduce((acc, card) => acc + votes.filter(v => v.card_id === card.id).length, 0)
        items.push({ type: 'group', id: groupCards[0].id, cards: groupCards, voteCount: groupVoteCount })
        groupCards.forEach(c => processedCardIds.add(c.id))
      }
    })

    cards.forEach(card => {
      if (!processedCardIds.has(card.id)) {
        items.push({ type: 'single', id: card.id, cards: [card], voteCount: votes.filter(v => v.card_id === card.id).length })
      }
    })

    return items.sort((a, b) => b.voteCount - a.voteCount || a.id.localeCompare(b.id))
  }, [cards, votes, groups])

  // Freeze order on first render of discuss phase: prevents live vote changes from
  // re-sorting items mid-discussion and silently jumping to a different card.
  const frozenOrderRef = useRef<string[] | null>(null)
  if (frozenOrderRef.current === null && liveItems.length > 0) {
    frozenOrderRef.current = liveItems.map(item => item.id)
  }

  const discussionItems = useMemo(() => {
    if (!frozenOrderRef.current) return liveItems
    return frozenOrderRef.current
      .map(id => liveItems.find(item => item.id === id))
      .filter((item): item is typeof liveItems[number] => item !== undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveItems])

  const currentCardId = retro?.current_discussion_card_id
  const activeIndex = discussionItems.findIndex(item => item.id === currentCardId || item.cards.some(c => c.id === currentCardId))
  const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex
  const activeItem = discussionItems[safeActiveIndex]

  if (safeActiveIndex !== prevIndexRef.current) {
    directionRef.current = safeActiveIndex > prevIndexRef.current ? 1 : -1
    prevIndexRef.current = safeActiveIndex
  }

  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id || null)
    })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isModerator = userId && retro && (retro.moderator_id ?? retro.created_by) === userId

  useEffect(() => {
    if (isModerator && !currentCardId && discussionItems.length > 0 && retro && !initializedRef.current) {
      initializedRef.current = true
      updateCurrentCard(discussionItems[0].id)
    }
  }, [isModerator, currentCardId, discussionItems, retro]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateCurrentCard = async (cardId: string) => {
    if (!retro || isUpdating) return
    setIsUpdating(true)
    const prevCardId = retro.current_discussion_card_id
    // Optimistic update for moderator + broadcast for instant propagation to other clients
    setRetro({ ...retro, current_discussion_card_id: cardId })
    realtimeChannel?.send({ type: 'broadcast', event: 'discussion_card', payload: { card_id: cardId } })
    try {
      const result = await setDiscussionCard(retro.id, cardId)
      if (result?.error) throw new Error(result.error)
    } catch {
      setRetro({ ...retro, current_discussion_card_id: prevCardId })
      realtimeChannel?.send({ type: 'broadcast', event: 'discussion_card', payload: { card_id: prevCardId } })
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
      const result = await advancePhase(retro.id)
      if (result?.error) throw new Error(result.error)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move to next phase')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddActionItem = async () => {
    if (!newActionItem.trim() || !retro || !activeItem || isAddingItem) return
    const content = newActionItem.trim()
    const targetCardId = activeItem.id
    const tempId = crypto.randomUUID()

    addActionItem({
      id: tempId,
      retro_id: retro.id,
      card_id: targetCardId,
      content,
      owner_id: null,
      assigned_to_user_id: assigneeId || null,
      due_date: dueDate || null,
      created_by: userId,
      completed: false,
      created_at: new Date().toISOString(),
      carried_over_from: null,
    })
    setNewActionItem('')
    setAssigneeId('')
    setDueDate('')
    setIsAddingItem(true)

    try {
      const { data, error } = await supabase
        .from('action_items')
        .insert({
          retro_id: retro.id,
          card_id: targetCardId,
          content,
          completed: false,
          assigned_to_user_id: assigneeId || null,
          due_date: dueDate || null,
          created_by: userId,
        })
        .select()
        .single()
      if (error) throw error
      removeActionItem(tempId)
      if (data) addActionItem(data)
    } catch {
      removeActionItem(tempId)
      setNewActionItem(content)
      toast.error('Failed to add action item')
    } finally {
      setIsAddingItem(false)
    }
  }

  const handleDeleteActionItem = async (id: string) => {
    removeActionItem(id)
    try {
      const { error } = await supabase.from('action_items').delete().eq('id', id)
      if (error) throw error
    } catch {
      toast.error('Failed to delete action item')
    }
  }

  const getParticipantName = (userId: string | null) => {
    if (!userId) return null
    const p = (participants as ParticipantWithUser[]).find(p => p.user_id === userId)
    return p?.users?.full_name || p?.users?.email || null
  }

  const handleDraftAction = async () => {
    if (!activeItem || isDraftingAction) return
    const primaryCard = activeItem.cards[0]
    setIsDraftingAction(true)
    try {
      const draft = await draftActionItem(primaryCard)
      setNewActionItem(draft)
      toast.success('Action item drafted — review and edit before saving')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI draft failed')
    } finally {
      setIsDraftingAction(false)
    }
  }

  const handleRevealAuthor = async (cardId: string) => {
    setRevealingCardId(cardId)
    try {
      const result = await revealCardAuthor(cardId)
      if (result?.error) throw new Error(result.error)
      const updatedCard = { ...cards.find(c => c.id === cardId)!, author_revealed: true }
      updateCard(updatedCard)
      // Broadcast reveal so other clients see it immediately
      // (postgres_changes may not include the new column until publication is refreshed)
      realtimeChannel?.send({ type: 'broadcast', event: 'card_reveal', payload: { card_id: cardId } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reveal author')
    } finally {
      setRevealingCardId(null)
    }
  }

  if (!activeItem) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Discussion Phase</h2>
        <p className="text-muted-foreground">No cards to discuss.</p>
        {isModerator && <Button onClick={handleNextPhase} className="mt-4">Finish Retro</Button>}
      </div>
    )
  }

  const activeCardIds = new Set(activeItem.cards.map(c => c.id))
  const relevantActionItems = actionItems.filter(item => item.card_id && activeCardIds.has(item.card_id))
  const participantOptions = (participants as ParticipantWithUser[]).filter(p => p.user_id)

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between w-full mb-8">
        <h2 className="text-3xl font-bold">Discussion Phase</h2>
        <div className="text-muted-foreground">Topic {safeActiveIndex + 1} of {discussionItems.length}</div>
      </div>

      <div className="w-full max-w-2xl overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={directionRef.current}>
          <motion.div
            key={currentCardId ?? 'none'}
            custom={directionRef.current}
            variants={{
              enter: (d: number) => ({ x: d * 60, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -60, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="space-y-4"
          >
            {activeItem.cards.map((card) => {
              const cardVoteCount = votes.filter(v => v.card_id === card.id).length
              const isCardAuthor = userId !== null && card.author_id !== null && card.author_id === userId
              const authorUser = card.author_revealed && card.author_id ? participantUsers[card.author_id] : null
              const authorInitial = authorUser?.fullName?.[0]?.toUpperCase() ?? '?'
              return (
                <Card key={card.id} className="shadow-lg border-2 border-primary/20">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-xl flex justify-between items-center gap-2">
                      <span className="text-sm font-normal text-muted-foreground">{card.column_name}</span>
                      <div className="flex items-center gap-2 ml-auto">
                        {card.author_revealed && authorUser && (
                          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={authorUser.avatarUrl ?? undefined} />
                              <AvatarFallback className="text-[10px]">{authorInitial}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-amber-700 font-medium">{authorUser.fullName ?? 'Anonymous'}</span>
                          </div>
                        )}
                        {isCardAuthor && !card.author_revealed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                            disabled={revealingCardId === card.id}
                            onClick={() => handleRevealAuthor(card.id)}
                          >
                            <EyeOff className="h-3 w-3 mr-1" />
                            Reveal as me
                          </Button>
                        )}
                        <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                          <span className="text-xs font-medium text-primary">{cardVoteCount} votes</span>
                        </div>
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
              <div className="text-center text-sm text-muted-foreground mt-2">Group Total: {activeItem.voteCount} votes</div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-2xl mt-8">
        <h3 className="text-xl font-semibold mb-4">Action Items</h3>
        <div className="space-y-2 mb-4">
          {relevantActionItems.map(item => (
            <div key={item.id} className="flex items-start gap-2 bg-muted/50 p-3 rounded-md">
              <div className="flex-1 min-w-0">
                <p className="text-sm">{item.content}</p>
                <div className="flex flex-wrap gap-3 mt-1">
                  {item.assigned_to_user_id && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {getParticipantName(item.assigned_to_user_id) ?? 'Assigned'}
                    </span>
                  )}
                  {item.due_date && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {item.due_date}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteActionItem(item.id)} aria-label="Delete action item">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {relevantActionItems.length === 0 && (
            <p className="text-muted-foreground italic text-sm">No action items yet.</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add an action item..."
              value={newActionItem}
              onChange={(e) => setNewActionItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddActionItem()}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleDraftAction}
              disabled={isDraftingAction || !activeItem}
              title="AI draft action item"
            >
              {isDraftingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
            <Button onClick={handleAddActionItem} disabled={!newActionItem.trim() || isAddingItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="assignee-select">Assign to</label>
            <select
              id="assignee-select"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Assign to (optional)</option>
              {participantOptions.map(p => (
                <option key={p.id} value={p.user_id!}>
                  {p.users?.full_name || p.users?.email || p.user_id}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="due-date-input">Due date</label>
            <input
              id="due-date-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Due date"
            />
          </div>
        </div>
      </div>

      {isModerator && (
        <div className="flex items-center gap-4 mt-8">
          <Button variant="outline" size="lg" onClick={handlePrevious} disabled={safeActiveIndex === 0 || isUpdating} className="w-32">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          {safeActiveIndex === discussionItems.length - 1 ? (
            <Button size="lg" onClick={handleNextPhase} disabled={isUpdating} className="w-32 bg-green-600 hover:bg-green-700">
              Finish
              <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button size="lg" onClick={handleNext} disabled={isUpdating} className="w-32">
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
