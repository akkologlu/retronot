import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | RetroNot',
  description: 'Terms of Service for RetroNot — the retrospective tool for agile teams.',
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
