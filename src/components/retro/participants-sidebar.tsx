'use client'

import { useRetroStore } from '@/lib/store/retro-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { parseRetroConfig } from '@/lib/schemas'
import { transferModerator } from '@/app/actions/retro'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { Shield, Sun, Moon, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'

type ParticipantWithUser = {
  id: string
  online: boolean
  guest_name: string | null
  users?: { full_name: string | null; avatar_url: string | null } | null
}

export function ParticipantsSidebar() {
  const { participants, retro, votes } = useRetroStore()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    let active = true
    createClient().auth.getUser().then(({ data }) => {
      if (active) setCurrentUserId(data.user?.id ?? null)
    })
    return () => {
      active = false
    }
  }, [])

  // Prevent hydration mismatch: store is empty on server but may have data on client
  if (!mounted || !retro) return null

  const isModerator = currentUserId && (retro.moderator_id ?? retro.created_by) === currentUserId

  const handleTransferModerator = async (newUserId: string) => {
    const result = await transferModerator(retro.id, newUserId)
    if (result?.error) toast.error(result.error)
    else toast.success('Moderator transferred')
  }

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b px-4">
        <span className="font-semibold">Participants ({participants.length})</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close participants"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {participants.map((participant) => {
            const user = (participant as ParticipantWithUser).users
            const name = user?.full_name || participant.guest_name || 'Anonymous'
            const avatarUrl = user?.avatar_url
            const initials = name.slice(0, 2).toUpperCase()

            const isCurrentMod = participant.user_id && (retro.moderator_id ?? retro.created_by) === participant.user_id
            const canTransfer = isModerator && participant.user_id && participant.user_id !== currentUserId

            return (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "group flex items-center gap-3 rounded-lg border p-2 text-sm transition-colors",
                  participant.online ? 'bg-background shadow-sm' : 'opacity-50'
                )}
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl || ''} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  {participant.online && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
                  )}
                </div>
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-medium leading-none">{name}</span>
                    {isCurrentMod && <span title="Moderator"><Shield className="h-3 w-3 shrink-0 text-primary" /></span>}
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {participant.online ? 'Online' : 'Offline'}
                  </span>
                  {retro.phase === 'vote' && (
                    <div className="mt-1 flex gap-0.5">
                      {Array.from({ length: parseRetroConfig(retro.config).voteLimit }).map((_, i) => {
                        const votesUsed = votes.filter(v => v.participant_id === participant.id).length
                        const votesRemaining = parseRetroConfig(retro.config).voteLimit - votesUsed
                        const isRemaining = i < votesRemaining
                        return (
                          <div
                            key={i}
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              isRemaining ? 'bg-primary' : 'bg-muted-foreground/30'
                            )}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
                {canTransfer && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary"
                    aria-label={`Make ${name} moderator`}
                    onClick={() => handleTransferModerator(participant.user_id!)}
                  >
                    <Shield className="h-3 w-3" />
                  </Button>
                )}
              </motion.div>
            )
          })}
        </div>
      </ScrollArea>
    </>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Show participants"
      >
        <Users className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {participants.filter(p => p.online).length}
        </span>
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 flex-col border-r bg-muted/30 backdrop-blur-sm transition-transform duration-200 md:hidden",
        mobileOpen ? 'flex translate-x-0' : 'hidden -translate-x-full'
      )}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden w-64 flex-col border-r bg-muted/30 md:flex">
        {sidebarContent}
      </div>
    </>
  )
}
