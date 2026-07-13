import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)
    const entries = await prisma.cashEntry.findMany({
      where: scope,
      include: { country: { select: { name: true, symbol: true, exchangeToEur: true } } },
      orderBy: { date: 'desc' },
    })
    return ok(entries)
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
      : Number(body.countryId)
    if (!countryId || !body.type || !body.amount) return err('Champs requis manquants', 400)
    const entry = await prisma.cashEntry.create({
      data: {
        countryId,
        type:        body.type,
        category:    body.category    ?? null,
        date:        new Date(body.date),
        amount:      Number(body.amount),
        description: body.description ?? null,
        reference:   body.reference   ?? null,
      },
    })
    return ok(entry, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('POST /api/cash', e)
    return err('Erreur serveur', 500)
  }
}
