import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'USRA-CARE Backoffice',
  description: 'Plateforme RH & Placement Multi-Pays',
  manifest: `${process.env.NEXT_PUBLIC_APP_URL ?? '/v2'}/manifest.json`,
  icons: {
    icon: '/favicon.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'USRA-CARE' },
}

export const viewport: Viewport = {
  themeColor: '#0D9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${dmSans.className} h-full bg-slate-100 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
