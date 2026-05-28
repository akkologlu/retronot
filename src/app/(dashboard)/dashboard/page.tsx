import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import StartRetroButton from '@/components/dashboard/start-retro-button'
import type { Database } from '@/types/supabase'
import { Users, ArrowRight, Clock, CheckCircle, Zap, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { archiveRetro } from '@/app/actions/retro'

type TeamRow = Database['public']['Tables']['teams']['Row']
type RetroRow = Database['public']['Tables']['retros']['Row']
type TeamWithCount = TeamRow & { team_members: { count: number }[]; owner_id: string }
type RetroWithTeam = RetroRow & { teams: { name: string } | null }

export const metadata: Metadata = {
  title: 'Dashboard | RetroNot',
  description: 'Manage your teams and retrospectives.',
  robots: { index: false },
}

const ACTIVE_PHASES = new Set(['lobby', 'write', 'group', 'vote', 'discuss'])

function phaseBadge(phase: string) {
  if (phase === 'summary') return { label: 'Completed', className: 'bg-muted text-muted-foreground' }
  if (phase === 'lobby') return { label: 'Waiting', className: 'bg-yellow-100 text-yellow-800' }
  return { label: 'Active', className: 'bg-emerald-100 text-emerald-800' }
}

function phaseAction(phase: string) {
  if (phase === 'summary') return 'View'
  if (phase === 'lobby') return 'Join'
  return 'Resume'
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

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [teamsResult, retrosResult] = await Promise.all([
    supabase
      .from('teams')
      .select('*, team_members(count)')
      .order('created_at', { ascending: false }),
    supabase
      .from('retros')
      .select('*, teams(name)')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const teams = (teamsResult.data ?? []) as unknown as TeamWithCount[]
  const allRetros = (retrosResult.data ?? []) as unknown as RetroWithTeam[]
  const retros = allRetros.filter(r => !r.archived_at)

  const teamStubs = teams.map(t => ({ id: t.id, name: t.name }))
  const activeRetros = retros.filter(r => ACTIVE_PHASES.has(r.phase))
  const completedRetros = retros.filter(r => r.phase === 'summary')
  const recentRetros = retros.slice(0, 5)

  const isFirstTimeUser = teams.length === 0 && retros.length === 0
  const mostRecentActive = activeRetros[0]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.user_metadata?.full_name || user.email}
          </p>
        </div>
        {!isFirstTimeUser && <StartRetroButton teams={teamStubs} />}
      </div>

      {/* First-time empty state */}
      {isFirstTimeUser && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Run your first retrospective</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Retros help your team reflect, align, and improve sprint over sprint. Get started in under 60 seconds.
              </p>
            </div>
            <StartRetroButton teams={teamStubs} variant="hero" />
            <p className="text-sm text-muted-foreground">
              Have an invite link?{' '}
              <span className="text-foreground font-medium">Paste it in your browser to join a team.</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      {!isFirstTimeUser && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className={cn(activeRetros.length > 0 && 'border-emerald-200')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <div className={cn(
                'h-2 w-2 rounded-full',
                activeRetros.length > 0 ? 'bg-emerald-500' : 'bg-muted'
              )} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeRetros.length}</div>
              <p className="text-xs text-muted-foreground mt-1">active session{activeRetros.length !== 1 ? 's' : ''}</p>
              {mostRecentActive && (
                <Button asChild variant="link" className="h-auto p-0 text-xs mt-2">
                  <Link href={`/retro/${mostRecentActive.id}`}>
                    Resume latest <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedRetros.length}</div>
              <p className="text-xs text-muted-foreground mt-1">retro{completedRetros.length !== 1 ? 's' : ''} finished</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teams</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teams.length}</div>
              <Button asChild variant="link" className="h-auto p-0 text-xs mt-2">
                <Link href="/teams">
                  Manage teams <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content grid */}
      {!isFirstTimeUser && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Your Teams */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Your Teams</CardTitle>
                <CardDescription>Teams you are a member of.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/teams">Manage</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {teams.length > 0 ? (
                <div className="space-y-2">
                  {teams.map(team => {
                    const memberCount = team.team_members?.[0]?.count ?? 0
                    const isOwner = team.owner_id === user.id
                    return (
                      <div
                        key={team.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold">
                          {team.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{team.name}</span>
                            {isOwner && (
                              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                Owner
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Users className="h-3 w-3" />
                            {memberCount} {memberCount === 1 ? 'member' : 'members'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center gap-3">
                  <Users className="h-8 w-8 text-muted-foreground/40" />
                  <div>
                    <p className="text-sm font-medium">No teams yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Start a retro to create your first team.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Retros */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Recent Retros</CardTitle>
                <CardDescription>Jump back into recent sessions.</CardDescription>
              </div>
              <StartRetroButton teams={teamStubs} />
            </CardHeader>
            <CardContent>
              {recentRetros.length > 0 ? (
                <div className="space-y-1">
                  {recentRetros.map(retro => {
                    const badge = phaseBadge(retro.phase)
                    const action = phaseAction(retro.phase)
                    return (
                      <div
                        key={retro.id}
                        className="group flex items-center gap-3 rounded-lg p-3 hover:bg-accent transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{retro.name}</span>
                            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', badge.className)}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                            {retro.teams?.name && <span>{retro.teams.name}</span>}
                            {retro.teams?.name && <span>·</span>}
                            <Clock className="h-3 w-3" />
                            <span>{relativeTime(retro.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {retro.phase === 'summary' && (
                            <form action={async () => { 'use server'; await archiveRetro(retro.id) }}>
                              <Button variant="ghost" size="sm" type="submit" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Archive">
                                <Archive className="h-3 w-3" />
                              </Button>
                            </form>
                          )}
                          <Button asChild variant="ghost" size="sm" className="text-xs">
                            <Link href={`/retro/${retro.id}`}>
                              {action} <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center gap-3">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="opacity-30">
                    <polygon points="2,2 24,2 30,8 30,30 2,30" fill="currentColor" className="text-muted-foreground" />
                    <polygon points="24,2 24,8 30,8" fill="currentColor" className="text-muted-foreground/60" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">No retros yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Start your first session with your team.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
