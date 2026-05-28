'use client'

import { useRetroStore } from '@/lib/store/retro-store'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { MultiBackend, TouchTransition, MouseTransition } from 'react-dnd-multi-backend'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useMemo, useState, useRef, useEffect } from 'react'
import { TEMPLATE_COLUMNS } from '@/lib/constants'
import { advancePhase } from '@/app/actions/retro'
import { parseRetroConfig } from '@/lib/schemas'
import { Sparkles, Loader2, X } from 'lucide-react'
import { suggestGroups, type GroupSuggestion } from '@/lib/ai'
import type { RealtimeChannel } from '@supabase/supabase-js'

const HTML5toTouch = {
  backends: [
    { id: 'html5', backend: HTML5Backend, transition: MouseTransition },
    {
      id: 'touch',
      backend: TouchBackend,
      options: { enableMouseEvents: true },
      preview: true,
      transition: TouchTransition,
    },
  ],
}

const ItemType = { CARD: 'card' }

type CardRow = Database['public']['Tables']['retro_cards']['Row']
type GroupRow = Database['public']['Tables']['retro_groups']['Row']

function DraggableCard({ card, onDropOnCard }: { card: CardRow; onDropOnCard: (draggedId: string, targetId: string) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType.CARD,
    item: { id: card.id, groupId: card.group_id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [card.id, card.group_id])

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemType.CARD,
    drop: (item: { id: string }) => { if (item.id !== card.id) onDropOnCard(item.id, card.id) },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [card.id])

  return (
    <div ref={(node) => { drag(drop(node)) }} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <Card className={`mb-2 cursor-move bg-card shadow-sm hover:shadow-md transition-all ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
        <CardContent className="p-3">{card.content}</CardContent>
      </Card>
    </div>
  )
}

function GroupContainer({
  group, cards, onDropOnGroup, onDropOnCard,
}: {
  group: GroupRow
  cards: CardRow[]
  onDropOnGroup: (cardId: string, groupId: string) => void
  onDropOnCard: (draggedId: string, targetId: string) => void
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemType.CARD,
    drop: (item: { id: string; groupId?: string }) => { if (item.groupId !== group.id) onDropOnGroup(item.id, group.id) },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [group.id])

  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(group.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const { updateGroup } = useRetroStore()
  const supabase = createClient()

  const saveGroupName = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === group.name) { setEditing(false); return }
    updateGroup({ ...group, name: trimmed })
    setEditing(false)
    const { error } = await supabase.from('retro_groups').update({ name: trimmed }).eq('id', group.id)
    if (error) { toast.error('Failed to rename group'); updateGroup(group) }
  }

  return (
    <div
      ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
      className={`mb-4 rounded-lg border-2 border-dashed p-3 transition-colors shadow-sm ${
        isOver ? 'border-primary bg-primary/15' : 'border-primary/20 bg-primary/5 hover:bg-primary/10'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        {editing ? (
          <input
            ref={inputRef}
            className="flex-1 rounded border border-border bg-background px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            value={nameValue}
            autoFocus
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveGroupName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveGroupName()
              if (e.key === 'Escape') { setEditing(false); setNameValue(group.name) }
            }}
            maxLength={80}
          />
        ) : (
          <h4
            className="font-medium text-sm text-muted-foreground cursor-pointer hover:text-foreground"
            onDoubleClick={() => { setEditing(true); setNameValue(group.name) }}
            title="Double-click to rename"
          >
            {group.name}
          </h4>
        )}
        <span className="ml-2 text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border shrink-0">{cards.length}</span>
      </div>
      <div className="space-y-2">
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} onDropOnCard={onDropOnCard} />
        ))}
      </div>
    </div>
  )
}

