'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import PreviousActionItems from '@/components/retro/previous-action-items'
import { advancePhase, resolvePreviousActionItem } from '@/app/actions/retro'
import { parseRetroConfig } from '@/lib/schemas'
import { useRetroStore } from '@/lib/store/retro-store'
import { createClient } from '@/lib/supabase/client'

export default function ReviewPhase() {
  const { retro, setRetro } = useRetroStore()
  const [userId, setUserId] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)

  useEffect(() => {
    let cancelled = false
    createClient().auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id ?? null)
    })
    return () => { cancelled = true }
  }, [])

  if (!retro) return null

  const review = parseRetroConfig(retro.config).previousActionReview
  const isModerator = !!userId && (retro.moderator_id ?? retro.created_by) === userId
  const total = review?.items.length ?? 0
  const pendingCount = review?.items.filter(i => i.status === 'pending').length ?? 0

  const handleResolve = async (itemId: string, decision: 'done' | 'carried' | 'dropped') => {
    setIsResolving(true)
    try {
      const result = await resolvePreviousActionItem(retro.id, itemId, decision)
      if (result.error) throw new Error(result.error)
      const latest = useRetroStore.getState().retro
      if (latest && result.config !== undefined) setRetro({ ...latest, config: result.config })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update action item')
    } finally {
      setIsResolving(false)
    }
  }

  const handleContinue = async () => {
    setIsAdvancing(true)
    try {
      const result = await advancePhase(retro.id)
      if (result?.error) throw new Error(result.error)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move to next phase')
    } finally {
      setIsAdvancing(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center p-6 max-w-3xl mx-auto w-full">
      <div className="w-full mb-6">
        <h2 className="text-3xl font-bold">Previous Action Items</h2>
        <p className="text-muted-foreground mt-1">
          Review what the team committed to last time before starting this retro.
        </p>
      </div>

      {review && (
        <div className="w-full">
          <PreviousActionItems
            review={review}
            isHost={isModerator}
            isBusy={isResolving}
            onResolve={handleResolve}
          />
        </div>
      )}

      {isModerator ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={handleContinue} disabled={pendingCount > 0 || isResolving || isAdvancing}>
            {isAdvancing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            Continue to Writing
          </Button>
          <p className="text-sm text-muted-foreground">
            {total - pendingCount} of {total} reviewed
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground animate-pulse">
          Waiting for moderator to review the action items...
        </p>
      )}
    </div>
  )
}
