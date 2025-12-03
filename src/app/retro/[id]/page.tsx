import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RetroPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { data: retro, error } = await (supabase
    .from('retros') as any)
    .select('phase')
    .eq('id', id)
    .single()

  if (!retro) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-red-500">Retro not found</h1>
        <pre className="mt-2 rounded bg-gray-100 p-2 text-sm text-black">
          {JSON.stringify(error, null, 2)}
        </pre>
        <p className="mt-2 text-sm text-gray-500">ID: {id}</p>
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
