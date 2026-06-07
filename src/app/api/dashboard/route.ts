import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'

export async function GET() {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)

    const [
      attendancePending, overtimePending, advancesPending,
      invoicesOverdue, complaintsOpen, trialEnding,
      payrollsToValidate, payrollsToPay, evaluationsDue,
      candidates, candidatesAvail, missions, allMissions,
      countries,
      cashEntries,
      allInvoices,
      allPayments,
      allMissionsForMargin,
      recentInvoices,
      recentMissions,
      pipeline,
    ] = await Promise.all([
      prisma.attendanceRecord.count({ where: { ...scope, status: 'pending' } }),
      prisma.overtimeRecord.count({ where: { ...scope, status: 'pending' } }),
      prisma.advance.count({ where: { status: 'pending', candidate: scope.countryId ? { countryId: scope.countryId } : {} } }),
      prisma.invoice.count({ where: { ...scope, status: { notIn: ['paid', 'draft'] }, dueDate: { lt: new Date() } } }),
      prisma.complaint.count({ where: { ...scope, status: { notIn: ['resolved', 'unfounded'] } } }),
      prisma.mission.count({ where: { ...scope, status: 'active', trialPeriodEnd: { lte: new Date(Date.now() + 7 * 86400000) }, trialConfirmed: false } }),
      prisma.payroll.count({ where: { ...scope, status: 'pending_validation' } }),
      prisma.payroll.count({ where: { ...scope, status: 'pending_payment' } }),
      prisma.mission.count({ where: { ...scope, status: 'active', trialPeriodEnd: { lt: new Date() }, trialConfirmed: false } }),
      prisma.candidate.count({ where: scope }),
      prisma.candidate.count({ where: { ...scope, status: 'validated' } }),
      prisma.mission.count({ where: { ...scope, status: 'active' } }),
      prisma.mission.count({ where: scope }),
      // Pays actifs avec taux de change
      prisma.country.findMany({
        where: { active: true },
        select: { id: true, name: true, code: true, symbol: true, exchangeToEur: true },
      }),
      // Trésorerie — entrées/sorties par pays
      prisma.cashEntry.findMany({
        where: scope,
        select: { countryId: true, type: true, amount: true },
      }),
      // Toutes les factures — pour CA converti en EUR
      prisma.invoice.findMany({
        where: scope,
        select: { countryId: true, total: true },
      }),
      // Tous les paiements — pour Encaissé converti en EUR
      prisma.payment.findMany({
        where: scope.countryId ? { invoice: { countryId: scope.countryId } } : {},
        select: { amount: true, invoice: { select: { countryId: true } } },
      }),
      // Missions actives — pour marge convertie en EUR
      prisma.mission.findMany({
        where: { ...scope, status: 'active' },
        select: { clientRate: true, netSalary: true, countryId: true },
      }),
      // Dernières factures
      prisma.invoice.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, reference: true, invoiceType: true, total: true, status: true,
          country: { select: { symbol: true } },
        },
      }),
      // Missions récentes
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

    // Table de lookup pays → taux de change
    const countryMap = Object.fromEntries(countries.map(c => [c.id, c]))

    // ── CA par pays (EUR) ─────────────────────────────────────────────────────
    const caByCountry = countries.map(c => {
      const cInvoices = allInvoices.filter(i => i.countryId === c.id)
      const totalLocal = cInvoices.reduce((s, i) => s + i.total, 0)
      const totalEur   = Math.round(totalLocal * (c.exchangeToEur ?? 1))
      return { id: c.id, code: c.code, name: c.name, symbol: c.symbol, totalLocal, totalEur }
    })
    const totalCA = caByCountry.reduce((s, c) => s + c.totalEur, 0)

    // ── Encaissé total (EUR) ──────────────────────────────────────────────────
    const totalEncaisse = Math.round(
      allPayments.reduce((s, p) => {
        const rate = countryMap[p.invoice?.countryId ?? 0]?.exchangeToEur ?? 1
        return s + p.amount * rate
      }, 0)
    )

    // ── Marge active (EUR) ────────────────────────────────────────────────────
    const margin = Math.round(
      allMissionsForMargin.reduce((s, m) => {
        const rate = countryMap[m.countryId]?.exchangeToEur ?? 1
        return s + ((m.clientRate ?? 0) - (m.netSalary ?? 0)) * rate
      }, 0)
    )

    // ── Trésorerie par pays (devise locale) ───────────────────────────────────
    // type stocké: 'income' | 'expense'  (CashPage form)
    const treasury = countries.map(c => {
      const entries  = cashEntries.filter(e => e.countryId === c.id)
      const totalIn  = entries.filter(e => e.type === 'income') .reduce((s, e) => s + e.amount, 0)
      const totalOut = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
      return { ...c, balance: totalIn - totalOut, totalIn, totalOut }
    })

    // ── Pipeline recrutement ──────────────────────────────────────────────────
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

    return ok({
      counters: {
        attendance:         attendancePending,
        overtime:           overtimePending,
        advances:           advancesPending,
        invoices:           invoicesOverdue,
        complaints:         complaintsOpen,
        trialEnding,
        payrollsToValidate,
        payrollsToPay,
        evaluationsDue,
      },
      stats: {
        candidates, candidatesAvail, missions, allMissions,
        totalCA,        // EUR
        totalEncaisse,  // EUR
        margin,         // EUR
      },
      caByCountry,  // [{code, name, symbol, totalLocal, totalEur}] pour le graphique
      treasury,     // [{name, symbol, balance, totalIn, totalOut}] en devise locale
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
