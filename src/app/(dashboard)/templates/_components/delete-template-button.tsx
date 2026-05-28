'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    setIsDeleting(true)
    const { error } = await supabase.from('retro_templates').delete().eq('id', templateId)
    setIsDeleting(false)
    if (error) {
      toast.error('Failed to delete template')
    } else {
      toast.success('Template deleted')
      router.refresh()
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
      onClick={handleDelete}
      disabled={isDeleting}
      title="Delete template"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}
