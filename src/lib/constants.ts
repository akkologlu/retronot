export const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000
export const INVITE_TOKEN_BYTES = 32

export const TEMPLATE_COLUMNS: Record<string, string[]> = {
  'start-stop-continue': ['Start', 'Stop', 'Continue'],
  'sad-mad-happy': ['Sad', 'Mad', 'Happy'],
  'keep-problem-try': ['Keep', 'Problem', 'Try'],
}

export type CustomTemplate = {
  id: string
  name: string
  columns: { name: string; color: string }[]
}

export function getTemplateColumns(
  templateType: string,
  customTemplates: CustomTemplate[] = []
): string[] {
  if (TEMPLATE_COLUMNS[templateType]) return TEMPLATE_COLUMNS[templateType]
  const custom = customTemplates.find(t => t.id === templateType)
  return custom?.columns.map(c => c.name) ?? ['Column 1', 'Column 2', 'Column 3']
}

export const COLUMN_COLORS: Record<string, string> = {
  'Start': '#10B981', // Green
  'Stop': '#EF4444', // Red
  'Continue': '#3B82F6', // Blue
  'Sad': '#EF4444',
  'Mad': '#F59E0B', // Orange/Yellow
  'Happy': '#10B981',
  'Keep': '#3B82F6',
  'Problem': '#EF4444',
  'Try': '#10B981',
}
