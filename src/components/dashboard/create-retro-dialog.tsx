'use client'

import { useState } from 'react'
import { Plus, Loader2, LayoutTemplate } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRetro } from '@/app/actions/retro'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TEMPLATES = [
  { id: 'start-stop-continue', name: 'Start, Stop, Continue', colors: ['bg-green-100', 'bg-red-100', 'bg-blue-100'] },
  { id: 'sad-mad-happy', name: 'Sad, Mad, Happy', colors: ['bg-blue-100', 'bg-red-100', 'bg-yellow-100'] },
  { id: 'keep-problem-try', name: 'Keep, Problem, Try', colors: ['bg-green-100', 'bg-orange-100', 'bg-blue-100'] },
]

interface CreateRetroDialogProps {
  teams: { id: string; name: string }[]
}

export default function CreateRetroDialog({ teams }: CreateRetroDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const result = await createRetro(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        // Redirect happens in server action
        setOpen(false)
      }
    } catch (error) {
      toast.error('Failed to create retro')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Retro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Retro</DialogTitle>
          <DialogDescription>
            Start a new retrospective session with your team.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Retro Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Sprint 34 Retro"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="teamId">Team</Label>
              <Select name="teamId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Template</Label>
              <input type="hidden" name="templateType" value={selectedTemplate} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      "cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary",
                      selectedTemplate === template.id ? "border-primary bg-primary/5" : "border-transparent bg-muted"
                    )}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className="flex gap-1 mb-2">
                      {template.colors.map((color, i) => (
                        <div key={i} className={cn("h-2 w-2 rounded-full", color)} />
                      ))}
                    </div>
                    <div className="font-medium text-sm">{template.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Retro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
