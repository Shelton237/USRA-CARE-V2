import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') ?? ''
    const status = searchParams.get('status') ?? ''

    const records = await prisma.attendanceRecord.findMany({
      where: {
        ...scope,
        ...(period && { period }),
        ...(status && { status }),
      },
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        mission: {
          include: {
            client:  { select: { name: true } },
            service: { select: { name: true, icon: true } },
          },
        },
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
      create: {
        missionId:     body.missionId,
        candidateId:   body.candidateId,
        countryId:     body.countryId,
        period:        body.period,
        prorataBase:   body.prorataBase ?? 30,
        daysWorked:    Number(body.daysWorked ?? 0),
        absJustified:  Number(body.absJustified ?? 0),
        absUnjustified: Number(body.absUnjustified ?? 0),
        paidLeave:     Number(body.paidLeave ?? 0),
        holidays:      Number(body.holidays ?? 0),
        notes:         body.notes ?? null,
        status:        body.status ?? 'pending',
        createdById:   Number(session.user.id),
      },
      update: {
        daysWorked:    Number(body.daysWorked ?? 0),
        absJustified:  Number(body.absJustified ?? 0),
        absUnjustified: Number(body.absUnjustified ?? 0),
        paidLeave:     Number(body.paidLeave ?? 0),
        holidays:      Number(body.holidays ?? 0),
        notes:         body.notes ?? null,
        status:        body.status ?? 'pending',
      },
    })
    return ok(record, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
