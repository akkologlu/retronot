'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Check, Loader2 } from 'lucide-react'
import { toggleActionItem } from '@/app/actions/team'
import { toast } from 'sonner'

interface Props {
  itemId: string
  completed: boolean
}

export default function ActionItemCheckbox({ itemId, completed }: Props) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const toggle = () => {
    startTransition(async () => {
      const result = await toggleActionItem(itemId, !completed)
      if (result?.error) {
        toast.error(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={cn(
        'mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer',
        completed
          ? 'bg-primary border-primary hover:bg-primary/80'
          : 'border-muted-foreground/40 hover:border-primary',
        pending && 'opacity-50 cursor-not-allowed'
      )}
      title={completed ? 'Mark as pending' : 'Mark as done'}
    >
      {pending ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
      ) : completed ? (
        <Check className="h-2.5 w-2.5 text-primary-foreground" />
      ) : null}
    </button>
  )
}
