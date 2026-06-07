'use client'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

// basePath indique au client NextAuth où se trouvent les routes /api/auth
// → en production : /v2/api/auth  |  en dev local : /v2/api/auth (basePath Next.js)
const AUTH_BASE = '/v2/api/auth'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }))
  return (
    <SessionProvider basePath={AUTH_BASE}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  )
}
