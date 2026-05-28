'use client'

import { useState, useEffect } from 'react'
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, Plus, Users, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { createTeam } from '@/app/actions/team'
import { createRetro } from '@/app/actions/retro'
import { toast } from 'sonner'

const TEMPLATES = [
  {
    id: 'start-stop-continue',
    name: 'Start, Stop, Continue',
    description: 'Classic agile format',
    columns: ['Start', 'Stop', 'Continue'],
    colors: ['bg-emerald-100 text-emerald-700', 'bg-red-100 text-red-700', 'bg-blue-100 text-blue-700'],
  },
  {
    id: 'sad-mad-happy',
    name: 'Sad, Mad, Happy',
    description: 'Emotion-driven retrospective',
    columns: ['Sad', 'Mad', 'Happy'],
    colors: ['bg-blue-100 text-blue-700', 'bg-red-100 text-red-700', 'bg-yellow-100 text-yellow-700'],
  },
  {
    id: 'keep-problem-try',
    name: 'Keep, Problem, Try',
    description: 'Focus on experiments',
    columns: ['Keep', 'Problem', 'Try'],
    colors: ['bg-blue-100 text-blue-700', 'bg-orange-100 text-orange-700', 'bg-emerald-100 text-emerald-700'],
  },
]

type Team = { id: string; name: string }
type CustomTemplate = { id: string; name: string; columns: { name: string; color: string }[] }
type Step = 'team' | 'template' | 'name' | 'config'

