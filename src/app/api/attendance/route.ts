import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? ''

    const records = await prisma.attendanceRecord.findMany({
      where: { ...scope, ...(status && { status }) },
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        mission: { include: { client: { select: { name: true } } } },
      },
      orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
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
    const body = await req.json()
    const record = await prisma.attendanceRecord.upsert({
      where: { missionId_period: { missionId: body.missionId, period: body.period } },
      create: { ...body, createdById: Number(session.user.id), status: 'pending' },
      update: { daysWorked: body.daysWorked, notes: body.notes },
    })
    return ok(record, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
