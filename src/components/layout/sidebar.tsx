'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Settings, LogOut, Sun, Moon, FileStack, Menu, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { useTheme } from 'next-themes'
import { useSyncExternalStore, useState } from 'react'
import { Logo } from '@/components/layout/logo'

const emptySubscribe = () => () => {}

interface SidebarProps {
  user: User
  displayName: string
  avatarUrl: string | null
}

export default function Sidebar({ user, displayName, avatarUrl }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teams', label: 'Teams', icon: Users },
    { href: '/templates', label: 'Templates', icon: FileStack },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const sidebarContent = (
    <>
      <div className="mb-8 flex items-center justify-between px-2">
        <Logo size="sm" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>

      <div className="mt-auto border-t pt-4">
        <div className="mb-4 flex items-center gap-3 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl ?? undefined} className="object-cover" />
            <AvatarFallback>{(displayName || user.email || 'U')[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">{displayName || user.email || 'User'}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
         >
          {mounted && theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {mounted && theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive" onClick={() => setSignOutOpen(true)}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Sign out confirmation dialog */}
      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setSignOutOpen(false)}
              disabled={signingOut}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex-1 sm:flex-none"
            >
              {signingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Mobile hamburger */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b bg-card px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="ml-3">
          <Logo size="sm" />
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 flex-col border-r bg-card px-4 py-6 transition-transform duration-200 md:hidden",
        mobileOpen ? 'flex translate-x-0' : 'hidden -translate-x-full'
      )}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden w-64 flex-col border-r bg-card px-4 py-6 md:flex">
        {sidebarContent}
      </div>
    </>
  )
}
