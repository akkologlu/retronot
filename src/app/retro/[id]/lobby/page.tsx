'use client'

import { useRetroStore } from '@/lib/store/retro-store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { use, useState, useEffect } from 'react'
import { createInviteLink } from '@/app/actions/team'
import { advancePhase } from '@/app/actions/retro'
import { Loader2, Play, UserPlus, QrCode, Copy } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import QRCode from 'react-qr-code'
import PreviousActionItems from '@/components/retro/previous-action-items'

type ParticipantWithUser = {
  id: string
  online: boolean
  guest_name: string | null
  users?: { full_name: string | null; email: string | null } | null
}

interface PrevItem {
  id: string
  content: string
  assigned_to_name?: string | null
}

export default function LobbyPage({ params }: { params: Promise<{ id: string }> }) {
  void use(params)
  const { retro, participants } = useRetroStore()
  const [isInviting, setIsInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [prevItems, setPrevItems] = useState<PrevItem[]>([])
  const [prevRetroName, setPrevRetroName] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    if (!retro?.team_id) return
    const supabase = createClient()
    ;(async () => {
      const { data: prevRetro } = await supabase
        .from('retros')
        .select('id, name')
        .eq('team_id', retro.team_id)
        .eq('phase', 'summary')
        .neq('id', retro.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!prevRetro) return
      setPrevRetroName(prevRetro.name)

      const { data: items } = await supabase
        .from('action_items')
        .select('id, content, users!action_items_assigned_to_user_id_fkey(full_name, email)')
        .eq('retro_id', prevRetro.id)
        .eq('completed', false)
        .order('created_at', { ascending: true })

      if (items) {
        setPrevItems(items.map(i => {
          const users = (i as Record<string, unknown>).users as { full_name?: string; email?: string } | null
          return {
            id: i.id,
            content: i.content,
            assigned_to_name: users?.full_name || users?.email || null,
          }
        }))
      }
    })()
  }, [retro?.id, retro?.team_id])

  const handleStartRetro = async () => {
    if (!retro) return
    const result = await advancePhase(retro.id)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Retro started!')
    }
  }

  const isOwner = user && retro && (retro.moderator_id ?? retro.created_by) === user.id


  const handleInvite = async () => {
    if (!retro?.team_id) return
    setIsInviting(true)
    try {
      const result = await createInviteLink(retro.team_id)
      if (result.error) {
        toast.error(result.error)
      } else if (result.url) {
        const urlWithRetro = `${result.url}?retroId=${retro.id}`
        setInviteUrl(urlWithRetro)
        await navigator.clipboard.writeText(urlWithRetro)
        toast.success('Invite link copied to clipboard!')
      }
    } catch {
      toast.error('Failed to create invite link')
    } finally {
      setIsInviting(false)
    }
  }

  if (!retro) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-8 p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold tracking-tight">{retro.name}</h1>
        <p className="text-muted-foreground mt-2">Waiting for everyone to join...</p>
      </motion.div>

      {prevItems.length > 0 && (
        <div className="w-full max-w-2xl">
          <PreviousActionItems
            items={prevItems}
            currentRetroId={retro.id}
            previousRetroName={prevRetroName}
            isHost={!!isOwner}
          />
        </div>
      )}

      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Participants ({participants.filter(p => p.online).length})</CardTitle>
            <CardDescription>People currently in the lobby</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleInvite} disabled={isInviting}>
              {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Invite
            </Button>
            {inviteUrl && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <QrCode className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xs">
                  <DialogHeader>
                    <DialogTitle>Scan to join</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="rounded-lg border p-4 bg-white">
                      <QRCode value={inviteUrl} size={200} />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success('Copied!') }}
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      Copy invite link
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {participants.filter(p => p.online).map((p) => (
              <motion.div
                key={p.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center space-y-2 rounded-lg border p-4"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{(p as ParticipantWithUser).users?.full_name?.[0] || p.guest_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-center w-full">{(p as ParticipantWithUser).users?.full_name || (p as ParticipantWithUser).users?.email || p.guest_name || 'User'}</span>
                {p.online && <span className="h-2 w-2 rounded-full bg-green-500" />}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isOwner ? (
        <Button size="lg" onClick={handleStartRetro}>
          <Play className="mr-2 h-4 w-4" />
          Start Retro
        </Button>
      ) : (
        <div className="text-muted-foreground text-sm">
          Waiting for host to start the retro...
        </div>
      )}
    </div>
  )
}
