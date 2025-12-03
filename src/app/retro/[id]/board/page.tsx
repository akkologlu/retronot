'use client'

import { useRetroStore } from '@/lib/store/retro-store'
import WritePhase from '@/components/retro/phases/write-phase'
import GroupPhase from '@/components/retro/phases/group-phase'
import VotePhase from '@/components/retro/phases/vote-phase'
import DiscussPhase from '@/components/retro/phases/discuss-phase'
import { Loader2 } from 'lucide-react'

export default function RetroBoardPage() {
  const { retro } = useRetroStore()

  if (!retro) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>

  switch (retro.phase) {
    case 'write':
      return <WritePhase />
    case 'group':
      return <GroupPhase />
    case 'vote':
      return <VotePhase />
    case 'discuss':
      return <DiscussPhase />
    default:
      return <div>Unknown phase: {retro.phase}</div>
  }
}
