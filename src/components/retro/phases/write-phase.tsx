'use client'

import { useState, useEffect } from 'react'
import { useRetroStore } from '@/lib/store/retro-store'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { TEMPLATE_COLUMNS } from '@/lib/constants'



export default function WritePhase() {
  const { retro, cards, participants, drafts, realtimeChannel } = useRetroStore()
  const [newCardContent, setNewCardContent] = useState('')
  const [activeColumn, setActiveColumn] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // Track presence using shared channel
  useEffect(() => {
    if (!retro || !user || !realtimeChannel) return
    
    // We don't subscribe here, just track
    // The channel is already subscribed in useRetroRealtime
    const trackPresence = async () => {
       await realtimeChannel.track({ user_id: user.id, draft: null })
    }
    trackPresence()
    
    // No cleanup needed for tracking, but maybe we want to untrack on unmount?
    // Actually, if we unmount, we might want to clear our draft status
    return () => {
       // We can try to untrack or set draft to null
       if (realtimeChannel) {
         realtimeChannel.track({ user_id: user.id, draft: null })
       }
    }
  }, [retro?.id, user?.id, realtimeChannel])

  const handleTyping = async (column: string | null, content: string = '') => {
    if (!realtimeChannel || !user) return
    const draft = column ? { column, length: content.length } : null
    await realtimeChannel.track({ user_id: user.id, draft })
  }

  if (!retro) return null

  const columns = TEMPLATE_COLUMNS[retro.template_type] || ['Column 1', 'Column 2', 'Column 3']
  const isOwner = user && retro.created_by === user.id

  const handleAddCard = async (column: string) => {
    if (!newCardContent.trim()) return
    const { error } = await (supabase.from('retro_cards') as any).insert({
      retro_id: retro.id,
      content: newCardContent,
      column_name: column,
      author_id: user?.id
    })

    if (error) {
      toast.error('Failed to add card')
    } else {
      setNewCardContent('')
      setActiveColumn(null)
      handleTyping(null)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    console.log('Attempting to delete card:', cardId)
    const { error } = await supabase.from('retro_cards').delete().eq('id', cardId)
    if (error) {
      console.error('Delete failed:', error)
      toast.error(`Failed to delete card: ${error.message}`)
    } else {
      console.log('Card deleted successfully')
      // Optimistic update: remove locally immediately
      // Realtime will eventually sync, but this makes it snappy
      useRetroStore.getState().removeCard(cardId)
    }
  }

  const handleNextPhase = async () => {
    const { error } = await (supabase.from('retros') as any).update({ phase: 'group' }).eq('id', retro.id)
    if (error) toast.error('Failed to update phase')
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Write Phase</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {participants.length} participants online
          </div>
          {isOwner && (
            <Button onClick={handleNextPhase}>
              Next Phase
            </Button>
          )}
        </div>
      </div>

      <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-3">
        {columns.map((column) => (
          <div key={column} className="flex flex-col rounded-xl bg-muted/50 p-4">
            <h3 className="mb-4 font-semibold text-lg text-center uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-2">
              {column}
            </h3>
            
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              <AnimatePresence mode="popLayout">
                {/* Render Real Cards */}
                {cards
                  .filter((c) => c.column_name === column)
                  .map((card) => {
                    const isMyCard = user && card.author_id === user.id
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
                            <div className={isMyCard ? '' : 'blur-sm select-none'}>
                              {isMyCard ? card.content : 'Hidden Content'}
                            </div>
                            {isMyCard && (
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DeleteButton onDelete={() => handleDeleteCard(card.id)} />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}

                {/* Render Ghost Cards (Drafts) */}
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
                             {/* Dynamic skeleton based on length */}
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
                      const content = e.target.value
                      setNewCardContent(content)
                      handleTyping(column, content)
                    }}
                    onBlur={() => handleTyping(null)} // Optional: clear draft on blur? Maybe keep it?
                    // Let's keep it on blur so they don't lose draft state visibility if they click away momentarily
                    // But if they cancel, we clear it.
                    className="min-h-[80px]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddCard(column)
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAddCard(column)}>
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
      {/* Progress Fill */}
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
