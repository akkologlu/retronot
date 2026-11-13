'use client'

import { CheckCircle2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PreviousActionReview } from '@/lib/schemas'

type Decision = 'done' | 'carried' | 'dropped'

interface Props {
  review: PreviousActionReview
  isHost: boolean
  isBusy: boolean
  onResolve: (itemId: string, decision: Decision) => void
}

export default function PreviousActionItems({ review, isHost, isBusy, onResolve }: Props) {
  const pending = review.items.filter(i => i.status === 'pending')
  const resolved = review.items.filter(i => i.status !== 'pending')

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
          Open actions from &ldquo;{review.retroName}&rdquo;
        </h3>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map(item => (
            <div key={item.id} className="flex items-start gap-3 rounded-md bg-background border border-border p-3">
              <div className="flex-1 space-y-1">
                {item.cardContent && (
                  <p className="text-xs text-muted-foreground italic line-clamp-1" title={item.cardContent}>
                    From: &ldquo;{item.cardContent}&rdquo;
                  </p>
                )}
                <p className="text-sm text-foreground leading-snug">
                  {item.content}
                  {item.assignedToName && (
                    <span className="ml-2 text-xs text-muted-foreground">→ {item.assignedToName}</span>
                  )}
                </p>
              </div>
              {isHost && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-green-600 hover:text-green-500 hover:bg-green-500/10"
                    disabled={isBusy}
                    onClick={() => onResolve(item.id, 'done')}
                    title="Mark done"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Done
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-blue-600 hover:text-blue-500 hover:bg-blue-500/10"
                    disabled={isBusy}
                    onClick={() => onResolve(item.id, 'carried')}
                    title="Carry over to this retro"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Carry
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    disabled={isBusy}
                    onClick={() => onResolve(item.id, 'dropped')}
                    title="Drop — don't carry"
                    aria-label={`Drop ${item.content}`}
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
          {resolved.map(item => (
            <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              {item.status === 'done' && <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />}
              {item.status === 'carried' && <RefreshCw className="h-3 w-3 shrink-0 text-blue-500" />}
              {item.status === 'dropped' && <X className="h-3 w-3 shrink-0 text-muted-foreground" />}
              <span className={item.status === 'dropped' ? 'line-through opacity-50' : ''}>
                {item.content}
              </span>
              {item.cardContent && (
                <span className="italic opacity-60 truncate max-w-[16rem]" title={item.cardContent}>
                  (&ldquo;{item.cardContent}&rdquo;)
                </span>
              )}
              <span className="opacity-60 shrink-0">· {item.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
