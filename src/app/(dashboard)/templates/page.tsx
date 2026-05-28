import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileStack, Layers } from 'lucide-react'
import type { Database } from '@/types/supabase'
import TemplateBuilder from './_components/template-builder'
import DeleteTemplateButton from './_components/delete-template-button'

type TeamRow = Database['public']['Tables']['teams']['Row']
type CustomTemplateRow = Database['public']['Tables']['retro_templates']['Row']

const BUILT_IN = [
  { id: 'start-stop-continue', name: 'Start, Stop, Continue', columns: ['Start', 'Stop', 'Continue'] },
  { id: 'sad-mad-happy', name: 'Sad, Mad, Happy', columns: ['Sad', 'Mad', 'Happy'] },
  { id: 'keep-problem-try', name: 'Keep, Problem, Try', columns: ['Keep', 'Problem', 'Try'] },
]

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [teamsResult, templatesResult] = await Promise.all([
    supabase.from('teams').select('id, name').order('name'),
    supabase.from('retro_templates').select('*').order('created_at', { ascending: false }),
  ])

  const teams = (teamsResult.data ?? []) as TeamRow[]
  const customTemplates = (templatesResult.data ?? []) as CustomTemplateRow[]
  const firstTeam = teams[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="text-muted-foreground">Built-in and custom column templates for your retros.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Built-in templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Built-in Templates</CardTitle>
            </div>
            <CardDescription>Ready to use, cannot be modified.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {BUILT_IN.map(tpl => (
                <div key={tpl.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <FileStack className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground">{tpl.columns.join(' · ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom templates */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileStack className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Custom Templates</CardTitle>
              </div>
              <CardDescription>
                {customTemplates.length === 0
                  ? 'No custom templates yet.'
                  : `${customTemplates.length} template${customTemplates.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </CardHeader>
            {customTemplates.length > 0 && (
              <CardContent>
                <div className="space-y-2">
                  {customTemplates.map(tpl => {
                    const cols = (tpl.columns as { name: string; color: string }[]) ?? []
                    return (
                      <div key={tpl.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex gap-1 shrink-0">
                          {cols.slice(0, 4).map((col, i) => (
                            <span
                              key={i}
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: col.color }}
                            />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{tpl.name}</p>
                          <p className="text-xs text-muted-foreground">{cols.map(c => c.name).join(' · ')}</p>
                        </div>
                        {tpl.created_by === user.id && (
                          <DeleteTemplateButton templateId={tpl.id} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>

          {firstTeam ? (
            <TemplateBuilder teamId={firstTeam.id} userId={user.id} />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Create a team first to add custom templates.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
