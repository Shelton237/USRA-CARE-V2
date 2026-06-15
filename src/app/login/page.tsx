'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Btn, Field } from '@/components/ui'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.ok) {
      router.push('/dashboard')
    } else {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5 p-2 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
            <Image src="/v2/logo.png" alt="USRA-CARE" width={72} height={72} className="rounded-xl object-contain" priority unoptimized />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">USRA-CARE</h1>
          <p className="text-slate-400 text-sm mt-1">Plateforme RH & Placement Multi-Pays</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-5">Connexion à votre espace</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Adresse email" type="email" value={email} onChange={setEmail}
              placeholder="admin@usra-care.com" required />
            <Field label="Mot de passe" type="password" value={password} onChange={setPassword}
              placeholder="••••••••" required />
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <Btn type="submit" full disabled={loading}>
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Btn>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          USRA-CARE © {new Date().getFullYear()} — Tous droits réservés
        </p>
      </div>
    </div>
  )
}
