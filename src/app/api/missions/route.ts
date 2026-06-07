import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter, logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session, req)
    const { searchParams } = new URL(req.url)
    const status   = searchParams.get('status')   ?? ''
    const type     = searchParams.get('type')     ?? ''
    const clientId = searchParams.get('clientId') ?? ''

    const missions = await prisma.mission.findMany({
      where: {
        ...scope,
        ...(status   && { status }),
        ...(type     && { contractType: type }),
        ...(clientId && { clientId: Number(clientId) }),
      },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, phone: true } },
        client:    { select: { id: true, name: true, billingFreq: true, overtimeRate: true } },
        service:   { select: { name: true, icon: true } },
        country:   { select: { name: true, symbol: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(missions)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await req.json()
    const mission = await prisma.mission.create({
      data: { ...body, createdById: Number(session.user.id) },
    })
    void logAudit(Number(session.user?.id), 'Création', 'Missions', mission.id)
    return ok(mission, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
