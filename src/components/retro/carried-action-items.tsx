'use client'

import { Calendar, RefreshCw, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Database } from '@/types/supabase'

type ActionItem = Database['public']['Tables']['action_items']['Row']

interface Props {
  items: ActionItem[]
  isModerator: boolean
  getAssigneeName: (userId: string | null) => string | null
  onDueDateChange: (id: string, dueDate: string | null) => void
  onDelete: (id: string) => void
}

export function CarriedActionItems({ items, isModerator, getAssigneeName, onDueDateChange, onDelete }: Props) {
  if (items.length === 0) return null

  return (
    <details open className="mb-4 rounded-md border border-blue-500/30 bg-blue-500/5 p-3">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
        Carried over ({items.length})
      </summary>
      <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-2 rounded-md bg-background p-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm">{item.content}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {item.assigned_to_user_id && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {getAssigneeName(item.assigned_to_user_id) ?? 'Assigned'}
                  </span>
                )}
                {isModerator ? (
                  <input
                    type="date"
                    value={item.due_date ?? ''}
                    onChange={e => onDueDateChange(item.id, e.target.value || null)}
                    className="rounded-md border border-input bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label={`Due date for ${item.content}`}
                  />
                ) : (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {item.due_date ?? 'No due date'}
                  </span>
                )}
              </div>
            </div>
            {isModerator && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(item.id)}
                aria-label={`Delete ${item.content}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </details>
  )
}
