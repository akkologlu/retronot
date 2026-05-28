import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users } from 'lucide-react'
import CreateTeamDialog from '@/components/dashboard/create-team-dialog'
import InviteCopyButton from './_components/invite-copy-button'

export const metadata: Metadata = {
  title: 'Teams | RetroNot',
  description: 'Manage your teams.',
  robots: { index: false },
}

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: teams } = await supabase
    .from('teams')
    .select('*, team_members(count)')
    .order('created_at', { ascending: false }) as { data: any[] | null } // eslint-disable-line @typescript-eslint/no-explicit-any

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">Manage your teams and invite members.</p>
        </div>
        <CreateTeamDialog />
      </div>

      {!teams || teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No teams yet</h3>
            <p className="text-muted-foreground text-sm">Create a team to start collaborating.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const memberCount = team.team_members?.[0]?.count ?? 0
            const isOwner = team.owner_id === user.id
            return (
              <Card key={team.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-3">
                  <Link href={`/teams/${team.id}`} className="block group/link">
                    <CardTitle className="text-lg group-hover/link:text-primary transition-colors">{team.name}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                      {isOwner && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Owner</span>}
                    </CardDescription>
                  </Link>
                </CardHeader>
                <CardContent>
                  <InviteCopyButton teamId={team.id} />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
