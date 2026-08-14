'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { updateProfile } from '@/app/actions/user'
import AvatarPickerDialog from './avatar-picker-dialog'

// Supabase's storage CDN can briefly fail to serve a freshly uploaded object
// right after an upsert overwrite. We don't want to hammer it, so this checks
// a few times with backoff and gives up quietly if it never comes up — the
// local preview stays on screen either way, and the correct URL is already
// persisted to the DB for the next real page load to pick up.
function tryLoadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

async function waitUntilAvatarReady(url: string, attempts = 4, delayMs = 1000): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (await tryLoadImage(url)) return true
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}

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
  const previewUrlRef = useRef<string | null>(null)

  const persistAvatarUrl = async (url: string) => {
    await Promise.all([
      supabase.from('users').update({ avatar_url: url }).eq('id', userId),
      supabase.auth.updateUser({ data: { avatar_url: url } }),
    ])
    router.refresh()
  }

  const clearPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }

  const handleSelectPreset = async (url: string) => {
    setUploading(true)
    try {
      await persistAvatarUrl(url)
      setAvatarUrl(url)
      toast.success('Avatar updated')
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

    // Show the picked file immediately — Supabase's CDN can take a few
    // seconds to reliably serve a freshly uploaded object, so we don't want
    // the user staring at the fallback initial in the meantime.
    clearPreview()
    const preview = URL.createObjectURL(file)
    previewUrlRef.current = preview
    setAvatarUrl(preview)

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      await persistAvatarUrl(url)
      toast.success('Avatar updated')

      // Best-effort: swap to the real remote URL once it's confirmed
      // loadable, so we're not stuck on a blob: URL forever. If it's still
      // not ready, keep showing the preview — the saved DB URL will render
      // fine on the next normal page load.
      if (await waitUntilAvatarReady(url)) {
        clearPreview()
        setAvatarUrl(url)
      }
    } catch {
      toast.error('Failed to upload avatar')
      clearPreview()
      setAvatarUrl(initialAvatarUrl)
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
