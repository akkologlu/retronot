'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Upload, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESET_STYLES = [
  { style: 'avataaars', seed: 'Felix' },
  { style: 'avataaars', seed: 'Mia' },
  { style: 'avataaars', seed: 'Leo' },
  { style: 'avataaars', seed: 'Luna' },
  { style: 'bottts', seed: 'Bolt' },
  { style: 'bottts', seed: 'Nova' },
  { style: 'bottts', seed: 'Zion' },
  { style: 'bottts', seed: 'Pixel' },
  { style: 'fun-emoji', seed: 'Tiger' },
  { style: 'fun-emoji', seed: 'Panda' },
  { style: 'fun-emoji', seed: 'Fox' },
  { style: 'fun-emoji', seed: 'Bear' },
  { style: 'lorelei', seed: 'Alex' },
  { style: 'lorelei', seed: 'Sam' },
  { style: 'lorelei', seed: 'Jordan' },
  { style: 'lorelei', seed: 'Riley' },
]

function presetUrl(style: string, seed: string) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}

interface AvatarPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPreset: (url: string) => void
  onSelectFile: (file: File) => void
  uploading: boolean
}

export default function AvatarPickerDialog({
  open,
  onOpenChange,
  onSelectPreset,
  onSelectFile,
  uploading,
}: AvatarPickerDialogProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const handlePresetSelect = (url: string) => {
    setSelected(url)
  }

  const handlePresetConfirm = () => {
    if (!selected) return
    onSelectPreset(selected)
    onOpenChange(false)
  }

  const handleFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) return
    onSelectFile(file)
    onOpenChange(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Avatar</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="presets">
          <TabsList className="w-full">
            <TabsTrigger value="presets" className="flex-1">Presets</TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">Upload Photo</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="mt-4 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {PRESET_STYLES.map(({ style, seed }) => {
                const url = presetUrl(style, seed)
                const isSelected = selected === url
                return (
                  <button
                    key={`${style}-${seed}`}
                    type="button"
                    onClick={() => handlePresetSelect(url)}
                    className={cn(
                      'relative rounded-full overflow-hidden ring-2 ring-offset-2 transition-all hover:ring-primary',
                      isSelected ? 'ring-primary' : 'ring-transparent'
                    )}
                  >
                    <Image
                      src={url}
                      alt={`${style} ${seed}`}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <Button
              className="w-full"
              disabled={!selected || uploading}
              onClick={handlePresetConfirm}
            >
              {uploading ? 'Saving...' : 'Use Selected Avatar'}
            </Button>
          </TabsContent>

          <TabsContent value="upload" className="mt-4 space-y-4">
            <div
              ref={dropRef}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer',
                dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Drop image here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP · max 2MB</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileInput}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
