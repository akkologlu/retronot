import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Users, Clock, CheckCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import InviteCopyButton from '../_components/invite-copy-button'
import LeaveTeamButton from './_components/leave-team-button'
import RemoveMemberButton from './_components/remove-member-button'
import ActionItemCheckbox from './_components/action-item-checkbox'
import type { Database } from '@/types/supabase'

type RetroPhase = Database['public']['Tables']['retros']['Row']['phase']

const RETROS_DISPLAY_LIMIT = 10
const ACTION_ITEMS_DISPLAY_LIMIT = 50

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

export default async function TeamDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Round 1: parallel — team, members, all retros (lightweight for stats), limited retros for display
  const [teamResult, membersResult, retrosStatsResult, retrosDisplayResult] = await Promise.all([
    supabase.from('teams').select('*').eq('id', id).single(),
    supabase
      .from('team_members')
      .select('*, users(id, email, full_name, avatar_url)')
      .eq('team_id', id)
      .order('joined_at', { ascending: true })
      .limit(100),
    // All non-archived retros — lightweight (id+phase+name) for accurate stats and action item grouping
    supabase
      .from('retros')
      .select('id, phase, name', { count: 'exact' })
      .eq('team_id', id)
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    // Latest 10 retros with full fields for the display card
    supabase
      .from('retros')
      .select('id, name, phase, created_at')
      .eq('team_id', id)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(RETROS_DISPLAY_LIMIT),
  ])

  const team = teamResult.data
  if (!team) notFound()

  const members = (membersResult.data ?? []) as { user_id: string; role: string; users: { full_name: string | null; email: string | null; avatar_url: string | null } | null }[]
  const isMember = members.some(m => m.user_id === user.id)
  if (!isMember) redirect('/teams')

  const retrosStats = (retrosStatsResult.data ?? []) as { id: string; phase: string; name: string }[]
  const totalRetrosCount = retrosStatsResult.count ?? retrosStats.length
  const retrosDisplay = (retrosDisplayResult.data ?? []) as { id: string; name: string; phase: string; created_at: string }[]
  const hasMoreRetros = totalRetrosCount > RETROS_DISPLAY_LIMIT

  const retroIds = retrosStats.map((r: { id: string }) => r.id)
  const retroNameMap = new Map(retrosStats.map((r: { id: string; name: string }) => [r.id, r.name]))

  // Round 2: action items (needs retro IDs). HEAD queries for accurate counts without fetching all rows.
  let actionItems: { id: string; content: string; completed: boolean; retro_id: string; assigned_to_user_id: string | null; users: { full_name: string | null; email: string } | null }[] = []
  let totalActions = 0
  let completedActions = 0

  if (retroIds.length > 0) {
    const [displayResult, totalCountResult, completedCountResult] = await Promise.all([
      supabase
        .from('action_items')
        .select('id, content, completed, created_at, retro_id, assigned_to_user_id, users!action_items_assigned_to_user_id_fkey(full_name, email)')
        .in('retro_id', retroIds)
        .order('completed', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(ACTION_ITEMS_DISPLAY_LIMIT),
      supabase
        .from('action_items')
        .select('*', { count: 'exact', head: true })
        .in('retro_id', retroIds),
      supabase
        .from('action_items')
        .select('*', { count: 'exact', head: true })
        .in('retro_id', retroIds)
        .eq('completed', true),
    ])
    actionItems = displayResult.data ?? []
    totalActions = totalCountResult.count ?? 0
    completedActions = completedCountResult.count ?? 0
  }

  const actionItemsTruncated = totalActions > ACTION_ITEMS_DISPLAY_LIMIT
  const isOwner = team.owner_id === user.id

  const completedRetros = retrosStats.filter((r: { phase: string }) => r.phase === 'summary').length
  const activeRetros = retrosStats.filter((r: { phase: string }) => r.phase !== 'summary' && r.phase !== 'lobby').length

  // Group displayed action items by retro_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actionsByRetro = actionItems.reduce((acc: Record<string, any[]>, item) => {
    if (!acc[item.retro_id]) acc[item.retro_id] = []
    acc[item.retro_id].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Back */}
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground -ml-2">
          <Link href="/teams">
            <ArrowLeft className="h-4 w-4" />
            Teams
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary shrink-0">
            {team.name[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
              {isOwner && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Owner</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Users className="h-3 w-3" />
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && <InviteCopyButton teamId={id} />}
          {!isOwner && <LeaveTeamButton teamId={id} />}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        <Link
          href={`/teams/${id}`}
          className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary -mb-px"
        >
          Overview
        </Link>
        <Link
          href={`/teams/${id}/health`}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors -mb-px"
        >
          Health
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Retros</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalRetrosCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{completedRetros}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{activeRetros}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions Done</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{totalActions > 0 ? `${completedActions}/${totalActions}` : '—'}</div>
            {totalActions > 0 && (
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(completedActions / totalActions) * 100}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {isOwner ? 'Manage who has access to this team.' : 'People with access to this team.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {members.map((member) => {
                const u = member.users
                const displayName = u?.full_name || u?.email || 'Unknown'
                const initials = displayName[0].toUpperCase()
                const isMemberOwner = member.user_id === team.owner_id
                const isCurrentUser = member.user_id === user.id

                return (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={u?.avatar_url ?? undefined} className="object-cover" />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{displayName}</span>
                        {isCurrentUser && (
                          <span className="text-xs text-muted-foreground shrink-0">(you)</span>
                        )}
                      </div>
                      {u?.email && displayName !== u.email && (
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isMemberOwner && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          Owner
                        </span>
                      )}
                      {isOwner && !isMemberOwner && (
                        <RemoveMemberButton
                          teamId={id}
                          userId={member.user_id}
                          userName={displayName}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Retros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Retros</CardTitle>
            <CardDescription>
              {totalRetrosCount} session{totalRetrosCount !== 1 ? 's' : ''} for this team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {retrosDisplay.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center gap-2">
                <p className="text-sm text-muted-foreground">No retros yet for this team.</p>
              </div>
            ) : (
              <div>
                <div className="space-y-1">
                  {retrosDisplay.map((retro) => {
                    const badge = phaseBadge(retro.phase as RetroPhase)
                    const items = actionsByRetro[retro.id] ?? []
                    const doneCount = items.filter((a: { completed: boolean }) => a.completed).length

                    return (
                      <Link
                        key={retro.id}
                        href={`/retro/${retro.id}`}
                        className="group flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{retro.name}</span>
                            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', badge.className)}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{relativeTime(retro.created_at)}</span>
                            {items.length > 0 && (
                              <>
                                <span>·</span>
                                <CheckCircle className="h-3 w-3" />
                                <span>{doneCount}/{items.length} actions</span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
                {hasMoreRetros && (
                  <div className="mt-3 pt-3 border-t">
                    <Link
                      href={`/teams/${id}/retros`}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>View all {totalRetrosCount} retros</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      {totalActions > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>
                  {completedActions} of {totalActions} completed across all retros
                </CardDescription>
              </div>
              <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(completedActions / totalActions) * 100}%` }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {retrosStats
                .filter((r: { id: string }) => (actionsByRetro[r.id] ?? []).length > 0)
                .map((retro: { id: string; name: string }) => {
                  const items = actionsByRetro[retro.id] ?? []
                  const doneCount = items.filter((a: { completed: boolean }) => a.completed).length
                  const openCount = items.length - doneCount
                  return (
                    <div key={retro.id} className="rounded-lg border overflow-hidden">
                      {/* Retro header */}
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
                        <Link
                          href={`/retro/${retro.id}`}
                          className="text-sm font-medium hover:underline underline-offset-2 truncate"
                        >
                          {retro.name}
                        </Link>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 ml-2">
                          {openCount > 0 && <span>{openCount} open</span>}
                          {openCount > 0 && doneCount > 0 && <span>·</span>}
                          {doneCount > 0 && <span>{doneCount} done</span>}
                        </div>
                      </div>
                      {/* Items */}
                      <div className="divide-y">
                        {items.map((item: {
                          id: string
                          content: string
                          completed: boolean
                          assigned_to_user_id: string | null
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          users: any
                        }) => {
                          const assignee = item.users
                          const assigneeName = assignee?.full_name || assignee?.email || null
                          return (
                            <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                              <ActionItemCheckbox itemId={item.id} completed={item.completed} />
                              <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                                <span className={cn(
                                  'text-sm',
                                  item.completed && 'line-through text-muted-foreground'
                                )}>
                                  {item.content}
                                </span>
                                {assigneeName && (
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    → {assigneeName}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
            {actionItemsTruncated && (
              <p className="mt-4 text-xs text-muted-foreground border-t pt-3">
                Showing {ACTION_ITEMS_DISPLAY_LIMIT} of {totalActions} action items — open items shown first.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
