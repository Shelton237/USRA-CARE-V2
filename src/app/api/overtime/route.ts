import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)
    const { searchParams } = new URL(req.url)
    const missionId = searchParams.get('missionId') ?? ''
    const clientId  = searchParams.get('clientId') ?? ''
    const billable  = searchParams.get('billable') === '1'
    const records = await prisma.overtimeRecord.findMany({
      where: {
        ...scope,
        ...(missionId && { missionId: Number(missionId) }),
        ...(clientId  && { mission: { clientId: Number(clientId) } }),
        ...(billable  && { status: 'validated', invoiceLineId: null }),
      },
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        mission: { include: { client: { select: { name: true } } } },
      },
      orderBy: { date: 'desc' },
    })
    return ok(records)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const b = await req.json()
    if (!b.missionId || !b.date || !b.hours) return err('Champs requis manquants', 400)

    const mission = await prisma.mission.findUnique({
      where: { id: Number(b.missionId) },
      include: { client: true },
    })
    if (!mission) return err('Mission introuvable', 404)

    const hourlyRate = mission.client.overtimeRate ?? 0
    const hours = Number(b.hours)
    const amount = hours * hourlyRate

    const record = await prisma.overtimeRecord.create({
      data: {
        countryId:   mission.countryId,
        missionId:   Number(b.missionId),
        candidateId: mission.candidateId,
        date:        new Date(b.date),
        hours,
        hourlyRate,
        amount,
        description: b.description ?? null,
        status:      'pending',
        createdById: session.user?.id ? Number(session.user.id) : null,
      },
    })
    return ok(record, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('POST /api/overtime', e)
    return err('Erreur serveur', 500)
  }
}
