'use client'

import { useRetroStore } from '@/lib/store/retro-store'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Card, CardContent } from '@/components/ui/card'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useEffect, useMemo } from 'react'
import { TEMPLATE_COLUMNS } from '@/lib/constants'

const ItemType = {
  CARD: 'card',
  GROUP: 'group'
}



type Card = Database['public']['Tables']['retro_cards']['Row']
type Group = Database['public']['Tables']['retro_groups']['Row']

// Draggable Card Component
function DraggableCard({ card, onDropOnCard }: { card: Card, onDropOnCard: (draggedId: string, targetId: string) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType.CARD,
    item: { id: card.id, type: 'CARD', groupId: card.group_id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [card.id, card.group_id]) // Added dependency

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemType.CARD,
    drop: (item: { id: string }) => {
      if (item.id !== card.id) {
        onDropOnCard(item.id, card.id)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [card.id]) // Added dependency

  return (
    <div ref={(node) => { drag(drop(node)) }} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <Card className={`mb-2 cursor-move bg-card shadow-sm hover:shadow-md transition-all ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
        <CardContent className="p-3">
          {card.content}
        </CardContent>
      </Card>
    </div>
  )
}

// Group Component (Droppable)
function GroupContainer({ group, cards, onDropOnGroup, onDropOnCard }: { group: Group, cards: Card[], onDropOnGroup: (cardId: string, groupId: string) => void, onDropOnCard: (draggedId: string, targetId: string) => void }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemType.CARD,
    drop: (item: { id: string, groupId?: string }) => {
      if (item.groupId !== group.id) {
        onDropOnGroup(item.id, group.id)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [group.id]) // Added dependency

  return (
    <div
      ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
      className={`mb-4 rounded-lg border-2 border-dashed p-3 transition-colors shadow-sm ${
        isOver ? 'border-primary bg-primary/15' : 'border-primary/20 bg-primary/5 hover:bg-primary/10'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-medium text-sm text-muted-foreground">{group.name}</h4>
        <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border">{cards.length}</span>
      </div>
      <div className="space-y-2">
        {cards.map((card) => (
          <DraggableCard 
            key={card.id} 
            card={card} 
            onDropOnCard={onDropOnCard} 
          />
        ))}
      </div>
    </div>
  )
}

// Column Drop Zone for Ungrouping
function ColumnDropZone({ column, children, onUngroup }: { column: string, children: React.ReactNode, onUngroup: (cardId: string, column: string) => void }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemType.CARD,
    drop: (item: { id: string, groupId?: string }, monitor) => {
      if (monitor.didDrop()) {
        return
      }
      onUngroup(item.id, column)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [column]) // Added dependency

  return (
    <div 
      ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
      className={`flex flex-col rounded-xl bg-muted/50 p-4 h-full transition-colors ${isOver ? 'bg-muted/80 ring-2 ring-inset ring-primary/20' : ''}`}
    >
      <h3 className="mb-4 font-semibold text-lg text-center uppercase tracking-wide text-muted-foreground">
        {column}
      </h3>
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {children}
      </div>
    </div>
  )
}

export default function GroupPhase() {
  const { retro, cards, groups, addGroup, updateCard, removeGroup } = useRetroStore()
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  if (!retro) return null

  const columns = TEMPLATE_COLUMNS[retro.template_type] || ['Column 1', 'Column 2', 'Column 3']

  // Dissolution logic: Delete groups with 0-1 cards
  const checkAndDissolveGroup = async (groupId: string) => {
    const currentCards = useRetroStore.getState().cards
    const groupCards = currentCards.filter(c => c.group_id === groupId)
    
    if (groupCards.length <= 1) {
      console.log(`Dissolving group ${groupId}...`)
      
      // Optimistically remove group
      removeGroup(groupId)

      // Optimistically ungroup remaining cards
      groupCards.forEach(card => {
        updateCard({ ...card, group_id: null })
      })

      // DB update - Cascade/Set Null will handle cards
      const { error } = await (supabase.from('retro_groups') as any).delete().eq('id', groupId)
      
      if (error) {
        console.error('Failed to delete group:', error)
        toast.error('Failed to dissolve group')
      }
    }
  }

  const handleAddToGroup = async (cardId: string, groupId: string) => {
    const currentCards = useRetroStore.getState().cards
    const card = currentCards.find(c => c.id === cardId)
    if (!card || card.group_id === groupId) return

    const groupCards = currentCards.filter(c => c.group_id === groupId)
    // If group has cards, take their column. If not (rare), keep current.
    const targetColumn = groupCards.length > 0 ? groupCards[0].column_name : card.column_name 

    const sourceGroupId = card.group_id

    // Optimistic Update
    updateCard({ ...card, group_id: groupId, column_name: targetColumn })

    const { error } = await (supabase.from('retro_cards') as any)
      .update({ group_id: groupId, column_name: targetColumn })
      .eq('id', cardId)

    if (error) {
      toast.error('Failed to group card')
      updateCard(card) // Revert
    } else {
      if (sourceGroupId) {
        await checkAndDissolveGroup(sourceGroupId)
      }
    }
  }

  const handleMergeCards = async (draggedCardId: string, targetCardId: string) => {
    const currentCards = useRetroStore.getState().cards
    const currentGroups = useRetroStore.getState().groups
    
    const draggedCard = currentCards.find(c => c.id === draggedCardId)
    const targetCard = currentCards.find(c => c.id === targetCardId)
    if (!draggedCard || !targetCard) return

    // Check if target is in a valid group
    const targetGroupExists = targetCard.group_id && currentGroups.some(g => g.id === targetCard.group_id)

    // If target is already in a group (and we know about it), add to that group
    if (targetGroupExists) {
      handleAddToGroup(draggedCardId, targetCard.group_id!)
      return
    }

    const targetColumn = targetCard.column_name
    const sourceGroupId = draggedCard.group_id
    const newGroupName = 'Group'
    
    // 1. Create Group in DB first to get ID (safer than optimistic ID generation)
    const { data, error } = await (supabase
      .from('retro_groups') as any)
      .insert({
        retro_id: retro.id,
        name: newGroupName
      })
      .select('*')
      .single()

    if (error || !data) {
      toast.error('Failed to create group')
      return
    }

    const group = data as Group

    // 2. Update Store
    addGroup(group)
    updateCard({ ...draggedCard, group_id: group.id, column_name: targetColumn })
    updateCard({ ...targetCard, group_id: group.id, column_name: targetColumn }) 

    // 3. Update Cards in DB
    await Promise.all([
      (supabase.from('retro_cards') as any).update({ group_id: group.id, column_name: targetColumn }).eq('id', draggedCardId),
      (supabase.from('retro_cards') as any).update({ group_id: group.id, column_name: targetColumn }).eq('id', targetCardId)
    ])

    // 4. Cleanup old group if needed
    if (sourceGroupId) {
      await checkAndDissolveGroup(sourceGroupId)
    }
  }

  const handleUngroup = async (cardId: string, targetColumn: string) => {
    const currentCards = useRetroStore.getState().cards
    const card = currentCards.find(c => c.id === cardId)
    if (!card) return

    if (card.column_name === targetColumn && !card.group_id) return

    const sourceGroupId = card.group_id

    // Optimistic Update
    updateCard({ ...card, group_id: null, column_name: targetColumn })

    const { error } = await (supabase.from('retro_cards') as any)
      .update({ group_id: null, column_name: targetColumn })
      .eq('id', cardId)

    if (error) {
      toast.error('Failed to move/ungroup card')
      updateCard(card) // Revert
    } else {
      if (sourceGroupId) {
        await checkAndDissolveGroup(sourceGroupId)
      }
    }
  }

  const handleNextPhase = async () => {
    const { error } = await (supabase.from('retros') as any).update({ phase: 'vote' }).eq('id', retro.id)
    if (error) toast.error('Failed to update phase')
  }

  // Memoize column items to avoid unnecessary recalculations
  const columnData = useMemo(() => {
    return columns.reduce((acc, column) => {
      // Filter cards for this column
      // Show in column if:
      // 1. No group_id (normal ungrouped card)
      // 2. OR group_id exists but group is not found in store (orphaned card due to sync lag)
      const columnCards = cards.filter(c => {
        if (c.column_name !== column) return false
        if (!c.group_id) return true
        
        const groupExists = groups.some(g => g.id === c.group_id)
        return !groupExists
      })
      
      const columnGroups = groups.filter(g => {
        const groupCards = cards.filter(c => c.group_id === g.id)
        if (groupCards.length === 0) return false 
        return groupCards[0].column_name === column
      })

      acc[column] = { columnCards, columnGroups }
      return acc
    }, {} as Record<string, { columnCards: Card[], columnGroups: Group[] }>)
  }, [cards, groups, columns])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Grouping Phase</h2>
           <div className="flex items-center gap-4">
             <div className="text-sm text-muted-foreground">
               Drag cards to group/ungroup
             </div>
              <Button onClick={handleNextPhase} variant="outline">
                Next Phase
              </Button>
           </div>
        </div>

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
                  <DraggableCard 
                    key={card.id} 
                    card={card} 
                    onDropOnCard={handleMergeCards} 
                  />
                ))}
              </ColumnDropZone>
            )
          })}
        </div>
      </div>
    </DndProvider>
  )
}
