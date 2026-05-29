'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { login, signup, loginWithGoogle, loginWithMagicLink } from './actions'
import { Loader2, Mail } from 'lucide-react'
import { Logo } from '@/components/layout/logo'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import Link from 'next/link'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const [isLoading, setIsLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const handleAction = async (formData: FormData, action: 'login' | 'signup') => {
    setIsLoading(true)
    try {
      const result = action === 'login' ? await login(formData) : await signup(formData)
      if (result?.error) {
        toast.error(result.error)
        setIsLoading(false)
      }
    } catch (error) {
      const digest = (error as { digest?: string })?.digest
      if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) throw error
      toast.error('Something went wrong')
      setIsLoading(false)
    }
  }

  const handleMagicLink = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const result = await loginWithMagicLink(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setMagicLinkSent(true)
      }
    } catch {
      toast.error('Something went wrong')
    }
    setIsLoading(false)
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    await loginWithGoogle(next)
  }

  return (
    <>
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
          <TabsTrigger value="magic">Magic Link</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form onSubmit={(e) => { e.preventDefault(); handleAction(new FormData(e.currentTarget), 'login') }} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
            <div className="text-center">
              <Link href="/reset-password" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">
                Forgot password?
              </Link>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={(e) => { e.preventDefault(); handleAction(new FormData(e.currentTarget), 'signup') }} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" name="fullName" placeholder="John Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-xs text-muted-foreground font-normal leading-relaxed cursor-pointer">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-primary underline underline-offset-4 hover:text-primary/80">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-primary underline underline-offset-4 hover:text-primary/80">Privacy Policy</Link>
              </Label>
            </div>
            <Button className="w-full" type="submit" disabled={isLoading || !termsAccepted}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="magic">
          {magicLinkSent ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Mail className="h-10 w-10 text-primary" />
              <p className="font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground">We sent a magic link to your inbox. Click it to sign in — no password needed.</p>
              <Button variant="ghost" size="sm" onClick={() => setMagicLinkSent(false)}>Try again</Button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleMagicLink(new FormData(e.currentTarget)) }} className="space-y-4">
              <input type="hidden" name="next" value={next} />
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email</Label>
                <Input id="magic-email" name="email" type="email" placeholder="m@example.com" required />
              </div>
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Magic Link
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <Button
        variant="outline"
        type="button"
        disabled={isLoading}
        onClick={handleGoogleLogin}
        className="w-full"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
          </svg>
        )}
        Google
      </Button>

      <p className="px-8 text-center text-sm text-muted-foreground">
        By clicking continue, you agree to our{' '}
        <Link href="/terms" className="underline underline-offset-4 hover:text-primary">Terms of Service</Link>
        {' '}and{' '}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">Privacy Policy</Link>.
      </p>
    </>
  )
}

export default function LoginPage() {
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
            <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">Enter your email below to create your account</p>
          </div>
          <Suspense fallback={<div className="h-64 animate-pulse rounded bg-muted" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
