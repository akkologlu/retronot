'use client'

import { useRetroStore } from '@/lib/store/retro-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export function ParticipantsSidebar() {
  const { participants, retro, votes } = useRetroStore()

  if (!retro) return null

  return (
    <div className="hidden w-64 flex-col border-r bg-muted/30 md:flex">
      <div className="flex h-14 items-center border-b px-4 font-semibold">
        Participants ({participants.length})
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {participants.map((participant) => {
            const user = (participant as any).users
            // Handle guest or user name
            const name = user?.full_name || participant.guest_name || 'Anonymous'
            const avatarUrl = user?.avatar_url
            const initials = name.slice(0, 2).toUpperCase()

            return (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2 text-sm transition-colors",
                  participant.online ? "bg-background shadow-sm" : "opacity-50"
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
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate font-medium leading-none">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {participant.online ? 'Online' : 'Offline'}
                  </span>
                  {retro.phase === 'vote' && (
                    <div className="mt-1 flex gap-0.5">
                      {Array.from({ length: (retro.config as any)?.vote_limit || 5 }).map((_, i) => {
                        const votesUsed = votes.filter(v => v.participant_id === participant.id).length
                        const isUsed = i < votesUsed
                        return (
                          <div
                            key={i}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              isUsed ? "bg-muted-foreground/30" : "bg-primary"
                            )}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
