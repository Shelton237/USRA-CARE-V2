import { prisma } from '@/lib/db'
import { ok, err, requireAuth, logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    const mission = await prisma.mission.findUnique({
      where: { id },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, phone: true } },
        client:    { select: { id: true, name: true, billingFreq: true, overtimeRate: true } },
        service:   { select: { name: true, icon: true } },
        country:   { select: { name: true, symbol: true } },
        overtime:  { orderBy: { date: 'desc' } },
      },
    })
    if (!mission) return err('Mission introuvable', 404)
    return ok(mission)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    const b = await req.json()
    const mission = await prisma.mission.update({
      where: { id },
      data: {
        countryId:      b.countryId      !== undefined ? Number(b.countryId)      : undefined,
        clientId:       b.clientId       !== undefined ? Number(b.clientId)       : undefined,
        candidateId:    b.candidateId    !== undefined ? Number(b.candidateId)    : undefined,
        serviceId:      b.serviceId      ? Number(b.serviceId) : undefined,
        contractType:   b.contractType,
        status:         b.status,
        startDate:      b.startDate      ? new Date(b.startDate) : undefined,
        endDate:        b.endDate        ? new Date(b.endDate) : null,
        prorataBase:    b.prorataBase    !== undefined ? Number(b.prorataBase)    : undefined,
        trialPeriodEnd: b.trialPeriodEnd ? new Date(b.trialPeriodEnd) : null,
        trialConfirmed: b.trialConfirmed !== undefined ? Boolean(b.trialConfirmed) : undefined,
        clientRate:     b.clientRate     !== undefined ? Number(b.clientRate)     : undefined,
        employeeRate:   b.employeeRate   !== undefined ? Number(b.employeeRate)   : undefined,
        agencyFee:      b.agencyFee      !== undefined ? Number(b.agencyFee)      : undefined,
        netSalary:      b.netSalary      !== undefined ? Number(b.netSalary)      : undefined,
        commissionRate: b.commissionRate !== undefined ? Number(b.commissionRate) : undefined,
        notes:          b.notes ?? null,
      },
    })
    void logAudit(Number(session.user?.id), 'Modification', 'Missions', id, b.status)
    return ok(mission)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    await prisma.mission.delete({ where: { id } })
    void logAudit(Number(session.user?.id), 'Suppression', 'Missions', id)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
