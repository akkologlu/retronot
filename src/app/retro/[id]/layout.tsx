import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RetroInitializer from '@/components/retro/retro-initializer'
import { ParticipantsSidebar } from '@/components/retro/participants-sidebar'
import { Logo } from '@/components/layout/logo'
import { JoinRetroCard } from '@/components/retro/join-retro-card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function RetroLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { id: retroId } = await params

  if (!user) {
    redirect(`/login?next=/retro/${retroId}`)
  }

  // Check retro access using SECURITY DEFINER function (bypasses RLS).
  // This tells us whether the retro exists and whether the user is a team member.
  const { data: accessRows } = await supabase.rpc('check_retro_access', { p_retro_id: retroId })
  const access = accessRows?.[0]

  if (!access) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8 text-center">
        <Logo size="md" />
        <div className="space-y-2">
          <p className="text-8xl font-bold tracking-tighter text-primary/20">404</p>
          <h1 className="text-2xl font-semibold tracking-tight">Retro not found</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            This retro may have been deleted or you don&apos;t have access. Ask your team admin for an invite link.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  // If user is not a team member, show the join page
  if (!access.is_team_member) {
    async function joinRetro() {
      'use server'
      const supabase = await createClient()
      await supabase.rpc('join_team_via_retro', { p_retro_id: retroId })
      redirect(`/retro/${retroId}`)
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <form action={joinRetro}>
          <JoinRetroCard teamName={access.team_name} userEmail={user.email || ''} />
        </form>
      </div>
    )
  }

  // User is a team member — ensure they're also a participant
  await supabase
    .from('retro_participants')
    .upsert(
      { retro_id: retroId, user_id: user.id, online: true },
      { onConflict: 'retro_id,user_id', ignoreDuplicates: true }
    )

  // Fetch all initial data
  const [
    retroResult,
    participantsResult,
    cardsResult,
    groupsResult,
    votesResult,
    actionItemsResult,
  ] = await Promise.all([
    supabase.from('retros').select('*').eq('id', retroId).single(),
    supabase.from('retro_participants').select('*, users(*)').eq('retro_id', retroId),
    supabase.from('retro_cards').select('*').eq('retro_id', retroId),
    supabase.from('retro_groups').select('*').eq('retro_id', retroId),
    supabase.from('retro_votes').select('*').eq('retro_id', retroId),
    supabase.from('action_items').select('*').eq('retro_id', retroId)
  ])

  const retro = retroResult.data
  const participants = participantsResult.data
  const cards = cardsResult.data
  const groups = groupsResult.data
  const votes = votesResult.data
  const actionItems = actionItemsResult.data

  if (!retro) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8 text-center">
        <Logo size="md" />

        <div className="space-y-2">
          <p className="text-8xl font-bold tracking-tighter text-primary/20">404</p>
          <h1 className="text-2xl font-semibold tracking-tight">Retro not found</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            This retro may have been deleted or you don&apos;t have access. Ask your team admin for an invite link.
          </p>
        </div>

        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <RetroInitializer
        retro={retro}
        participants={participants || []}
        cards={cards || []}
        groups={groups || []}
        votes={votes || []}
        actionItems={actionItems || []}
        userId={user.id}
      />
      <div className="flex flex-1 overflow-hidden">
        <ParticipantsSidebar />
        <main id="main-content" className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
