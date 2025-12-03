import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

  // Validate Token
  const { data: invite } = await (supabase
    .from('invite_links') as any)
    .select('*, teams(name)')
    .eq('token', token)
    .single()

  if (!invite) {
    return <div>Invalid or expired invite link.</div>
  }

  const { data: { user } } = await supabase.auth.getUser()

  async function joinTeam() {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/login')

    // Use RPC to join team securely
    const { error } = await (supabase.rpc as any)('join_team_via_invite', {
      invite_token: token
    })

    if (error) {
      console.error('Join team error:', error)
      // Handle error appropriately, maybe show a message
      return
    }

    // If retroId is present, add to participants
    if (retroId) {
      await (supabase.from('retro_participants') as any).insert({
        retro_id: retroId,
        user_id: user.id,
        online: true,
      })
      redirect(`/retro/${retroId}`)
    }

    redirect('/')
  }

  async function joinAsGuest(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    if (!retroId) return // Guests need a retro to join

    const supabase = await createClient()
    // Create guest participant
    // Note: This requires a way to track guests, e.g. cookie or returning the ID to client
    // For simplicity, we'll just insert and redirect, but the client needs to know who it is.
    // We might need to set a cookie here.
    
    const guestId = crypto.randomUUID()
    
    await (supabase.from('retro_participants') as any).insert({
      retro_id: retroId,
      guest_name: name,
      guest_id: guestId,
      online: true,
    })

    // Set cookie for guest session
    // This requires `cookies()` from next/headers
    const { cookies } = require('next/headers')
    cookies().set('guest-id', guestId)
    cookies().set('guest-name', name)

    redirect(`/retro/${retroId}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>You've been invited!</CardTitle>
          <CardDescription>
            Join <strong>{invite.teams?.name}</strong> on Retro App.
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

              {retroId && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or join as guest</span>
                    </div>
                  </div>

                  <form action={joinAsGuest} className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input id="name" name="name" placeholder="Guest Name" required />
                    <Button className="w-full" type="submit">
                      Join Retro as Guest
                    </Button>
                  </form>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
