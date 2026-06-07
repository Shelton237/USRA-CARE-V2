import { prisma } from '@/lib/db'
import { ok, err, requireAuth, logAudit } from '@/lib/api'

// ─── Period helpers ───────────────────────────────────────────────────────
function getPeriodRange(period: string): { start: Date; end: Date } {
  if (period.includes('-Q')) {
    const [y, q] = period.split('-Q')
    const sm = (parseInt(q) - 1) * 3
    return { start: new Date(parseInt(y), sm, 1), end: new Date(parseInt(y), sm + 3, 1) }
  }
  if (period.includes('-S')) {
    const [y, s] = period.split('-S')
    const sm = (parseInt(s) - 1) * 6
    return { start: new Date(parseInt(y), sm, 1), end: new Date(parseInt(y), sm + 6, 1) }
  }
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-')
    return { start: new Date(parseInt(y), parseInt(m) - 1, 1), end: new Date(parseInt(y), parseInt(m), 1) }
  }
  return { start: new Date(parseInt(period), 0, 1), end: new Date(parseInt(period) + 1, 0, 1) }
}

async function computeActual(type: string, period: string, countryId: number | null): Promise<number> {
  const { start, end } = getPeriodRange(period)
  const cFilter = countryId ? { countryId } : {}

  if (type === 'placements') {
    return await prisma.mission.count({
      where: { ...cFilter, startDate: { gte: start, lt: end }, status: { in: ['active', 'completed'] } },
    })
  }
  if (type === 'recruitments') {
    return await prisma.candidate.count({
      where: { ...cFilter, createdAt: { gte: start, lt: end } },
    })
  }
  if (type === 'missions') {
    return await prisma.mission.count({ where: { ...cFilter, status: 'active' } })
  }
  if (type === 'clients') {
    return await prisma.client.count({
      where: { ...cFilter, createdAt: { gte: start, lt: end } },
    })
  }
  if (type === 'revenue') {
    const invoices = await prisma.invoice.findMany({
      where: { ...cFilter, createdAt: { gte: start, lt: end }, status: { in: ['sent', 'partially_paid', 'paid', 'overdue'] } },
      include: { country: { select: { exchangeToEur: true } } },
    })
    return invoices.reduce((sum, inv) => sum + inv.total * (inv.country?.exchangeToEur ?? 1), 0)
  }
  return 0
}

export async function GET() {
  try {
    const session = await requireAuth()
    const role = session.user?.role
    const userCountryId = session.user?.countryId ? Number(session.user.countryId) : null

    const where = role === 'admin' ? {} : userCountryId ? { user: { countryId: userCountryId } } : {}

    const targets = await prisma.target.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true, countryId: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const withActual = await Promise.all(
      targets.map(async t => ({
        ...t,
        actualValue: await computeActual(t.type, t.period, t.user.countryId ?? userCountryId),
      }))
    )

    return ok(withActual)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const { userId, period, type, targetValue, countryId } = await req.json()
    if (!userId || !period || !type || !targetValue) return err('Champs requis manquants', 400)

    const target = await prisma.target.create({
      data: {
        userId: Number(userId),
        period,
        type,
        targetValue: Number(targetValue),
        countryId: countryId ? Number(countryId) : null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true, countryId: true } } },
    })
    void logAudit(Number(session.user?.id), 'Création', 'Objectifs', target.id, `${target.type} ${target.period}`)
    return ok(target)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('POST /api/targets', e)
    return err('Erreur serveur', 500)
  }
}
