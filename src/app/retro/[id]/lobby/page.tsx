'use client'

import { useRetroStore } from '@/lib/store/retro-store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { toast } from 'sonner'
import { use, useState, useEffect } from 'react'
import { createInviteLink } from '@/app/actions/team'
import { Loader2, Play, Copy, UserPlus } from 'lucide-react'

export default function LobbyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { retro, participants } = useRetroStore()
  const [isInviting, setIsInviting] = useState(false)
  
  // ... supabase client

  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleStartRetro = async () => {
    if (!retro) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { error } = await supabase
      .from('retros')
      .update({ phase: 'write' })
      .eq('id', retro.id)

    if (error) {
      toast.error('Failed to start retro')
      console.error(error)
    } else {
      toast.success('Retro started!')
    }
  }

  const isOwner = user && retro && user.id === retro.created_by
  


  // ... existing render code ...



  const handleInvite = async () => {
    if (!retro?.team_id) return
    setIsInviting(true)
    try {
      const result = await createInviteLink(retro.team_id)
      if (result.error) {
        toast.error(result.error)
      } else if (result.url) {
        const fullUrl = `${result.url}?retroId=${retro.id}`
        await navigator.clipboard.writeText(fullUrl)
        toast.success('Invite link copied to clipboard!')
      }
    } catch (error) {
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

      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Participants ({participants.length})</CardTitle>
            <CardDescription>People currently in the lobby</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleInvite} disabled={isInviting}>
            {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Invite Members
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {participants.map((p) => (
              <motion.div
                key={p.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center space-y-2 rounded-lg border p-4"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{(p as any).users?.full_name?.[0] || p.guest_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{(p as any).users?.full_name || (p as any).users?.email || p.guest_name || 'User'}</span>
                {p.online && <span className="h-2 w-2 rounded-full bg-green-500" />}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isOwner ? (
        <Button size="lg" onClick={handleStartRetro} className="animate-pulse">
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
