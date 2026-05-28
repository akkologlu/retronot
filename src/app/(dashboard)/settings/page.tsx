import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Database } from '@/types/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import ProfileForm from './_components/profile-form'

type UserProfile = Database['public']['Tables']['users']['Row']

export const metadata: Metadata = {
  title: 'Settings | RetroNot',
  description: 'Manage your profile settings.',
  robots: { index: false },
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profileResult = await supabase.from('users').select('*').eq('id', user.id).single()
  const profile = profileResult.data as UserProfile | null

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Manage your public profile settings.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your name and avatar.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              userId={user.id}
              email={user.email ?? ''}
              initialName={profile?.full_name || user.user_metadata?.full_name || ''}
              initialAvatarUrl={profile?.avatar_url || user.user_metadata?.avatar_url || null}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
