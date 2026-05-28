import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/supabase'

type RetroPhase = Database['public']['Tables']['retros']['Row']['phase']

function phaseBadge(phase: RetroPhase) {
  if (phase === 'summary') return { label: 'Completed', className: 'bg-muted text-muted-foreground' }
  if (phase === 'lobby') return { label: 'Waiting', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' }
  return { label: 'Active', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' }
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TeamRetrosPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [teamResult, memberCheckResult, retrosResult] = await Promise.all([
    supabase.from('teams').select('id, name').eq('id', id).single(),
    supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('retros')
      .select('id, name, phase, created_at', { count: 'exact' })
      .eq('team_id', id)
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
  ])

  if (!teamResult.data) notFound()
  if (!memberCheckResult.data) redirect('/teams')

  const team = teamResult.data
  const retros = (retrosResult.data ?? []) as { id: string; name: string; phase: string; created_at: string; template_type: string }[]
  const totalCount = retrosResult.count ?? retros.length

  return (
    <div className="space-y-6">
      {/* Back */}
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground -ml-2">
          <Link href={`/teams/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            {team.name}
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Retros</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalCount} session{totalCount !== 1 ? 's' : ''} for {team.name}
        </p>
      </div>

      {/* List */}
      {retros.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center gap-2">
            <p className="text-sm text-muted-foreground">No retros yet for this team.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {retros.map((retro) => {
            const badge = phaseBadge(retro.phase as RetroPhase)
            return (
              <Link
                key={retro.id}
                href={`/retro/${retro.id}`}
                className="group flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{retro.name}</span>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', badge.className)}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{relativeTime(retro.created_at)}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
