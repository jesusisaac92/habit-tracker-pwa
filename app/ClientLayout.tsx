"use client"

import { Providers } from '@/components/ui/providers/Providers'
import { KeepAlive } from '@/components/KeepAlive'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <KeepAlive />
      {children}
    </Providers>
  )
}