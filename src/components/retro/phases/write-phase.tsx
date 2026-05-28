'use client'

import { useState, useEffect } from 'react'
import { useRetroStore } from '@/lib/store/retro-store'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Send, Pencil, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { TEMPLATE_COLUMNS } from '@/lib/constants'
import { advancePhase } from '@/app/actions/retro'
import { createCard, updateCardContent, deleteCard } from '@/app/actions/card'
import { CardContentSchema, parseRetroConfig } from '@/lib/schemas'
import PhaseTimer from '@/components/retro/phase-timer'
import type { Database } from '@/types/supabase'

type CardRow = Database['public']['Tables']['retro_cards']['Row']

const CARD_MAX = 1000

export default function WritePhase() {
  const { retro, cards, participants, drafts, realtimeChannel } = useRetroStore()
  const [newCardContent, setNewCardContent] = useState('')
  const [activeColumn, setActiveColumn] = useState<string | null>(null)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isAdvancing, setIsAdvancing] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setUser(user)
    })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTyping = async (column: string | null, content: string = '') => {
    if (!realtimeChannel || !user) return
    const draft = column ? { column, length: content.length } : null
    await realtimeChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id, draft },
    })
  }

  if (!retro) return null

  const config = parseRetroConfig(retro.config)
  const columns = TEMPLATE_COLUMNS[retro.template_type] || config.customColumns || ['Column 1', 'Column 2', 'Column 3']
  const isOwner = user && (retro.moderator_id ?? retro.created_by) === user.id

  const handleAddCard = async (column: string) => {
    const parsed = CardContentSchema.safeParse(newCardContent)
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return }
    if (!user) return

    const tempId = crypto.randomUUID()
    const optimisticCard: CardRow = {
      id: tempId,
      retro_id: retro.id,
      content: parsed.data,
      column_name: column,
      author_id: user.id,
      participant_id: null,
      group_id: null,
      author_revealed: false,
      created_at: new Date().toISOString(),
    }

    useRetroStore.getState().addCard(optimisticCard)
    setNewCardContent('')
    setActiveColumn(null)
    handleTyping(null)

    // Broadcast optimistic card immediately so other users see it instantly
    realtimeChannel?.send({
      type: 'broadcast',
      event: 'card_sync',
      payload: { action: 'insert', card: optimisticCard },
    })

    const result = await createCard(retro.id, parsed.data, column)

    if (result.error) {
      toast.error(result.error)
      useRetroStore.getState().removeCard(tempId)
      // Notify others to remove the failed card
      realtimeChannel?.send({
        type: 'broadcast',
        event: 'card_sync',
        payload: { action: 'delete', cardId: tempId },
      })
    } else if (result.card) {
      // Replace temp card with real one (has server-assigned ID)
      useRetroStore.getState().removeCard(tempId)
      useRetroStore.getState().addCard(result.card)
      realtimeChannel?.send({
        type: 'broadcast',
        event: 'card_sync',
        payload: { action: 'replace', oldId: tempId, card: result.card },
      })
    }
  }

  const handleEditCard = async (cardId: string) => {
    const parsed = CardContentSchema.safeParse(editContent)
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return }

    const { getState } = useRetroStore
    const card = getState().cards.find(c => c.id === cardId)
    if (!card) return

    const updatedCard = { ...card, content: parsed.data }
    getState().updateCard(updatedCard)
    setEditingCardId(null)

    const result = await updateCardContent(cardId, parsed.data)

    if (result.error) {
      toast.error(result.error)
      getState().updateCard(card)
    } else {
      realtimeChannel?.send({
        type: 'broadcast',
        event: 'card_sync',
        payload: { action: 'update', card: updatedCard },
      })
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    const result = await deleteCard(cardId)
    if (result.error) {
      toast.error(`Failed to delete card: ${result.error}`)
    } else {
      useRetroStore.getState().removeCard(cardId)
      realtimeChannel?.send({
        type: 'broadcast',
        event: 'card_sync',
        payload: { action: 'delete', cardId },
      })
    }
  }

  const handleNextPhase = async () => {
    if (isAdvancing) return
    setIsAdvancing(true)
    try {
      const result = await advancePhase(retro.id)
      if (result?.error) toast.error(result.error)
    } finally {
      setIsAdvancing(false)
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Write Phase</h2>
          {config.phaseTimers?.write && retro.phase_started_at && (
            <PhaseTimer
              durationMinutes={config.phaseTimers.write}
              startedAt={retro.phase_started_at}
              isHost={!!isOwner}
              retroId={retro.id}
              phase="write"
            />
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {participants.length} participants online
          </div>
          {isOwner && (
            <Button onClick={handleNextPhase} disabled={isAdvancing}>
              Next Phase
            </Button>
          )}
        </div>
      </div>

      <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-3">
        {columns.map((column) => (
          <div key={column} className="flex flex-col rounded-xl bg-muted/50 p-4">
            <h3 className="mb-4 font-semibold text-lg text-center uppercase tracking-wide text-muted-foreground">
              {column}
            </h3>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              <AnimatePresence mode="popLayout">
                {cards
                  .filter((c) => c.column_name === column)
                  .map((card) => {
                    const isMyCard = user && card.author_id === user.id
                    const isEditing = editingCardId === card.id
                    return (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        layout
                      >
                        <Card className="bg-card shadow-sm group relative">
                          <CardContent className="p-3">
                            {isEditing ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value.slice(0, CARD_MAX))}
                                  className="min-h-[60px] text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditCard(card.id) }
                                    if (e.key === 'Escape') setEditingCardId(null)
                                  }}
                                />
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">{editContent.length} / {CARD_MAX}</span>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEditCard(card.id)}>
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingCardId(null)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div
                                  className={isMyCard ? 'cursor-pointer' : 'blur-sm select-none'}
                                  onDoubleClick={() => {
                                    if (isMyCard) {
                                      setEditingCardId(card.id)
                                      setEditContent(card.content)
                                    }
                                  }}
                                >
                                  {isMyCard ? card.content : 'Hidden Content'}
                                </div>
                                {isMyCard && (
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button
                                      className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                                      onClick={() => { setEditingCardId(card.id); setEditContent(card.content) }}
                                      aria-label="Edit card"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <DeleteButton onDelete={() => handleDeleteCard(card.id)} />
                                  </div>
                                )}
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}

                {Object.entries(drafts)
                  .filter(([uid, draft]) => draft.column === column && uid !== user?.id)
                  .map(([uid, draft]) => (
                    <motion.div
                      key={`draft-${uid}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 0.7, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      layout
                    >
                      <Card className="bg-card/50 border-dashed shadow-sm">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-muted-foreground animate-pulse">Someone is typing...</span>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-full animate-pulse" />
                            {draft.length > 20 && <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />}
                            {draft.length > 50 && <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>

            <div className="mt-4">
              {activeColumn === column ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Type your thought..."
                    value={newCardContent}
                    onChange={(e) => {
                      const content = e.target.value.slice(0, CARD_MAX)
                      setNewCardContent(content)
                      handleTyping(column, content)
                    }}
                    onBlur={() => handleTyping(null)}
                    className="min-h-[80px]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddCard(column)
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${newCardContent.length >= CARD_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {newCardContent.length} / {CARD_MAX}
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAddCard(column)} disabled={newCardContent.length === 0 || newCardContent.length > CARD_MAX}>
                        <Send className="mr-2 h-3 w-3" /> Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setActiveColumn(null)
                        handleTyping(null)
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setActiveColumn(column)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Card
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [isHolding, setIsHolding] = useState(false)

  return (
    <button
      className="relative rounded p-1 text-red-500 hover:bg-red-50 overflow-hidden"
      onMouseDown={() => setIsHolding(true)}
      onMouseUp={() => setIsHolding(false)}
      onMouseLeave={() => setIsHolding(false)}
      onTouchStart={() => setIsHolding(true)}
      onTouchEnd={() => setIsHolding(false)}
    >
      <span className="sr-only">Delete</span>
      <motion.div
        className="absolute inset-0 bg-red-200/50"
        initial={{ width: 0 }}
        animate={{ width: isHolding ? '100%' : 0 }}
        transition={{ duration: 1, ease: 'linear' }}
        onAnimationComplete={() => {
          if (isHolding) {
            onDelete()
            setIsHolding(false)
          }
        }}
      />
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
    </button>
  )
}
