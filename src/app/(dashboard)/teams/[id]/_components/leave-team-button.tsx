'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { leaveTeam } from '@/app/actions/team'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'

export default function LeaveTeamButton({ teamId, variant = 'default' }: { teamId: string; variant?: 'default' | 'ghost' }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleLeave = () => {
    startTransition(async () => {
      const result = await leaveTeam(teamId)
      if (result?.error) {
        toast.error(result.error)
        setOpen(false)
      } else {
        setOpen(false)
        router.refresh()
        router.push('/teams')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          Leave Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave Team</DialogTitle>
          <DialogDescription>
            Are you sure you want to leave this team? You will lose access to all team retros and will need a new invite link to rejoin.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleLeave}
            disabled={pending}
          >
            {pending ? 'Leaving...' : 'Leave Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
