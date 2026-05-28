import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-muted/20">
      <Sidebar
        user={user}
        displayName={profile?.full_name || user.user_metadata?.full_name || ''}
        avatarUrl={profile?.avatar_url || user.user_metadata?.avatar_url || null}
      />
      <main id="main-content" className="flex-1 overflow-y-auto p-8 pt-20 md:pt-8">
        {children}
      </main>
    </div>
  )
}
