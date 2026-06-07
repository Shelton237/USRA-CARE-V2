import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter, logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session, _req)
    const advances = await prisma.advance.findMany({
      where: scope.countryId ? { candidate: { countryId: scope.countryId } } : {},
      include: {
        candidate: { select: { firstName: true, lastName: true, countryId: true } },
      },
      orderBy: { requestDate: 'desc' },
    })
    return ok(advances)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const b = await req.json()
    if (!b.candidateId || !b.amount) return err('Champs requis manquants', 400)

    const advance = await prisma.advance.create({
      data: {
        candidateId:   Number(b.candidateId),
        amount:        Number(b.amount),
        reason:        b.reason        ?? null,
        paymentMethod: b.paymentMethod ?? null,
        status:        'pending',
        requestDate:   b.requestDate ? new Date(b.requestDate) : new Date(),
      },
    })
    void logAudit(Number(session.user?.id), 'Création', 'Avances', advance.id)
    return ok(advance, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('POST /api/advances', e)
    return err('Erreur serveur', 500)
  }
}
