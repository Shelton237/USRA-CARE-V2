import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)
    const evals = await prisma.evaluation.findMany({
      where: scope.countryId ? { candidate: { countryId: scope.countryId } } : {},
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: 'desc' },
    })
    // Attach client name via clientId
    const withClient = await Promise.all(evals.map(async e => {
      const client = e.clientId ? await prisma.client.findUnique({
        where: { id: e.clientId }, select: { name: true, companyName: true }
      }) : null
      return { ...e, client }
    }))
    return ok(withClient)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const b = await req.json()
    if (!b.candidateId || !b.clientId || !b.date) return err('Champs requis manquants', 400)

    const criteria = ['punctuality','quality','behavior','appearance','instructions','discretion','honesty','initiative','hygiene']
    const rated = criteria.map(k => Number(b[k] ?? 0)).filter(v => v > 0)
    const overall = rated.length > 0 ? rated.reduce((s, v) => s + v, 0) / rated.length : 0

    const ev = await prisma.evaluation.create({
      data: {
        candidateId:  Number(b.candidateId),
        clientId:     Number(b.clientId),
        date:         new Date(b.date),
        overallRating: parseFloat(overall.toFixed(1)),
        punctuality:  Number(b.punctuality  ?? 0),
        quality:      Number(b.quality      ?? 0),
        behavior:     Number(b.behavior     ?? 0),
        appearance:   Number(b.appearance   ?? 0),
        instructions: Number(b.instructions ?? 0),
        discretion:   Number(b.discretion   ?? 0),
        honesty:      Number(b.honesty      ?? 0),
        initiative:   Number(b.initiative   ?? 0),
        hygiene:      Number(b.hygiene      ?? 0),
        comment:      b.comment    ?? null,
        recommend:    b.recommend  ?? 'yes',
      },
    })
    return ok(ev, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('POST /api/evaluations', e)
    return err('Erreur serveur', 500)
  }
}
