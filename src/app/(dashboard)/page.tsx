import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import CreateTeamDialog from '@/components/dashboard/create-team-dialog'
import CreateRetroDialog from '@/components/dashboard/create-retro-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch teams
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false }) as { data: any[] | null }

  // Fetch recent retros (mock for now or complex join)
  const { data: retros } = await supabase
    .from('retros')
    .select('*, teams(name)')
    .order('created_at', { ascending: false })
    .limit(5) as { data: any[] | null }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.user_metadata?.full_name || user.email}</p>
        </div>
        <div className="flex gap-2">
          <CreateTeamDialog />
          <CreateRetroDialog teams={teams || []} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Retros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retros?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Your Teams</CardTitle>
            <CardDescription>Teams you are a member of.</CardDescription>
          </CardHeader>
          <CardContent>
            {teams && teams.length > 0 ? (
              <div className="space-y-4">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="font-medium">{team.name}</div>
                    <Button variant="outline" size="sm">View</Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No teams found. Create one to get started.</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Retros</CardTitle>
            <CardDescription>Jump back into your recent retrospectives.</CardDescription>
          </CardHeader>
          <CardContent>
             {retros && retros.length > 0 ? (
              <div className="space-y-4">
                {retros.map((retro) => (
                  <div key={retro.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{retro.name}</div>
                      <div className="text-xs text-muted-foreground">{retro.teams?.name} • {retro.phase}</div>
                    </div>
                    <Button variant="ghost" size="sm">Open</Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No recent retros.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
