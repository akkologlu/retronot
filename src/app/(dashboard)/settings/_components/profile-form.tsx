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

// Supabase's storage CDN returns 503 when the request carries Cloudflare's
// `__cf_bm` cookie (it's SameSite=None, so the browser attaches it to any
// cross-site <img> request once it's been set). A plain `<img src>` to a
// Supabase storage URL is therefore unreliable. Fetching the bytes ourselves
// with credentials omitted sidesteps it entirely and we render from a blob.
async function fetchAsObjectUrl(url: string, attempts = 3, delayMs = 500): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { credentials: 'omit', cache: 'no-store' })
      if (res.ok) return URL.createObjectURL(await res.blob())
    } catch {
      // network hiccup, retry
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs))
  }
  return null
}

interface ProfileFormProps {
  userId: string
  email: string
  initialName: string
  initialAvatarUrl: string | null
}

export default function ProfileForm({ userId, email, initialName, initialAvatarUrl }: ProfileFormProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()
  const objectUrlRef = useRef<string | null>(null)

  const setDisplayUrl = (url: string | null, isObjectUrl = false) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (isObjectUrl && url) objectUrlRef.current = url
    setAvatarUrl(url)
  }

  // Whenever the server-provided avatar URL changes (initial load, or after
  // router.refresh() picks up a newly saved one), resolve it through the
  // cookieless fetch path before displaying it.
  useEffect(() => {
    let cancelled = false
    if (!initialAvatarUrl) {
      setDisplayUrl(null)
      return
    }
    fetchAsObjectUrl(initialAvatarUrl).then((objectUrl) => {
      if (!cancelled && objectUrl) setDisplayUrl(objectUrl, true)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAvatarUrl])

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    []
  )

  const persistAvatarUrl = async (url: string) => {
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
      const objectUrl = await fetchAsObjectUrl(url)
      setDisplayUrl(objectUrl ?? url, !!objectUrl)
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

    // Show the picked file immediately — the remote URL still has to clear
    // the fetch above, so this is what makes the change feel instant.
    setDisplayUrl(URL.createObjectURL(file), true)

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
      // router.refresh() will update initialAvatarUrl, which re-triggers the
      // effect above and swaps the preview for the real fetched image.
    } catch {
      toast.error('Failed to upload avatar')
      const fallback = initialAvatarUrl ? await fetchAsObjectUrl(initialAvatarUrl) : null
      setDisplayUrl(fallback, !!fallback)
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
