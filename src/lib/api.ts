import { auth } from './auth'
import { NextResponse } from 'next/server'
import { prisma } from './db'

export async function getSession() {
  return auth()
}

export function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function requireAuth() {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  return session
}

export function scopeFilter(session: any) {
  const role = session.user?.role
  const countryId = session.user?.countryId ? Number(session.user.countryId) : null
  if (role === 'admin') return {}
  if (countryId) return { countryId }
  return {}
}

export async function logAudit(userId: number, action: string, module: string, entityId?: number, detail?: string) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, module, detail: [entityId ? `id:${entityId}` : null, detail ?? null].filter(Boolean).join(' — ') || null },
    })
  } catch {}
}
