import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni | RetroNot',
  description: 'RetroNot — 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.',
}

export default function KVKKLayout({ children }: { children: React.ReactNode }) {
  return children
}
