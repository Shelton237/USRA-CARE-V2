import { redirect } from 'next/navigation'

// La racine redirige vers /dashboard (protégé par le layout (app))
export default function RootPage() {
  redirect('/dashboard')
}
