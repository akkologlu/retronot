'use client'

import { useEffect, useRef, useState } from 'react'

// Supabase's storage CDN returns 503 when the request carries Cloudflare's
// `__cf_bm` cookie (it's SameSite=None, so the browser attaches it to any
// cross-site <img> request once it's been set anywhere), and our CSP's
// img-src doesn't allowlist the Supabase domain in the first place — only
// 'self', data:, blob: and dicebear are allowed. So a plain `<img src>`
// pointed at a Supabase storage URL never works. Fetching the bytes
// ourselves (allowed by connect-src) and rendering from a blob: URL
// sidesteps both problems. Other origins (e.g. the dicebear presets) are
// already allowlisted in img-src and have no cookie issue, so they're left
// alone — fetching them would only fail: they're not in connect-src.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

function needsCookielessFetch(url: string): boolean {
  return !!SUPABASE_URL && url.startsWith(SUPABASE_URL)
}

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
 * Resolves an avatar URL to something safe for <img src>, re-resolving
 * whenever the URL changes. blob:/data: URLs and non-Supabase origins
 * (e.g. dicebear) pass through unchanged and don't need a fetch at all.
 */
export function useResolvedAvatarUrl(url: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<{ forUrl: string; blobUrl: string } | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!url || !needsCookielessFetch(url)) return

    let cancelled = false
    fetchAsObjectUrl(url).then((objectUrl) => {
      if (cancelled || !objectUrl) return
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = objectUrl
      setResolved({ forUrl: url, blobUrl: objectUrl })
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

  if (!url) return null
  if (!needsCookielessFetch(url)) return url
  return resolved?.forUrl === url ? resolved.blobUrl : null
}
