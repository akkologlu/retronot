'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, GripVertical, Save, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type Column = { name: string; color: string }

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899']

interface TemplateBuilderProps {
  teamId: string
  userId: string
  onCreated?: () => void
}

export default function TemplateBuilder({ teamId, userId, onCreated }: TemplateBuilderProps) {
  const [name, setName] = useState('')
  const [columns, setColumns] = useState<Column[]>([
    { name: '', color: DEFAULT_COLORS[0] },
    { name: '', color: DEFAULT_COLORS[1] },
    { name: '', color: DEFAULT_COLORS[2] },
  ])
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const addColumn = () => {
    if (columns.length >= 6) return
    setColumns(prev => [...prev, { name: '', color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length] }])
  }

  const removeColumn = (idx: number) => {
    if (columns.length <= 2) return
    setColumns(prev => prev.filter((_, i) => i !== idx))
  }

  const updateColumn = (idx: number, field: keyof Column, value: string) => {
    setColumns(prev => prev.map((col, i) => i === idx ? { ...col, [field]: value } : col))
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Template name required'); return }
    const validColumns = columns.filter(c => c.name.trim())
    if (validColumns.length < 2) { toast.error('At least 2 columns required'); return }

    setIsSaving(true)
    try {
      const { error } = await supabase.from('retro_templates').insert({
        team_id: teamId,
        name: name.trim(),
        columns: validColumns,
        created_by: userId,
      })
      if (error) throw error
      toast.success('Template created')
      setName('')
      setColumns([
        { name: '', color: DEFAULT_COLORS[0] },
        { name: '', color: DEFAULT_COLORS[1] },
        { name: '', color: DEFAULT_COLORS[2] },
      ])
      router.refresh()
      onCreated?.()
    } catch {
      toast.error('Failed to create template')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New Template</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tpl-name">Template name</Label>
          <Input
            id="tpl-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. 4Ls"
            maxLength={80}
          />
        </div>

        <div className="space-y-2">
          <Label>Columns ({columns.length}/6)</Label>
          <div className="space-y-2">
            {columns.map((col, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="color"
                  value={col.color}
                  onChange={e => updateColumn(idx, 'color', e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-input p-0.5 shrink-0"
                  title="Column color"
                />
                <Input
                  value={col.name}
                  onChange={e => updateColumn(idx, 'name', e.target.value.slice(0, 40))}
                  placeholder={`Column ${idx + 1}`}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeColumn(idx)}
                  disabled={columns.length <= 2}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          {columns.length < 6 && (
            <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addColumn}>
              <Plus className="mr-2 h-3 w-3" />
              Add column
            </Button>
          )}
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          Save Template
        </Button>
      </CardContent>
    </Card>
  )
}
