import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter, logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session, _req)
    const evals = await prisma.evaluation.findMany({
      where: scope.countryId ? { candidate: { countryId: scope.countryId } } : {},
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: 'desc' },
    })

    // Batch-fetch clients (single query, not N+1)
    const clientIds = [...new Set(evals.map(e => e.clientId).filter((id): id is number => !!id))]
    const clients = clientIds.length
      ? await prisma.client.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, name: true, companyName: true },
        })
      : []
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

    return ok(evals.map(e => ({ ...e, client: clientMap[e.clientId ?? 0] ?? null })))
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const b = await req.json()
    if (!b.candidateId || !b.clientId || !b.date) return err('Champs requis manquants', 400)

    const criteria = ['punctuality','quality','behavior','appearance','instructions','discretion','honesty','initiative','hygiene']
    const rated = criteria.map(k => Number(b[k] ?? 0)).filter(v => v > 0)
    const overall = rated.length > 0 ? rated.reduce((s, v) => s + v, 0) / rated.length : 0

    const ev = await prisma.evaluation.create({
      data: {
        candidateId:   Number(b.candidateId),
        clientId:      Number(b.clientId),
        date:          new Date(b.date),
        overallRating: parseFloat(overall.toFixed(1)),
        punctuality:   Number(b.punctuality  ?? 0),
        quality:       Number(b.quality      ?? 0),
        behavior:      Number(b.behavior     ?? 0),
        appearance:    Number(b.appearance   ?? 0),
        instructions:  Number(b.instructions ?? 0),
        discretion:    Number(b.discretion   ?? 0),
        honesty:       Number(b.honesty      ?? 0),
        initiative:    Number(b.initiative   ?? 0),
        hygiene:       Number(b.hygiene      ?? 0),
        comment:       b.comment   ?? null,
        recommend:     b.recommend ?? 'yes',
      },
    })
    void logAudit(Number(session.user?.id), 'Création', 'Evaluations', ev.id)
    return ok(ev, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('POST /api/evaluations', e)
    return err('Erreur serveur', 500)
  }
}
