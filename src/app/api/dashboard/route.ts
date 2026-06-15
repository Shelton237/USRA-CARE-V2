import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'

export async function GET() {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)

    const [
      attendancePending, overtimePending, advancesPending,
      payrollsPending, invoicesOverdue, complaintsOpen, trialEnding,
      candidates, candidatesAvail, missions, allMissions,
      invoiceAgg, paymentAgg, marginAgg,
      countries,
      cashEntries,
      recentInvoices,
      recentMissions,
      pipeline,
    ] = await Promise.all([
      prisma.attendanceRecord.count({ where: { ...scope, status: 'pending' } }),
      prisma.overtimeRecord.count({ where: { ...scope, status: 'pending' } }),
      prisma.advance.count({ where: { status: 'pending', candidate: scope.countryId ? { countryId: scope.countryId } : {} } }),
      prisma.payroll.count({ where: { ...scope, status: 'pending_validation' } }),
      prisma.invoice.count({ where: { ...scope, status: { notIn: ['paid', 'draft'] }, dueDate: { lt: new Date() } } }),
      prisma.complaint.count({ where: { ...scope, status: { notIn: ['resolved', 'unfounded'] } } }),
      prisma.mission.count({ where: { ...scope, status: 'active', trialPeriodEnd: { lte: new Date(Date.now() + 7 * 86400000) }, trialConfirmed: false } }),
      prisma.candidate.count({ where: scope }),
      prisma.candidate.count({ where: { ...scope, status: 'validated' } }),
      prisma.mission.count({ where: { ...scope, status: 'active' } }),
      prisma.mission.count({ where: scope }),
      prisma.invoice.aggregate({ where: scope, _sum: { total: true } }),
      prisma.payment.aggregate({ where: {}, _sum: { amount: true } }),
      prisma.mission.aggregate({ where: { ...scope, status: 'active' }, _sum: { clientRate: true, netSalary: true } }),
      prisma.country.findMany({ where: { active: true }, select: { id: true, name: true, code: true, symbol: true, exchangeToEur: true } }),
      prisma.cashEntry.findMany({ where: scope, select: { countryId: true, type: true, amount: true } }),
      prisma.invoice.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, reference: true, invoiceType: true, total: true, status: true,
          country: { select: { symbol: true } },
        },
      }),
      prisma.mission.findMany({
        where: { ...scope, status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, contractType: true, status: true,
          candidate: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
        },
      }),
      prisma.candidate.groupBy({ by: ['status'], where: scope, _count: { id: true } }),
    ])

    // Trésorerie par pays
    const treasury = countries.map(c => {
      const entries = cashEntries.filter(e => e.countryId === c.id)
      const totalIn  = entries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0)
      const totalOut = entries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0)
      return { ...c, balance: totalIn - totalOut, totalIn, totalOut }
    })

    // Pipeline recrutement
    const PIPELINE = [
      { key: 'applied',             label: 'Postulé',         color: '#94A3B8' },
      { key: 'interview_scheduled', label: 'Pré-sélectionné', color: '#F59E0B' },
      { key: 'interviewed',         label: 'Entretien fait',  color: '#8B5CF6' },
      { key: 'verified',            label: 'Vérifié',         color: '#34D399' },
      { key: 'validated',           label: 'Disponible',      color: '#10B981' },
      { key: 'placed',              label: 'Placé',           color: '#0D9488' },
    ]
    const total = Math.max(pipeline.reduce((s, p) => s + p._count.id, 0), 1)
    const pipelineData = PIPELINE.map(s => {
      const count = pipeline.find(p => p.status === s.key)?._count.id ?? 0
      return { ...s, count, pct: Math.round((count / total) * 100) }
    })

    const margin = (marginAgg._sum.clientRate ?? 0) - (marginAgg._sum.netSalary ?? 0)

    return ok({
      counters: { attendance: attendancePending, overtime: overtimePending, advances: advancesPending, payrolls: payrollsPending, invoices: invoicesOverdue, complaints: complaintsOpen, trialEnding },
      stats: { candidates, candidatesAvail, missions, allMissions, totalCA: invoiceAgg._sum.total ?? 0, totalEncaisse: paymentAgg._sum.amount ?? 0, margin },
      treasury,
      pipeline: pipelineData,
      recentInvoices,
      recentMissions,
      countries,
    })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
