import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RetroPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { data: retro } = await supabase
    .from('retros')
    .select('phase')
    .eq('id', id)
    .single()

  if (!retro) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <p className="text-6xl font-bold text-muted-foreground/20">404</p>
        <h1 className="mt-2 text-xl font-semibold">Retro not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This retro may have been deleted or you don&apos;t have access.
        </p>
      </div>
    )
  }

  // Redirect to the current phase
  if (retro.phase === 'lobby') {
    redirect(`/retro/${id}/lobby`)
  } else if (retro.phase === 'summary') {
    redirect(`/retro/${id}/summary`)
  } else {
    redirect(`/retro/${id}/board`)
  }
}