function ColumnDropZone({ column, children, onUngroup }: { column: string; children: React.ReactNode; onUngroup: (cardId: string, column: string) => void }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemType.CARD,
    drop: (item: { id: string; groupId?: string }, monitor) => { if (monitor.didDrop()) return; onUngroup(item.id, column) },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [column])

  return (
    <div
      ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
      className={`flex flex-col rounded-xl bg-muted/50 p-4 h-full transition-colors ${isOver ? 'bg-muted/80 ring-2 ring-inset ring-primary/20' : ''}`}
    >
      <h3 className="mb-4 font-semibold text-lg text-center uppercase tracking-wide text-muted-foreground">
        {column}
      </h3>
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">{children}</div>
    </div>
  )
}

export default function GroupPhase() {
  const { retro, cards, groups, addGroup, updateCard } = useRetroStore()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<GroupSuggestion[]>([])
  const [aiError, setAiError] = useState<string | null>(null)
  const aiChannelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id ?? null)
    })
    return () => { cancelled = true }
  }, [])

  // Realtime channel for AI suggestions — all participants see the same suggestions
  useEffect(() => {
    if (!retro) return
    const ch = supabase.channel(`retro:${retro.id}:ai-suggestions`)
    ch.on('broadcast', { event: 'suggestions' }, ({ payload }) => {
      setAiSuggestions((payload as { suggestions: GroupSuggestion[] }).suggestions ?? [])
      setAiError(null)
    }).subscribe()
    aiChannelRef.current = ch
    return () => { ch.unsubscribe() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retro?.id])

  const [isAdvancing, setIsAdvancing] = useState(false)
  const isOwner = userId && retro && (retro.moderator_id ?? retro.created_by) === userId

  const columns = useMemo(() => {
    if (!retro) return []
    const config = parseRetroConfig(retro.config)
    return TEMPLATE_COLUMNS[retro.template_type] || config.customColumns || ['Column 1', 'Column 2', 'Column 3']
  }, [retro])

  // Atomically dissolve via RPC: DB checks card count under a lock, preventing
  // the race where two clients concurrently drag the last card out of a group.
  const checkAndDissolveGroup = async (groupId: string) => {
    await supabase.rpc('dissolve_group_if_empty', { p_group_id: groupId })
    // Realtime DELETE event on retro_groups will remove it from the store.
  }

  const handleAddToGroup = async (cardId: string, groupId: string) => {
    const currentCards = useRetroStore.getState().cards
    const card = currentCards.find(c => c.id === cardId)
    if (!card || card.group_id === groupId) return
    const groupCards = currentCards.filter(c => c.group_id === groupId)
    const targetColumn = groupCards.length > 0 ? groupCards[0].column_name : card.column_name
    const sourceGroupId = card.group_id
    updateCard({ ...card, group_id: groupId, column_name: targetColumn })
    const { error } = await supabase.from('retro_cards').update({ group_id: groupId, column_name: targetColumn }).eq('id', cardId)
    if (error) { toast.error('Failed to group card'); updateCard(card) }
    else if (sourceGroupId) await checkAndDissolveGroup(sourceGroupId)
  }

  const handleMergeCards = async (draggedCardId: string, targetCardId: string) => {
    if (!retro) return
    const currentCards = useRetroStore.getState().cards
    const currentGroups = useRetroStore.getState().groups
    const draggedCard = currentCards.find(c => c.id === draggedCardId)
    const targetCard = currentCards.find(c => c.id === targetCardId)
    if (!draggedCard || !targetCard) return

    const targetGroupExists = targetCard.group_id && currentGroups.some(g => g.id === targetCard.group_id)
    if (targetGroupExists) { handleAddToGroup(draggedCardId, targetCard.group_id!); return }

    const targetColumn = targetCard.column_name
    const sourceGroupId = draggedCard.group_id

    const { data, error } = await supabase.from('retro_groups').insert({ retro_id: retro.id, name: 'Group' }).select('*').single()
    if (error || !data) { toast.error('Failed to create group'); return }

    const group = data as GroupRow
    addGroup(group)
    updateCard({ ...draggedCard, group_id: group.id, column_name: targetColumn })
    updateCard({ ...targetCard, group_id: group.id, column_name: targetColumn })

    await Promise.all([
      supabase.from('retro_cards').update({ group_id: group.id, column_name: targetColumn }).eq('id', draggedCardId),
      supabase.from('retro_cards').update({ group_id: group.id, column_name: targetColumn }).eq('id', targetCardId),
    ])

    if (sourceGroupId) await checkAndDissolveGroup(sourceGroupId)
  }

  const handleUngroup = async (cardId: string, targetColumn: string) => {
    const currentCards = useRetroStore.getState().cards
    const card = currentCards.find(c => c.id === cardId)
    if (!card) return
    if (card.column_name === targetColumn && !card.group_id) return
    const sourceGroupId = card.group_id
    updateCard({ ...card, group_id: null, column_name: targetColumn })
    const { error } = await supabase.from('retro_cards').update({ group_id: null, column_name: targetColumn }).eq('id', cardId)
    if (error) { toast.error('Failed to ungroup card'); updateCard(card) }
    else if (sourceGroupId) await checkAndDissolveGroup(sourceGroupId)
  }

  const broadcastSuggestions = (suggestions: GroupSuggestion[]) => {
    aiChannelRef.current?.send({
      type: 'broadcast',
      event: 'suggestions',
      payload: { suggestions },
    })
  }

  const handleAiSuggest = async () => {
    if (!retro || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    broadcastSuggestions([])
    try {
      const ungrouped = cards.filter(c => !c.group_id)
      const suggestions = await suggestGroups(ungrouped.length > 0 ? ungrouped : cards)
      if (suggestions.length === 0) {
        setAiError('No grouping suggestions found. Try with more cards.')
      } else {
        setAiSuggestions(suggestions)
        broadcastSuggestions(suggestions)
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setAiLoading(false)
    }
  }

  const applyOneSuggestion = async (suggestion: GroupSuggestion) => {
    if (!retro) return
    const { data: group, error } = await supabase
      .from('retro_groups')
      .insert({ retro_id: retro.id, name: suggestion.name })
      .select('*')
      .single()
    if (error || !group) { toast.error('Failed to create group'); return }
    addGroup(group as GroupRow)
    const targetColumn = cards.find(c => suggestion.cardIds.includes(c.id))?.column_name ?? 'Group'
    for (const cardId of suggestion.cardIds) {
      const card = useRetroStore.getState().cards.find(c => c.id === cardId)
      if (!card) continue
      const sourceGroupId = card.group_id
      updateCard({ ...card, group_id: group.id, column_name: targetColumn })
      await supabase.from('retro_cards').update({ group_id: group.id, column_name: targetColumn }).eq('id', cardId)
      if (sourceGroupId) await checkAndDissolveGroup(sourceGroupId)
    }
    toast.success(`Group "${suggestion.name}" created`)
  }

  const handleAcceptSuggestion = async (suggestion: GroupSuggestion) => {
    await applyOneSuggestion(suggestion)
    const next = aiSuggestions.filter(s => s.name !== suggestion.name)
    setAiSuggestions(next)
    broadcastSuggestions(next)
  }

  const handleAcceptAll = async () => {
    for (const s of aiSuggestions) await applyOneSuggestion(s)
    setAiSuggestions([])
    broadcastSuggestions([])
    toast.success('All groups applied')
  }

  const handleDismissSuggestions = () => {
    setAiSuggestions([])
    setAiError(null)
    broadcastSuggestions([])
  }

  const handleNextPhase = async () => {
    if (!retro || isAdvancing) return
    setIsAdvancing(true)
    try {
      const result = await advancePhase(retro.id)
      if (result?.error) toast.error(result.error)
    } finally {
      setIsAdvancing(false)
    }
  }

  const columnData = useMemo(() => {
    return columns.reduce((acc, column) => {
      const columnCards = cards.filter(c => c.column_name === column && (!c.group_id || !groups.some(g => g.id === c.group_id)))
      const columnGroups = groups.filter(g => {
        const gc = cards.filter(c => c.group_id === g.id)
        return gc.length > 0 && gc[0].column_name === column
      })
      acc[column] = { columnCards, columnGroups }
      return acc
    }, {} as Record<string, { columnCards: CardRow[]; columnGroups: GroupRow[] }>)
  }, [cards, groups, columns])

  if (!retro) return null

  return (
    <DndProvider backend={MultiBackend} options={HTML5toTouch}>
      <div className="flex h-full flex-col p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Grouping Phase</h2>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground hidden sm:block">Drag cards to group · double-click to rename</div>
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiSuggest}
                disabled={aiLoading || cards.length === 0}
                className="gap-1.5"
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI Suggest
              </Button>
            )}
            {isOwner && <Button onClick={handleNextPhase} variant="outline" disabled={isAdvancing}>Next Phase</Button>}
          </div>
        </div>

        {/* AI Suggestions Panel */}
        {(aiSuggestions.length > 0 || aiError) && (
          <div className="mb-4 flex-shrink-0 rounded-xl border border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-violet-100/60 dark:bg-violet-900/30 border-b border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-900 dark:text-violet-200">AI Group Suggestions</span>
                {aiSuggestions.length > 0 && (
                  <span className="rounded-full bg-violet-600 text-white text-xs px-2 py-0.5 font-medium">{aiSuggestions.length}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isOwner && aiSuggestions.length > 1 && (
                  <Button size="sm" variant="outline" className="h-7 text-xs border-violet-300 text-violet-700 hover:bg-violet-100" onClick={handleAcceptAll}>
                    Apply All
                  </Button>
                )}
                {isOwner && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-violet-500 hover:text-violet-700" onClick={handleDismissSuggestions}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Error */}
            {aiError && <p className="px-4 py-3 text-sm text-destructive">{aiError}</p>}

            {/* Suggestion cards */}
            {aiSuggestions.length > 0 && (
              <div className="p-3 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {aiSuggestions.map((s, i) => {
                  const accent = ['border-l-violet-500', 'border-l-blue-500', 'border-l-emerald-500', 'border-l-amber-500', 'border-l-rose-500', 'border-l-cyan-500'][i % 6]
                  const cardContents = s.cardIds.map(id => cards.find(c => c.id === id)?.content).filter(Boolean) as string[]
                  const visible = cardContents.slice(0, 2)
                  const extra = cardContents.length - visible.length
                  return (
                    <div key={s.name} className={`flex flex-col rounded-lg bg-white dark:bg-card border border-l-4 ${accent} shadow-sm`}>
                      <div className="p-2.5 flex-1">
                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                          <h4 className="font-semibold text-sm leading-tight">{s.name}</h4>
                          <span className="shrink-0 rounded-full bg-muted text-muted-foreground text-xs px-1.5 py-0.5 font-medium">{s.cardIds.length}</span>
                        </div>
                        <ul className="space-y-0.5">
                          {visible.map((content, ci) => (
                            <li key={ci} className="text-xs text-muted-foreground flex gap-1.5 leading-snug">
                              <span className="mt-1 shrink-0 h-1 w-1 rounded-full bg-muted-foreground/40 inline-block" />
                              <span className="line-clamp-1">{content}</span>
                            </li>
                          ))}
                          {extra > 0 && (
                            <li className="text-xs text-muted-foreground/60 pl-2.5">+{extra} more</li>
                          )}
                        </ul>
                      </div>
                      {isOwner && (
                        <div className="px-2.5 pb-2.5">
                          <Button
                            size="sm"
                            className="w-full h-6 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                            onClick={() => handleAcceptSuggestion(s)}
                          >
                            Apply Group
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-3">
          {columns.map((column) => {
            const { columnCards, columnGroups } = columnData[column]
            return (
              <ColumnDropZone key={column} column={column} onUngroup={handleUngroup}>
                {columnGroups.map(group => (
                  <GroupContainer
                    key={group.id}
                    group={group}
                    cards={cards.filter(c => c.group_id === group.id)}
                    onDropOnGroup={handleAddToGroup}
                    onDropOnCard={handleMergeCards}
                  />
                ))}
                {columnCards.map(card => (
                  <DraggableCard key={card.id} card={card} onDropOnCard={handleMergeCards} />
                ))}
              </ColumnDropZone>
            )
          })}
        </div>
      </div>
    </DndProvider>
  )
}
