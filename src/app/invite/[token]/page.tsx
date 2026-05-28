import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'

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
    return <div>Invalid or expired invite link.</div>
  }

  const { data: { user } } = await supabase.auth.getUser()

  async function joinTeam() {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/login')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.rpc('join_team_via_invite', { p_token: token })

    if (error) {
      // Error joining team — redirect will not happen, user stays on page
      return
    }

    // If retroId is present, add to participants
    if (retroId) {
      await supabase.from('retro_participants').insert({
        retro_id: retroId,
        user_id: user.id,
        online: true,
      })
      redirect(`/retro/${retroId}`)
    }

    redirect('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
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
                <Button className="w-full" type="submit">
                  Join Team {retroId && '& Retro'}
                </Button>
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
