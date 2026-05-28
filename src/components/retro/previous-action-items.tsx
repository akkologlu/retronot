'use client'

import { useState } from 'react'
import { CheckCircle2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { markPreviousActionDone, carryOverActionItem } from '@/app/actions/retro'

interface ActionItem {
  id: string
  content: string
  assigned_to_name?: string | null
}

interface Props {
  items: ActionItem[]
  currentRetroId: string
  previousRetroName: string
  isHost?: boolean
}

type ItemState = 'pending' | 'done' | 'carried' | 'dropped'

export default function PreviousActionItems({ items, currentRetroId, previousRetroName, isHost = false }: Props) {
  const [states, setStates] = useState<Record<string, ItemState>>(() =>
    Object.fromEntries(items.map(i => [i.id, 'pending']))
  )
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const setItemState = (id: string, state: ItemState) =>
    setStates(prev => ({ ...prev, [id]: state }))

  const setItemLoading = (id: string, val: boolean) =>
    setLoading(prev => ({ ...prev, [id]: val }))

  const handleDone = async (id: string) => {
    setItemLoading(id, true)
    try {
      const result = await markPreviousActionDone(id)
      if (result?.error) throw new Error(result.error)
      setItemState(id, 'done')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setItemLoading(id, false)
    }
  }

  const handleCarry = async (id: string) => {
    setItemLoading(id, true)
    try {
      const result = await carryOverActionItem(id, currentRetroId)
      if (result?.error) throw new Error(result.error)
      setItemState(id, 'carried')
      toast.success('Action item carried over to this retro')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setItemLoading(id, false)
    }
  }

  const handleDrop = (id: string) => setItemState(id, 'dropped')

  const pending = items.filter(i => states[i.id] === 'pending')
  const resolved = items.filter(i => states[i.id] !== 'pending')

  if (items.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-amber-400">
          Review open actions from &ldquo;{previousRetroName}&rdquo;
        </h3>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map(item => (
            <div key={item.id} className="flex items-start gap-3 rounded-md bg-background border border-border p-3">
              <p className="flex-1 text-sm text-foreground leading-snug">
                {item.content}
                {item.assigned_to_name && (
                  <span className="ml-2 text-xs text-muted-foreground">→ {item.assigned_to_name}</span>
                )}
              </p>
              {isHost && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-green-500 hover:text-green-400 hover:bg-green-500/10"
                    disabled={loading[item.id]}
                    onClick={() => handleDone(item.id)}
                    title="Mark done"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Done
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    disabled={loading[item.id]}
                    onClick={() => handleCarry(item.id)}
                    title="Carry over to this retro"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Carry
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    disabled={loading[item.id]}
                    onClick={() => handleDrop(item.id)}
                    title="Drop — don't carry"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-1 pt-1">
          {resolved.map(item => {
            const state = states[item.id]
            return (
              <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                {state === 'done' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                {state === 'carried' && <RefreshCw className="h-3 w-3 text-blue-500" />}
                {state === 'dropped' && <X className="h-3 w-3 text-muted-foreground" />}
                <span className={state === 'dropped' ? 'line-through opacity-50' : ''}>
                  {item.content}
                </span>
                <span className="opacity-60">
                  {state === 'done' ? '· done' : state === 'carried' ? '· carried' : '· dropped'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
