import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    if (!['admin', 'dg'].includes(session.user?.role ?? '')) return err('Accès refusé', 403)

    const scope = scopeFilter(session, req)
    const url = new URL(req.url)
    const period = url.searchParams.get('period') || ''

    // Build date range for period YYYY-MM
    let dateRange: { gte: Date; lt: Date } | undefined
    if (period) {
      const [year, month] = period.split('-').map(Number)
      dateRange = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) }
    }

    const [countries, invoices, payments, payrolls, candidates, missions, complaints, overdueRaw] =
      await Promise.all([
        // All countries in scope
        prisma.country.findMany({
          where: scope.countryId ? { id: scope.countryId } : {},
          select: { id: true, name: true, symbol: true, currency: true, exchangeToEur: true },
        }),

        // Invoices for the period
        prisma.invoice.findMany({
          where: { ...scope, ...(period ? { period } : {}) },
          select: { id: true, countryId: true, total: true, status: true },
        }),

        // Payments for the date range
        prisma.payment.findMany({
          where: {
            ...(scope.countryId ? { invoice: { countryId: scope.countryId } } : {}),
            ...(dateRange ? { date: dateRange } : {}),
          },
          select: { amount: true, invoice: { select: { countryId: true } } },
        }),

        // Payrolls for the period
        prisma.payroll.findMany({
          where: { ...scope, ...(period ? { period } : {}) },
          select: { netSalary: true, countryId: true },
        }),

        // Candidates (no period filter, just scope)
        prisma.candidate.findMany({
          where: scope,
          select: { id: true, status: true },
        }),

        // Active missions
        prisma.mission.findMany({
          where: { ...scope, status: 'active' },
          select: { id: true, clientId: true },
        }),

        // Open complaints (no period filter)
        prisma.complaint.findMany({
          where: { ...scope, status: { notIn: ['resolved', 'unfounded'] } },
          select: { id: true },
        }),

        // Overdue invoices (regardless of period)
        prisma.invoice.findMany({
          where: { ...scope, status: { not: 'paid' }, dueDate: { lt: new Date() } },
          include: {
            client:  { select: { id: true, name: true } },
            country: { select: { symbol: true, name: true } },
          },
        }),
      ])

    // Country lookup map
    const countryMap = Object.fromEntries(countries.map(c => [c.id, c]))

    // Revenue by country
    const revenueByCountry = countries.map(c => {
      const cInvoices = invoices.filter(i => i.countryId === c.id)
      const total    = cInvoices.reduce((s, i) => s + i.total, 0)
      const totalEur = total * (c.exchangeToEur || 1)
      return {
        countryId: c.id,
        name:      c.name,
        symbol:    c.symbol,
        currency:  c.currency,
        total,
        totalEur,
        count:     cInvoices.length,
      }
    })

    const totalRevenueEur  = revenueByCountry.reduce((s, c) => s + c.totalEur, 0)
    const totalPaymentsEur = payments.reduce((s, p) => {
      const c = countryMap[p.invoice?.countryId ?? 0]
      return s + p.amount * (c?.exchangeToEur ?? 1)
    }, 0)
    const totalPayrollEur  = payrolls.reduce((s, p) => {
      const c = countryMap[p.countryId]
      return s + p.netSalary * (c?.exchangeToEur ?? 1)
    }, 0)

    const activityStats = {
      totalCandidates: candidates.length,
      placedCandidates: candidates.filter(c => c.status === 'placed').length,
      activeClients:  new Set(missions.map(m => m.clientId)).size,
      activeMissions: missions.length,
      openComplaints: complaints.length,
    }

    // Format overdue invoices for display
    const overdueInvoices = overdueRaw.map(i => ({
      id:        i.id,
      reference: (i as any).reference,
      clientId:  i.clientId,
      clientName: i.client.name,
      dueDate:   (i as any).dueDate,
      total:     i.total,
      symbol:    i.country.symbol,
      countryName: i.country.name,
    }))

    return ok({
      revenueByCountry,
      totalRevenueEur,
      totalPaymentsEur,
      totalPayrollEur,
      overdueInvoices,
      activityStats,
    })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('GET /api/reporting', e)
    return err('Erreur serveur', 500)
  }
}
