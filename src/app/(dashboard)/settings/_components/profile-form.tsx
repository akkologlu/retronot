'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { updateProfile } from '@/app/actions/user'
import AvatarPickerDialog from './avatar-picker-dialog'

interface ProfileFormProps {
  userId: string
  email: string
  initialName: string
  initialAvatarUrl: string | null
}

export default function ProfileForm({ userId, email, initialName, initialAvatarUrl }: ProfileFormProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  const saveAvatarUrl = async (url: string) => {
    await Promise.all([
      supabase.from('users').update({ avatar_url: url }).eq('id', userId),
      supabase.auth.updateUser({ data: { avatar_url: url } }),
    ])
    setAvatarUrl(url)
    router.refresh()
    toast.success('Avatar updated')
  }

  const handleSelectPreset = async (url: string) => {
    setUploading(true)
    try {
      await saveAvatarUrl(url)
    } catch {
      toast.error('Failed to update avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleSelectFile = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await saveAvatarUrl(publicUrl)
    } catch {
      toast.error('Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await updateProfile(formData)
      toast.success('Profile updated')
    })
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl ?? undefined} className="object-cover" />
            <AvatarFallback>{(initialName || email || 'U')[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={uploading}
            onClick={() => setPickerOpen(true)}
          >
            {uploading ? 'Saving...' : 'Change Avatar'}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={initialName}
            placeholder="Your Name"
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>

      <AvatarPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelectPreset={handleSelectPreset}
        onSelectFile={handleSelectFile}
        uploading={uploading}
      />
    </>
  )
}
