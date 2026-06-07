import { auth } from './auth'
import { prisma } from './db'
import { NextResponse } from 'next/server'

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

export function scopeFilter(session: any, req?: Request) {
  const role = session.user?.role
  const countryId = session.user?.countryId ? Number(session.user.countryId) : null
  if (role === 'admin') {
    if (req) {
      try {
        const paramId = new URL(req.url).searchParams.get('countryId')
        if (paramId) return { countryId: Number(paramId) }
      } catch {}
    }
    return {}
  }
  if (countryId) return { countryId }
  return {}
}

export async function logAudit(
  userId: number,
  action: string,
  module: string,
  entityId?: number | null,
  detail?: string | null
) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, module, entityId: entityId ?? null, detail: detail ?? null },
    })
  } catch {}
}
