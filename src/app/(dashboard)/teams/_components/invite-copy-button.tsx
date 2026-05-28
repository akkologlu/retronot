'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Link as LinkIcon, Check, Loader2 } from 'lucide-react'
import { createInviteLink } from '@/app/actions/team'
import { toast } from 'sonner'

export default function InviteCopyButton({ teamId }: { teamId: string }) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerateInvite = async () => {
    setLoading(true)
    try {
      const result = await createInviteLink(teamId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.url) {
        await navigator.clipboard.writeText(result.url)
        setCopied(true)
        toast.success('Invite link copied to clipboard!')
        setTimeout(() => setCopied(false), 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full gap-2"
      onClick={handleGenerateInvite}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <LinkIcon className="h-4 w-4" />
      )}
      {copied ? 'Copied!' : 'Generate Invite Link'}
    </Button>
  )
}
