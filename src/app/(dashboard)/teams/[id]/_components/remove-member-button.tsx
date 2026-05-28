'use client'

import { useState, useTransition } from 'react'
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
import { removeMember } from '@/app/actions/team'
import { toast } from 'sonner'
import { UserMinus } from 'lucide-react'

interface Props {
  teamId: string
  userId: string
  userName: string
}

export default function RemoveMemberButton({ teamId, userId, userName }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeMember(teamId, userId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`${userName} removed from team`)
      }
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          title={`Remove ${userName}`}
        >
          <UserMinus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Member</DialogTitle>
          <DialogDescription>
            Remove <strong>{userName}</strong> from this team? They will lose access to all team retros and will need a new invite link to rejoin.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={pending}
          >
            {pending ? 'Removing...' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
