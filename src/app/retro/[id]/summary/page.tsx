'use client'

import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import { useRef, useState, useMemo } from 'react'
import { useRetroStore } from '@/lib/store/retro-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, CheckCircle2, Image as ImageIcon } from 'lucide-react'

import { TEMPLATE_COLUMNS, COLUMN_COLORS } from '@/lib/constants'

export default function SummaryPage() {
  const { retro, cards, votes, actionItems, groups } = useRetroStore()
  const [isExporting, setIsExporting] = useState(false)
  const [isSavingImage, setIsSavingImage] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Process data to display in columns
  const columns = useMemo(() => {
    if (retro?.config && typeof retro.config === 'object' && 'columns' in retro.config) {
      return (retro.config as { columns: { id: string; name: string; color: string }[] }).columns
    }
    
    // Fallback to template columns
    if (retro?.template_type && retro.template_type in TEMPLATE_COLUMNS) {
      return TEMPLATE_COLUMNS[retro.template_type].map(name => ({
        id: name,
        name: name,
        color: COLUMN_COLORS[name] || '#6B7280' // Default gray
      }))
    }

    return []
  }, [retro])

  const processedItems = useMemo(() => {
    const items: { type: 'single' | 'group', id: string, cards: typeof cards, voteCount: number, column: string }[] = []
    const processedCardIds = new Set<string>()

    // Process groups first
    groups.forEach(group => {
      const groupCards = cards.filter(c => c.group_id === group.id)
      if (groupCards.length > 0) {
        const groupVoteCount = groupCards.reduce((acc, card) => {
          return acc + votes.filter(v => v.card_id === card.id).length
        }, 0)
        
        // Determine column from the first card (assuming all cards in group are in same column)
        const column = groupCards[0].column_name

        items.push({
          type: 'group',
          id: groupCards[0].id,
          cards: groupCards,
          voteCount: groupVoteCount,
          column
        })
        groupCards.forEach(c => processedCardIds.add(c.id))
      }
    })

    // Process remaining single cards
    cards.forEach(card => {
      if (!processedCardIds.has(card.id)) {
        const voteCount = votes.filter(v => v.card_id === card.id).length
        items.push({
          type: 'single',
          id: card.id,
          cards: [card],
          voteCount,
          column: card.column_name
        })
      }
    })

    return items.sort((a, b) => b.voteCount - a.voteCount)
  }, [cards, votes, groups])

  const handleExportPDF = async () => {
    if (!contentRef.current) return
    setIsExporting(true)

    try {
      // Add a small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 100))

      const dataUrl = await toPng(contentRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          // Ensure the captured element has a white background
          backgroundColor: '#ffffff',
        }
      })

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [contentRef.current.scrollWidth, contentRef.current.scrollHeight]
      })

      pdf.addImage(dataUrl, 'PNG', 0, 0, contentRef.current.scrollWidth, contentRef.current.scrollHeight)
      pdf.save(`retro-summary-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Failed to export PDF:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleSaveImage = async () => {
    if (!contentRef.current) return
    setIsSavingImage(true)

    try {
      // Add a small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 100))

      const dataUrl = await toPng(contentRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          backgroundColor: '#ffffff',
        }
      })

      const link = document.createElement('a')
      link.download = `retro-summary-${new Date().toISOString().split('T')[0]}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Failed to save image:', error)
    } finally {
      setIsSavingImage(false)
    }
  }

  if (!retro) {
    // ... existing loading
  }

  return (
    <div className="flex h-full flex-col p-8 space-y-8 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold">Retro Summary</h1>
          <p className="text-muted-foreground mt-1">
            Review the outcome of your retrospective.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveImage} disabled={isSavingImage}>
            <ImageIcon className={`mr-2 h-4 w-4 ${isSavingImage ? 'animate-pulse' : ''}`} />
            {isSavingImage ? 'Saving...' : 'Save as Image'}
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
            <Download className={`mr-2 h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div ref={contentRef} className="flex h-full gap-6 min-w-max w-fit pb-4 p-1"> {/* Added p-1 to prevent shadow clipping */}
          {columns.map((column) => {
            const columnItems = processedItems.filter(item => item.column === column.id)
            
            return (
              <div key={column.id} className="w-80 flex flex-col h-full bg-muted/30 rounded-lg p-4 border">
                <div 
                  className="font-semibold mb-4 px-2 py-1 rounded w-fit"
                  style={{ backgroundColor: `${column.color}20`, color: column.color }}
                >
                  {column.name}
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {columnItems.map((item) => {
                    // Get action items for this item (group or single)
                    const itemCardIds = new Set(item.cards.map(c => c.id))
                    const itemActionItems = actionItems.filter(ai => ai.card_id && itemCardIds.has(ai.card_id))

                    return (
                      <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow relative overflow-visible mt-2">
                        <CardContent className="p-4 pt-6 space-y-3">
                          {/* Votes - Top Center Dots */}
                          {item.voteCount > 0 && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2 py-1 rounded-full border shadow-sm flex items-center gap-1 z-10">
                              {Array.from({ length: Math.min(item.voteCount, 5) }).map((_, i) => (
                                <div key={i} className="w-2 h-2 rounded-full bg-primary" />
                              ))}
                              {item.voteCount > 5 && (
                                <span className="text-[10px] font-bold leading-none text-muted-foreground">+{item.voteCount - 5}</span>
                              )}
                            </div>
                          )}

                          {/* Content */}
                          <div className="space-y-2">
                            {item.cards.map(card => (
                              <p key={card.id} className="text-sm leading-relaxed">
                                {card.content}
                              </p>
                            ))}
                          </div>

                          {/* Action Items */}
                          {itemActionItems.length > 0 && (
                            <div className="pt-3 border-t space-y-2">
                              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Action Items
                              </div>
                              <ul className="space-y-1">
                                {itemActionItems.map(ai => (
                                  <li key={ai.id} className="text-xs bg-green-50 text-green-900 p-2 rounded border border-green-100">
                                    {ai.content}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                  
                  {columnItems.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm italic py-8">
                      No cards
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
