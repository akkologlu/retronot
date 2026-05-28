'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import StartRetroWizard from './start-retro-wizard'

type Team = { id: string; name: string }

interface StartRetroButtonProps {
  teams: Team[]
  variant?: 'default' | 'hero'
}

export default function StartRetroButton({ teams, variant = 'default' }: StartRetroButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {variant === 'hero' ? (
        <Button size="lg" onClick={() => setOpen(true)} className="gap-2 text-base px-6 py-5">
          <Plus className="h-5 w-5" />
          Start Your First Retro
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Start Retro
        </Button>
      )}
      <StartRetroWizard teams={teams} open={open} onOpenChange={setOpen} />
    </>
  )
}
