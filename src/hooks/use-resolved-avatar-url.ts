'use client'

import { useEffect, useRef, useState } from 'react'

// Supabase's storage CDN returns 503 when the request carries Cloudflare's
// `__cf_bm` cookie (it's SameSite=None, so the browser attaches it to any
// cross-site <img> request once it's been set anywhere). A plain `<img src>`
// pointed straight at a Supabase storage URL is therefore unreliable.
// Fetching the bytes ourselves with credentials omitted sidesteps it.
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

/**
 * Resolves a remote avatar URL to a blob: URL that's safe to hand to <img>,
 * bypassing the cookie issue above. blob:/data: URLs (e.g. a local upload
 * preview) pass through unchanged.
 */
export function useResolvedAvatarUrl(url: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    if (!url) {
      setResolved(null)
      return
    }

    if (url.startsWith('blob:') || url.startsWith('data:')) {
      setResolved(url)
      return
    }

    setResolved(null)
    fetchAsObjectUrl(url).then((objectUrl) => {
      if (cancelled || !objectUrl) return
      objectUrlRef.current = objectUrl
      setResolved(objectUrl)
    })

    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    []
  )

  return resolved
}
