import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Logo } from '@/components/layout/logo'
import { JoinTeamButton } from './join-team-button'


export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ retroId?: string }>
}) {
  const supabase = await createClient()
  const { token } = await params
  const { retroId } = await searchParams

  const inviteResult = await supabase
    .from('invite_links')
    .select('*, teams(name)')
    .eq('token', token)
    .single()
  const invite = inviteResult.data as (typeof inviteResult.data & { teams: { name: string } | null }) | null

  if (!invite || (invite.expires_at && new Date(invite.expires_at) < new Date())) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center">
        <Logo size="md" />
        <div className="space-y-2">
          <p className="text-6xl font-bold tracking-tighter text-primary/20">Expired</p>
          <h1 className="text-xl font-semibold">Invalid or expired invite link</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            This invite link is no longer valid. Please ask for a new one.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()

  async function joinTeam() {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/login')

    const { error } = await supabase.rpc('join_team_via_invite', { p_token: token })

    if (error) {
      // If the RPC fails, still try to redirect so the user isn't stuck
      if (retroId) {
        redirect(`/retro/${retroId}`)
      }
      redirect('/dashboard')
    }

    // If retroId is present, add to participants and go to retro
    if (retroId) {
      await supabase.from('retro_participants').upsert(
        { retro_id: retroId, user_id: user.id, online: true },
        { onConflict: 'retro_id,user_id', ignoreDuplicates: true }
      )
      redirect(`/retro/${retroId}`)
    }

    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <CardTitle>You&apos;ve been invited!</CardTitle>
          <CardDescription>
            Join <strong>{invite.teams?.name}</strong> on RetroNot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <div className="space-y-4">
              <p className="text-center text-sm">
                Logged in as <strong>{user.email}</strong>
              </p>
              <form action={joinTeam}>
                <JoinTeamButton hasRetro={!!retroId} />
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Button asChild className="w-full" variant="outline">
                  <Link href={`/login?next=/invite/${token}${retroId ? `?retroId=${retroId}` : ''}`}>
                    Login to Join
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
