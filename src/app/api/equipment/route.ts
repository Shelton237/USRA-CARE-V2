import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter , logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session, _req)
    const records = await prisma.equipmentRecord.findMany({
      where: scope,
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        mission: { include: { client: { select: { name: true, companyName: true } } } },
        country: { select: { symbol: true } },
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
    if (!b.candidateId) return err('Employé requis', 400)

    const candidate = await prisma.candidate.findUnique({ where: { id: Number(b.candidateId) } })
    if (!candidate) return err('Candidat introuvable', 404)

    const items = Array.isArray(b.items) ? b.items : []
    const totalValue = items.reduce((s: number, it: any) => s + Number(it.value ?? 0), 0)

    const record = await prisma.equipmentRecord.create({
      data: {
        candidateId: Number(b.candidateId),
        countryId:   candidate.countryId,
        missionId:   b.missionId ? Number(b.missionId) : null,
        date:        new Date(b.date ?? new Date()),
        items:       items,
        totalValue,
        signed:      Boolean(b.signed),
        notes:       b.notes ?? null,
      },
    })
    void logAudit(Number(session.user?.id), 'Création', 'Matériels', record.id)
    return ok(record, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('POST /api/equipment', e)
    return err('Erreur serveur', 500)
  }
}
