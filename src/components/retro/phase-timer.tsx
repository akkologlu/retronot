'use client'

import { useEffect, useState, useRef } from 'react'
import { Timer, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adjustPhaseTimer } from '@/app/actions/retro'
import { toast } from 'sonner'

interface PhaseTimerProps {
  durationMinutes: number
  startedAt: string
  isHost?: boolean
  retroId?: string
  phase?: 'write' | 'vote'
}

export default function PhaseTimer({ durationMinutes, startedAt, isHost, retroId, phase }: PhaseTimerProps) {
  const durationMs = durationMinutes * 60 * 1000
  const [remaining, setRemaining] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')
  const [saving, setSaving] = useState(false)
  const beeped = useRef<Record<string, boolean>>({})
  const expiredToastShownRef = useRef(false)

  useEffect(() => {
    expiredToastShownRef.current = false
    const tick = () => {
      const elapsed = Date.now() - new Date(startedAt).getTime()
      const left = Math.max(0, durationMs - elapsed)
      setRemaining(left)

      const beepKey = `${startedAt}-${durationMs}`
      if (left === 0 && !beeped.current[beepKey]) {
        beeped.current[beepKey] = true
        try {
          const ctx = new AudioContext()
          const osc = ctx.createOscillator()
          osc.connect(ctx.destination)
          osc.frequency.value = 880
          osc.start()
          osc.stop(ctx.currentTime + 0.4)
        } catch {}
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt, durationMs])

  useEffect(() => {
    if (remaining === 0 && !isHost && !expiredToastShownRef.current) {
      expiredToastShownRef.current = true
      toast.info("Time's up! Waiting for the moderator to advance...", { duration: Infinity, id: 'timer-expired' })
    }
    return () => {
      if (remaining !== 0) toast.dismiss('timer-expired')
    }
  }, [remaining, isHost])

  const currentRemainingMin = remaining !== null ? Math.floor(remaining / 60000) : 0

  const handleAdjust = async (remainingMin: number) => {
    if (!retroId || !phase) return
    setSaving(true)
    const result = await adjustPhaseTimer(retroId, remainingMin)
    setSaving(false)
    if (result?.error) {
      toast.error(result.error)
    } else {
      setOpen(false)
    }
  }

  const handleCustomApply = async () => {
    const val = parseInt(customMinutes, 10)
    if (isNaN(val) || val < 1) {
      toast.error('Enter a valid number of minutes (min 1)')
      return
    }
    await handleAdjust(val)
    setCustomMinutes('')
  }

  const totalSec = remaining === null ? null : Math.ceil(remaining / 1000)
  const mins = totalSec === null ? null : Math.floor(totalSec / 60)
  const secs = totalSec === null ? null : totalSec % 60
  const isUrgent = remaining !== null && remaining < 2 * 60 * 1000 && remaining > 0
  const isDone = remaining === 0

  const timerDisplay = remaining === null
    ? '--:--'
    : isDone
      ? "Time's up!"
      : `${mins}:${String(secs!).padStart(2, '0')}`

  const pillClass = cn(
    'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-mono font-medium border',
    isDone && 'border-destructive text-destructive bg-destructive/10',
    isUrgent && !isDone && 'border-orange-400 text-orange-500 bg-orange-50 animate-pulse',
    !isUrgent && !isDone && 'border-border text-muted-foreground'
  )

  if (!isHost || !retroId || !phase) {
    return (
      <div className={pillClass}>
        <Timer className="h-3.5 w-3.5" />
        {timerDisplay}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(pillClass, 'group cursor-pointer transition-opacity hover:opacity-80')}>
          <Timer className="h-3.5 w-3.5" />
          {timerDisplay}
          <Pencil className="ml-0.5 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" align="start">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          Adjust timer ({durationMinutes}m total)
        </div>
        <div className="mb-3 grid grid-cols-4 gap-1">
          {([-5, -1, 1, 5] as const).map((delta) => {
            const newRemaining = Math.max(0, currentRemainingMin + delta)
            return (
              <Button
                key={delta}
                size="sm"
                variant="outline"
                className="h-7 px-1 text-xs"
                disabled={saving || (delta < 0 && currentRemainingMin === 0)}
                onClick={() => handleAdjust(newRemaining)}
              >
                {delta > 0 ? `+${delta}m` : `${delta}m`}
              </Button>
            )
          })}
        </div>
        <div className="flex gap-1">
          <Input
            type="number"
            min={1}
            max={120}
            placeholder="min"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomApply()
            }}
          />
          <Button size="sm" className="h-7 px-2 text-xs" disabled={saving || !customMinutes} onClick={handleCustomApply}>
            Set
          </Button>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Sets remaining time in minutes</p>
      </PopoverContent>
    </Popover>
  )
}
