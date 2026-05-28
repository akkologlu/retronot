export interface GroupSuggestion {
  name: string
  cardIds: string[]
}

interface Card {
  id: string
  content: string
  column_name: string
}

async function callAI<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'AI request failed')
  return data as T
}

export async function suggestGroups(cards: Card[]): Promise<GroupSuggestion[]> {
  const { groups } = await callAI<{ groups: GroupSuggestion[] }>('suggest-groups', { cards })
  return groups
}

export async function draftActionItem(card: Card): Promise<string> {
  const { suggestion } = await callAI<{ suggestion: string }>('draft-action', {
    cardContent: card.content,
    columnName: card.column_name,
  })
  return suggestion
}
