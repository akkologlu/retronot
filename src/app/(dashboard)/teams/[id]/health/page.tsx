import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import TeamHealthCharts from '@/components/dashboard/team-health-charts'
import type { RetroHealthPoint } from '@/components/dashboard/team-health-charts'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TeamHealthPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: team } = await supabase.from('teams').select('id, name').eq('id', id).single()
  if (!team) notFound()

  const { data: membership } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', id)
    .eq('user_id', user.id)
    .single()
  if (!membership) redirect('/teams')

  // Fetch last 10 completed retros
  const { data: retros } = await supabase
    .from('retros')
    .select('id, name, created_at')
    .eq('team_id', id)
    .eq('phase', 'summary')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  const retroList = (retros ?? []).reverse()
  const retroIds = retroList.map(r => r.id)

  let healthData: RetroHealthPoint[] = []

  if (retroIds.length > 0) {
    const [participantsRes, cardsRes, actionsRes] = await Promise.all([
      supabase
        .from('retro_participants')
        .select('retro_id')
        .in('retro_id', retroIds),
      supabase
        .from('retro_cards')
        .select('retro_id')
        .in('retro_id', retroIds),
      supabase
        .from('action_items')
        .select('retro_id, completed')
        .in('retro_id', retroIds),
    ])

    const participantCounts: Record<string, number> = {}
    const cardCounts: Record<string, number> = {}
    const actionTotals: Record<string, number> = {}
    const actionDone: Record<string, number> = {}

    for (const p of participantsRes.data ?? []) {
      participantCounts[p.retro_id] = (participantCounts[p.retro_id] ?? 0) + 1
    }
    for (const c of cardsRes.data ?? []) {
      cardCounts[c.retro_id] = (cardCounts[c.retro_id] ?? 0) + 1
    }
    for (const a of actionsRes.data ?? []) {
      actionTotals[a.retro_id] = (actionTotals[a.retro_id] ?? 0) + 1
      if (a.completed) actionDone[a.retro_id] = (actionDone[a.retro_id] ?? 0) + 1
    }

    healthData = retroList.map((r, i) => {
      const total = actionTotals[r.id] ?? 0
      const done = actionDone[r.id] ?? 0
      return {
        name: `R${i + 1}`,
        date: new Date(r.created_at).toLocaleDateString(),
        participants: participantCounts[r.id] ?? 0,
        cards: cardCounts[r.id] ?? 0,
        actionsTotal: total,
        actionsDone: done,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
      }
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground -ml-2">
          <Link href={`/teams/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            {team.name}
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Health</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Trends across the last {retroList.length} completed retro{retroList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/teams/${id}`}>Overview</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/teams/${id}/health`}>Health</Link>
          </Button>
        </div>
      </div>

      <TeamHealthCharts data={healthData} />
    </div>
  )
}
