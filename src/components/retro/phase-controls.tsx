'use client'

import { useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { advancePhase, goToPreviousPhase } from '@/app/actions/retro'
import { getPreviousPhase, NEXT_PHASE, PHASE_LABELS, type Phase } from '@/lib/phases'

type Direction = 'next' | 'back'

interface PhaseControlsProps {
  retro: { id: string; phase: Phase; config: unknown }
  isModerator: boolean
  showBack?: boolean
  showNext?: boolean
  nextLabel?: ReactNode
  nextDisabled?: boolean
  nextVariant?: ComponentProps<typeof Button>['variant']
  nextClassName?: string
  size?: ComponentProps<typeof Button>['size']
  confirmTitle?: string
  confirmDescription?: string
}

// Moderator-only phase navigation. Every move goes through a confirmation
// dialog, and the request carries the phase the moderator was looking at so a
// repeated click can never skip a phase.
export function PhaseControls({
  retro,
  isModerator,
  showBack = true,
  showNext = true,
  nextLabel = 'Next Phase',
  nextDisabled = false,
  nextVariant,
  nextClassName,
  size,
  confirmTitle,
  confirmDescription,
}: PhaseControlsProps) {
  // The dialog belongs to the phase it was opened in: it stays open while the
  // move is in flight and closes by itself once the retro has left that phase.
  const [confirm, setConfirm] = useState<{ direction: Direction; from: Phase } | null>(null)
  // The phase a request was sent from. Controls stay locked until the retro
  // actually leaves that phase, which closes the gap between the server
  // response and the realtime update.
  const [pendingFrom, setPendingFrom] = useState<Phase | null>(null)

  // Phase changed: drop the finished dialog and lock so they never come back
  // if this component outlives the move.
  if (confirm && confirm.from !== retro.phase) setConfirm(null)
  if (pendingFrom && pendingFrom !== retro.phase) setPendingFrom(null)

  if (!isModerator) return null

  const isPending = pendingFrom === retro.phase
  const direction = confirm?.direction ?? null
  const previousPhase = showBack ? getPreviousPhase(retro) : null
  const nextPhase = NEXT_PHASE[retro.phase]

  const openConfirm = (direction: Direction) => setConfirm({ direction, from: retro.phase })
  const closeConfirm = () => { if (!isPending) setConfirm(null) }

  const handleConfirm = async () => {
    if (!direction || isPending) return
    const fromPhase = retro.phase
    setPendingFrom(fromPhase)
    const result = direction === 'next'
      ? await advancePhase(retro.id, fromPhase)
      : await goToPreviousPhase(retro.id, fromPhase)
    if (result?.error) {
      // Keep the dialog open so the moderator can retry or cancel.
      toast.error(result.error)
      setPendingFrom(null)
    }
  }

  const dialogTitle = direction === 'back'
    ? `Go back to ${previousPhase ? PHASE_LABELS[previousPhase] : 'the previous phase'}?`
    : confirmTitle ?? `Move to ${nextPhase ? PHASE_LABELS[nextPhase] : 'the next phase'}?`
  const dialogDescription = direction === 'back'
    ? 'Everyone will be moved back to the previous phase. Cards, groups and votes are kept.'
    : confirmDescription ?? 'Everyone will be moved to the next phase.'

  return (
    <>
      {previousPhase && (
        <Button
          variant="ghost"
          size={size}
          onClick={() => openConfirm('back')}
          disabled={isPending}
          className="text-muted-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      )}
      {showNext && nextPhase && (
        <Button
          variant={nextVariant}
          size={size}
          onClick={() => openConfirm('next')}
          disabled={nextDisabled || isPending}
          className={nextClassName}
        >
          {nextLabel}
        </Button>
      )}

      <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) closeConfirm() }}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={closeConfirm} disabled={isPending} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isPending} className="flex-1 sm:flex-none">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {direction === 'back' ? 'Go back' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
