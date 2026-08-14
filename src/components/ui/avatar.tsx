"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { useResolvedAvatarUrl } from "@/hooks/use-resolved-avatar-url"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

// Drop-in replacement for AvatarImage when `src` may be a Supabase storage
// URL: resolves it through useResolvedAvatarUrl first (see that hook for
// why a plain <img src> to those URLs is unreliable).
function RemoteAvatarImage({
  src,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  const resolved = useResolvedAvatarUrl(typeof src === "string" ? src : null)
  return <AvatarImage src={resolved ?? undefined} {...props} />
}

export { Avatar, AvatarImage, AvatarFallback, RemoteAvatarImage }
