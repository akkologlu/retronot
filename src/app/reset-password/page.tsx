'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { requestPasswordReset, updatePassword } from '@/app/login/actions'
import { Loader2, CheckCircle } from 'lucide-react'
import { Logo } from '@/components/layout/logo'
import { toast } from 'sonner'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const hasCode = searchParams.has('code')
  const isReset = searchParams.get('mode') === 'reset'
  const code = searchParams.get('code')
  const [isLoading, setIsLoading] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  const handleRequest = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const result = await requestPasswordReset(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setRequestSent(true)
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const result = await updatePassword(formData)
      if (result?.error) {
        toast.error(result.error)
        setIsLoading(false)
      }
    } catch (error) {
      const digest = (error as { digest?: string })?.digest
      if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) throw error
      toast.error('Failed to update password')
      setIsLoading(false)
    }
  }

  if (requestSent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle className="h-10 w-10 text-primary" />
        <p className="font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">We sent a password reset link to your inbox.</p>
      </div>
    )
  }

  if (hasCode || isReset) {
    return (
      <form action={handleUpdate} className="space-y-4">
        {code && <input type="hidden" name="code" value={code} />}
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" required minLength={6} placeholder="At least 6 characters" />
        </div>
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set New Password
        </Button>
      </form>
    )
  }

  return (
    <form action={handleRequest} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="m@example.com" required />
      </div>
      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send Reset Link
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        {/* Background */}
        <div className="absolute inset-0 bg-[#0F172A]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 15% 40%, rgba(79,70,229,0.14) 0%, transparent 100%), radial-gradient(ellipse 40% 35% at 85% 15%, rgba(245,158,11,0.09) 0%, transparent 100%)',
          }}
        />

        {/* Logo */}
        <div className="relative z-20">
          <Logo size="md" dark />
        </div>

        {/* Board mockup */}
        <div className="relative z-20 flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">

            {/* Phase pills */}
            <div className="flex items-center mb-7">
              {['Write', 'Group', 'Vote', 'Discuss'].map((phase, i) => (
                <div key={phase} className="flex items-center">
                  {i > 0 && <div className="w-5 h-px bg-white/15 mx-1.5" />}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    i === 0
                      ? 'bg-amber-400 text-amber-950 shadow-lg shadow-amber-400/20'
                      : 'bg-white/10 text-white/30'
                  }`}>
                    {phase}
                  </span>
                </div>
              ))}
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {/* Row 1: amber sticky notes */}
              <div className="flex gap-3">
                <div
                  className="flex-1 bg-amber-400 rounded-xl p-3.5 shadow-xl shadow-amber-500/10"
                  style={{ transform: 'rotate(-1.5deg)' }}
                >
                  <p className="text-amber-950 text-xs font-semibold leading-snug">Shipped new API on time 🚀</p>
                </div>
                <div
                  className="flex-1 bg-amber-300 rounded-xl p-3.5 shadow-xl shadow-amber-300/10"
                  style={{ transform: 'rotate(1.2deg)' }}
                >
                  <p className="text-amber-950 text-xs font-semibold leading-snug">Team sync was focused &amp; productive</p>
                </div>
              </div>

              {/* Row 2: glass cards */}
              <div className="flex gap-3">
                <div
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3.5"
                  style={{ transform: 'rotate(0.8deg)' }}
                >
                  <p className="text-white/50 text-xs font-medium leading-snug">CI pipeline kept breaking deploys</p>
                </div>
                <div
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3.5"
                  style={{ transform: 'rotate(-0.8deg)' }}
                >
                  <p className="text-white/50 text-xs font-medium leading-snug">Sprint planning ran 30 min over</p>
                </div>
              </div>

              {/* Row 3: action item + voted card */}
              <div className="flex gap-3">
                <div
                  className="flex-1 bg-indigo-500/10 border border-indigo-400/20 rounded-xl p-3.5"
                  style={{ transform: 'rotate(-0.5deg)' }}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <p className="text-indigo-200/70 text-xs font-medium leading-snug">Set up automated testing pipeline</p>
                  </div>
                </div>
                <div
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col justify-between"
                  style={{ transform: 'rotate(0.5deg)' }}
                >
                  <p className="text-white/40 text-xs font-medium leading-snug">Better code review process</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="flex -space-x-1">
                      {[0, 1, 2].map(n => (
                        <div key={n} className="h-3.5 w-3.5 rounded-full bg-indigo-500/40 border border-[#0F172A]" />
                      ))}
                    </div>
                    <span className="text-white/30 text-xs">8 votes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats bar */}
            <div className="mt-5 flex items-center gap-2 text-xs text-white/25 border-t border-white/8 pt-4">
              <span>6 participants</span>
              <span className="text-white/15">·</span>
              <span>14 notes</span>
              <span className="text-white/15">·</span>
              <span>23 votes cast</span>
            </div>
          </div>
        </div>

        {/* Tagline + quote */}
        <div className="relative z-20 space-y-4">
          <p className="text-2xl font-light leading-snug text-white/90">
            Retros that stick.
          </p>
          <blockquote className="space-y-2 border-l-2 border-amber-400 pl-4">
            <p className="text-sm text-white/70">
              &ldquo;We cut our retro time in half and actually follow through on action items now.&rdquo;
            </p>
            <footer className="text-xs text-white/50">Engineering Lead, Series B startup</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
            <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
          </div>
          <Suspense fallback={<div className="h-32 animate-pulse rounded bg-muted" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
