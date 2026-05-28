'use client'

import { useEffect, useRef, useState } from 'react'
import { useRetroStore } from '@/lib/store/retro-store'
import WritePhase from '@/components/retro/phases/write-phase'
import GroupPhase from '@/components/retro/phases/group-phase'
import VotePhase from '@/components/retro/phases/vote-phase'
import DiscussPhase from '@/components/retro/phases/discuss-phase'
import { PhaseTransitionOverlay } from '@/components/retro/phase-transition-overlay'
import { Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

type Phase = 'write' | 'group' | 'vote' | 'discuss' | 'summary'

function PhaseComponent({ phase }: { phase: string }) {
  switch (phase) {
    case 'write': return <WritePhase />
    case 'group': return <GroupPhase />
    case 'vote': return <VotePhase />
    case 'discuss': return <DiscussPhase />
    default: return <div>Unknown phase: {phase}</div>
  }
}

export default function RetroBoardPage() {
  const { retro } = useRetroStore()
  const prevPhaseRef = useRef<string | null>(null)
  const [overlayPhase, setOverlayPhase] = useState<Phase | null>(null)

  useEffect(() => {
    const current = retro?.phase
    if (!current) return

    // Skip overlay on first load, only show on actual phase changes
    if (prevPhaseRef.current !== null && prevPhaseRef.current !== current) {
      setOverlayPhase(current as Phase) // eslint-disable-line react-hooks/set-state-in-effect
    }
    prevPhaseRef.current = current
  }, [retro?.phase])

  if (!retro) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={retro.phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="h-full"
          layoutRoot
        >
          <PhaseComponent phase={retro.phase} />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {overlayPhase && (
          <PhaseTransitionOverlay
            phase={overlayPhase}
            onDone={() => setOverlayPhase(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
