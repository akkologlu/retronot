'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { PenLine, Layers, Vote, MessageSquare, Flag } from 'lucide-react'

type Phase = 'write' | 'group' | 'vote' | 'discuss' | 'summary'

const PHASE_CONFIG: Record<Phase, {
  icon: React.ReactNode
  title: string
  subtitle: string
  from: string
  gradient: string
}> = {
  write: {
    icon: <PenLine className="w-16 h-16" />,
    title: 'Writing Phase',
    subtitle: 'Share your thoughts anonymously',
    from: 'Retro is starting!',
    gradient: 'from-amber-400/20 to-indigo-500/20',
  },
  group: {
    icon: <Layers className="w-16 h-16" />,
    title: "Time to Group!",
    subtitle: 'Drag similar cards together',
    from: 'Writing complete',
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  vote: {
    icon: <Vote className="w-16 h-16" />,
    title: "Time to Vote!",
    subtitle: 'Cast your votes on what matters most',
    from: 'Grouping complete',
    gradient: 'from-amber-500/20 to-orange-500/20',
  },
  discuss: {
    icon: <MessageSquare className="w-16 h-16" />,
    title: "Time to Discuss!",
    subtitle: "Let's talk through the top topics",
    from: 'Voting complete',
    gradient: 'from-green-500/20 to-teal-500/20',
  },
  summary: {
    icon: <Flag className="w-16 h-16" />,
    title: "Retro Complete!",
    subtitle: "Great work team — here's your summary",
    from: 'Discussion complete',
    gradient: 'from-rose-500/20 to-red-500/20',
  },
}

interface Props {
  phase: Phase
  onDone: () => void
}

export function PhaseTransitionOverlay({ phase, onDone }: Props) {
  const config = PHASE_CONFIG[phase]

  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm bg-gradient-to-br ${config.gradient}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onDone}
    >
      <motion.div
        className="flex flex-col items-center gap-6 text-center px-8"
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {config.from && (
          <motion.div
            className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {config.from}
          </motion.div>
        )}

        <motion.div
          className="text-primary"
          animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {config.icon}
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-4xl font-bold tracking-tight">{config.title}</h2>
          <p className="text-lg text-muted-foreground">{config.subtitle}</p>
        </div>

        <motion.p
          className="text-xs text-muted-foreground/50 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Click anywhere to continue
        </motion.p>
      </motion.div>
    </motion.div>
  )
}
