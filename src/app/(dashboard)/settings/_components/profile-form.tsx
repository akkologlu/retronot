'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { updateProfile } from '@/app/actions/user'
import AvatarPickerDialog from './avatar-picker-dialog'
import { useResolvedAvatarUrl } from '@/hooks/use-resolved-avatar-url'

interface ProfileFormProps {
  userId: string
  email: string
  initialName: string
  initialAvatarUrl: string | null
}

export default function ProfileForm({ userId, email, initialName, initialAvatarUrl }: ProfileFormProps) {
  const resolvedUrl = useResolvedAvatarUrl(initialAvatarUrl)
  const [preview, setPreview] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)
  const pendingUrlRef = useRef<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  const setPreviewUrl = (url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url
    setPreview(url)
  }

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    []
  )

  // Once the server has caught up with the URL we just persisted (and it's
  // been resolved to something displayable), drop the local preview.
  useEffect(() => {
    if (pendingUrlRef.current && initialAvatarUrl === pendingUrlRef.current && resolvedUrl) {
      pendingUrlRef.current = null
      setPreviewUrl(null)
    }
  }, [initialAvatarUrl, resolvedUrl])

  const persistAvatarUrl = async (url: string) => {
    pendingUrlRef.current = url
    await Promise.all([
      supabase.from('users').update({ avatar_url: url }).eq('id', userId),
      supabase.auth.updateUser({ data: { avatar_url: url } }),
    ])
    router.refresh()
  }

  const handleSelectPreset = async (url: string) => {
    setUploading(true)
    try {
      await persistAvatarUrl(url)
      toast.success('Avatar updated')
    } catch {
      toast.error('Failed to update avatar')
      pendingUrlRef.current = null
    } finally {
      setUploading(false)
    }
  }

  const handleSelectFile = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB')
      return
    }

    // Show the picked file immediately — the persisted URL still has to
    // round-trip through the server and get resolved, so this is what makes
    // the change feel instant.
    setPreviewUrl(URL.createObjectURL(file))

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await persistAvatarUrl(`${publicUrl}?t=${Date.now()}`)
      toast.success('Avatar updated')
    } catch {
      toast.error('Failed to upload avatar')
      pendingUrlRef.current = null
      setPreviewUrl(null)
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

  const avatarUrl = preview ?? resolvedUrl

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