interface StartRetroWizardProps {
  teams: Team[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function StartRetroWizard({ teams, open, onOpenChange }: StartRetroWizardProps) {
  const hasTeams = teams.length > 0
  const singleTeam = teams.length === 1

  const [step, setStep] = useState<Step>(singleTeam ? 'template' : 'team')
  const [selectedTeamId, setSelectedTeamId] = useState<string>(singleTeam ? teams[0].id : '')
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id)
  const [retroName, setRetroName] = useState('')
  const [voteLimit, setVoteLimit] = useState(5)
  const [writeTimer, setWriteTimer] = useState(0)
  const [voteTimer, setVoteTimer] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([])

  useEffect(() => {
    if (!selectedTeamId) return
    createClient()
      .from('retro_templates')
      .select('id, name, columns')
      .eq('team_id', selectedTeamId)
      .then(({ data }) => setCustomTemplates((data as CustomTemplate[]) ?? []))
  }, [selectedTeamId])
  const [showNewTeamForm, setShowNewTeamForm] = useState(!hasTeams)
  const [newTeamName, setNewTeamName] = useState('')
  const [localTeams, setLocalTeams] = useState<Team[]>(teams)

  const reset = () => {
    const freshSingle = teams.length === 1
    setStep(freshSingle ? 'template' : 'team')
    setSelectedTeamId(freshSingle ? teams[0].id : '')
    setSelectedTemplate(TEMPLATES[0].id)
    setRetroName('')
    setVoteLimit(5)
    setWriteTimer(0)
    setVoteTimer(0)
    setShowNewTeamForm(!hasTeams)
    setNewTeamName('')
    setLocalTeams(teams)
    setIsLoading(false)
  }

  const handleOpenChange = (val: boolean) => {
    if (!val) reset()
    onOpenChange(val)
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.set('name', newTeamName.trim())
      const res = await createTeam(formData)
      if (res.error) {
        toast.error(res.error)
        return
      }
      if ('teamId' in res && res.teamId) {
        const newTeam = { id: res.teamId, name: newTeamName.trim() }
        setLocalTeams(prev => [...prev, newTeam])
        setSelectedTeamId(res.teamId)
        setShowNewTeamForm(false)
        setNewTeamName('')
        setStep('template')
      }
    } catch {
      toast.error('Failed to create team')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartRetro = async () => {
    if (!retroName.trim() || !selectedTeamId) return
    setIsLoading(true)
    const formData = new FormData()
    formData.set('name', retroName.trim())
    formData.set('teamId', selectedTeamId)
    formData.set('templateType', selectedTemplate)
    formData.set('voteLimit', String(voteLimit))
    if (writeTimer > 0) formData.set('writeTimerMinutes', String(writeTimer))
    if (voteTimer > 0) formData.set('voteTimerMinutes', String(voteTimer))
    try {
      const result = await createRetro(formData)
      if (result?.error) {
        toast.error(result.error)
        setIsLoading(false)
      }
    } catch (error) {
      // redirect() in server actions throws NEXT_REDIRECT — re-throw so navigation completes
      const digest = (error as { digest?: string })?.digest
      if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) throw error
      toast.error('Failed to create retro')
      setIsLoading(false)
    }
  }

  const goBack = () => {
    if (step === 'config') { setStep('name'); return }
    if (step === 'name') { setStep('template'); return }
    if (step === 'template') {
      if (singleTeam && localTeams.length === 1) { handleOpenChange(false); return }
      setStep('team')
      return
    }
    handleOpenChange(false)
  }

  const goNext = () => {
    if (step === 'team') { setStep('template'); return }
    if (step === 'template') { setStep('name'); return }
    if (step === 'name') { setStep('config'); return }
    handleStartRetro()
  }

  const baseSteps = singleTeam && localTeams.length <= 1 ? 3 : 4
  const totalSteps = baseSteps
  const stepNum = step === 'team' ? 1 : step === 'template' ? (totalSteps === 3 ? 1 : 2) : step === 'name' ? (totalSteps === 3 ? 2 : 3) : totalSteps
  const selectedTeamName = localTeams.find(t => t.id === selectedTeamId)?.name
  const nextDisabled =
    isLoading ||
    (step === 'team' && !selectedTeamId && !showNewTeamForm) ||
    (step === 'name' && !retroName.trim())

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 rounded-full transition-all duration-200',
                    i < stepNum ? 'w-8 bg-primary' : 'w-4 bg-muted'
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{stepNum} / {totalSteps}</span>
          </div>
          <DialogTitle>
            {step === 'team' && (localTeams.length === 0 ? 'Create your first team' : 'Select a team')}
            {step === 'template' && 'Choose a template'}
            {step === 'name' && 'Name your retro'}
            {step === 'config' && 'Configure options'}
          </DialogTitle>
          <DialogDescription>
            {step === 'team' && (localTeams.length === 0
              ? 'You need a team before running a retro.'
              : 'Which team is this retro for?')}
            {step === 'template' && 'Each template defines the columns your team will fill in.'}
            {step === 'name' && (selectedTeamName
              ? `${selectedTeamName} · ${TEMPLATES.find(t => t.id === selectedTemplate)?.name}`
              : TEMPLATES.find(t => t.id === selectedTemplate)?.name)}
            {step === 'config' && 'Set vote limits and phase timers (optional).'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 min-h-[200px]">
          {step === 'team' && (
            <div className="space-y-2">
              {localTeams.length > 0 && !showNewTeamForm && (
                <>
                  {localTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent',
                        selectedTeamId === team.id && 'border-primary bg-accent'
                      )}
                    >
                      <div className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold',
                        selectedTeamId === team.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        {team.name[0].toUpperCase()}
                      </div>
                      <span className="font-medium">{team.name}</span>
                      {selectedTeamId === team.id && (
                        <CheckCircle2 className="ml-auto h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowNewTeamForm(true)}
                    className="w-full flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Create new team
                  </button>
                </>
              )}

              {showNewTeamForm && (
                <div className="space-y-3">
                  {localTeams.length > 0 && (
                    <button
                      onClick={() => setShowNewTeamForm(false)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Back to teams
                    </button>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Team name</Label>
                    <div className="flex gap-2">
                      <Input
                        id="teamName"
                        value={newTeamName}
                        onChange={e => setNewTeamName(e.target.value)}
                        placeholder="e.g. Engineering Team"
                        onKeyDown={e => e.key === 'Enter' && !isLoading && handleCreateTeam()}
                        autoFocus
                      />
                      <Button
                        onClick={handleCreateTeam}
                        disabled={!newTeamName.trim() || isLoading}
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'template' && (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={cn(
                    'w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent',
                    selectedTemplate === template.id && 'border-primary bg-accent'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground">{template.description}</div>
                    </div>
                    {selectedTemplate === template.id && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {template.columns.map((col, i) => (
                      <span
                        key={col}
                        className={cn('rounded px-2 py-0.5 text-xs font-medium', template.colors[i])}
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
              {customTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={cn(
                    'w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent',
                    selectedTemplate === template.id && 'border-primary bg-accent'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground">Custom</div>
                    </div>
                    {selectedTemplate === template.id && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {template.columns.map((col, i) => (
                      <span
                        key={`${col.name}-${i}`}
                        className="rounded px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: col.color }}
                      >
                        {col.name}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'name' && (
            <div className="space-y-4">
              {selectedTeamName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{selectedTeamName}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="retroName">Retro name</Label>
                <Input
                  id="retroName"
                  value={retroName}
                  onChange={e => setRetroName(e.target.value)}
                  placeholder="e.g. Sprint 34 Retro"
                  onKeyDown={e => e.key === 'Enter' && !isLoading && retroName.trim() && goNext()}
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 'config' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="voteLimit">Votes per person: <span className="font-bold text-foreground">{voteLimit}</span></Label>
                <input
                  id="voteLimit"
                  type="range"
                  min={1}
                  max={20}
                  value={voteLimit}
                  onChange={e => setVoteLimit(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span><span>20</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="writeTimer">Write phase timer: <span className="font-bold text-foreground">{writeTimer === 0 ? 'Off' : `${writeTimer} min`}</span></Label>
                <input
                  id="writeTimer"
                  type="range"
                  min={0}
                  max={30}
                  value={writeTimer}
                  onChange={e => setWriteTimer(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Off</span><span>30 min</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voteTimer">Vote phase timer: <span className="font-bold text-foreground">{voteTimer === 0 ? 'Off' : `${voteTimer} min`}</span></Label>
                <input
                  id="voteTimer"
                  type="range"
                  min={0}
                  max={30}
                  value={voteTimer}
                  onChange={e => setVoteTimer(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Off</span><span>30 min</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={goBack} disabled={isLoading}>
            {step === 'team' || (step === 'template' && (singleTeam && localTeams.length <= 1))
              ? 'Cancel'
              : <><ChevronLeft className="h-4 w-4 mr-1" />Back</>}
          </Button>

          {!(step === 'team' && showNewTeamForm) && (
            <Button onClick={goNext} disabled={nextDisabled}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {step === 'config'
                ? <><Play className="mr-2 h-4 w-4" />Start Retro</>
                : <>Continue <ChevronRight className="ml-1 h-4 w-4" /></>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
