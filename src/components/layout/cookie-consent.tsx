'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Cookie } from 'lucide-react'

const CONSENT_KEY = 'retronot-cookie-consent'

interface CookieConsent {
  essential: boolean
  functional: boolean
  analytics: boolean
  timestamp: string
}

function getConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CookieConsent
  } catch {
    return null
  }
}

function setConsent(consent: CookieConsent) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const existing = getConsent()
    if (!existing) {
      const timer = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = (all: boolean) => {
    setConsent({
      essential: true,
      functional: all,
      analytics: all,
      timestamp: new Date().toISOString(),
    })
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-4 duration-300"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 shadow-lg">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Cookie className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use cookies for authentication, preferences, and analytics.
              Read our{' '}
              <Link
                href="/cookie-policy"
                className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
              >
                Cookie Policy
              </Link>{' '}
              for details.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => accept(false)}
            >
              Essentials Only
            </Button>
            <Button
              size="sm"
              onClick={() => accept(true)}
            >
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
