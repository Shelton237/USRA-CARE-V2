import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)
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
    const countryId = session.user?.role === 'operator'
      ? Number(session.user.countryId)
      : body.countryId
    const { startDate, endDate, trialPeriodEnd, ...rest } = body
    const mission = await prisma.mission.create({
      data: {
        ...rest,
        countryId,
        createdById: Number(session.user.id),
        startDate:      startDate      ? new Date(startDate)      : new Date(),
        endDate:        endDate        ? new Date(endDate)        : null,
        trialPeriodEnd: trialPeriodEnd ? new Date(trialPeriodEnd) : null,
      },
    })
    return ok(mission, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
