import Link from 'next/link'
import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8 text-center">
      <Logo size="md" />

      <div className="space-y-3 max-w-sm">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Link expired</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Magic links expire after a short time. Request a new one and click it right away.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button asChild>
          <Link href="/login">Request new link</Link>
        </Button>
        <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Sign in with password instead
        </Link>
      </div>
    </div>
  )
}
