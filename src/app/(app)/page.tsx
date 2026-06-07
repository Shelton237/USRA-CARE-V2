import { redirect } from 'next/navigation'

// Évite le conflit de route avec app/page.tsx
export default function AppRootPage() {
  redirect('/dashboard')
}
