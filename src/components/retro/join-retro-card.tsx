'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Users } from 'lucide-react'

function JoinButton() {
  const { pending } = useFormStatus()
  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Join Team &amp; Retro
    </Button>
  )
}

export function JoinRetroCard({ teamName, userEmail }: { teamName: string; userEmail: string }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Join to continue</CardTitle>
        <CardDescription>
          You need to join <strong>{teamName}</strong> to view this retro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          Logged in as <strong>{userEmail}</strong>
        </p>
        <JoinButton />
      </CardContent>
    </Card>
  )
}
