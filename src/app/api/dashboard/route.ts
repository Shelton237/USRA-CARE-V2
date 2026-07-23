import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'

import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)
    
    // Apply requested country filter if admin
    const countryIdParam = req.nextUrl.searchParams.get('countryId')
    if (session.user?.role === 'admin' && countryIdParam && countryIdParam !== 'all') {
      scope.countryId = Number(countryIdParam)
    }

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
      invoicesByCountry,
      paidInvoicesByCountry,
      paymentsByCountry,
      marginsByCountry,
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
      prisma.invoice.aggregate({ where: { ...scope, status: { notIn: ['draft', 'cancelled'] } }, _sum: { total: true } }),
      prisma.payment.aggregate({ where: scope.countryId ? { invoice: { countryId: scope.countryId } } : {}, _sum: { amount: true } }),
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
      prisma.invoice.groupBy({
        by: ['countryId'],
        where: { ...scope, status: { notIn: ['draft', 'cancelled'] } },
        _sum: { total: true },
      }),
      prisma.invoice.groupBy({
        by: ['countryId'],
        where: { ...scope, status: 'paid' },
        _sum: { total: true },
      }),
      prisma.payment.groupBy({
        by: ['countryId'],
        where: scope.countryId ? { invoice: { countryId: scope.countryId } } : {},
        _sum: { amount: true },
      }),
      prisma.mission.groupBy({
        by: ['countryId'],
        where: { ...scope, status: 'active' },
        _sum: { clientRate: true, netSalary: true },
      }),
    ])

    // Trésorerie par pays : entrées manuelles + factures payées
    const treasury = countries.map((c: any) => {
      const entries = cashEntries.filter((e: any) => e.countryId === c.id)
      const cashIn   = entries.filter((e: any) => e.type === 'income').reduce((s: number, e: any) => s + e.amount, 0)
      const cashOut  = entries.filter((e: any) => e.type === 'expense').reduce((s: number, e: any) => s + e.amount, 0)
      const invoicesPaid = paidInvoicesByCountry.find((e: any) => e.countryId === c.id)?._sum?.total ?? 0
      const totalIn  = cashIn + invoicesPaid
      const totalOut = cashOut
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

    const marginLocal = (marginAgg._sum.clientRate ?? 0) - (marginAgg._sum.netSalary ?? 0)

    // Convert Encaisse and Margin to EUR for the global KPI
    const totalEncaisseEur = countries.reduce((sum: number, c: any) => {
      const enc = paymentsByCountry.find((p: any) => p.countryId === c.id)?._sum?.amount ?? 0
      return sum + Math.round(enc * (c.exchangeToEur ?? 1))
    }, 0)

    const marginEur = countries.reduce((sum: number, c: any) => {
      const margEntry = marginsByCountry.find((m: any) => m.countryId === c.id)
      const localMargin = (margEntry?._sum?.clientRate ?? 0) - (margEntry?._sum?.netSalary ?? 0)
      return sum + Math.round(localMargin * (c.exchangeToEur ?? 1))
    }, 0)

    // CA facturé par pays (hors brouillons/annulés)
    const caByCountry = countries.map((c: any) => {
      const entry = invoicesByCountry.find((e: any) => e.countryId === c.id)
      const totalCA = entry?._sum?.total ?? 0
      // totalCAEur : convertit en EUR via exchangeToEur (1 unité locale = exchangeToEur EUR)
      const totalCAEur = Math.round(totalCA * (c.exchangeToEur ?? 1))
      return { ...c, totalCA, totalCAEur }
    })

    // Pour le KPI global : somme des CA en EUR sur tous les pays
    const totalCAEur = caByCountry.reduce((s: number, c: any) => s + c.totalCAEur, 0)
    // Pour les non-admin : le scope est déjà filtré par pays → on retourne le montant local brut
    const totalCALocal = invoiceAgg._sum.total ?? 0
    const totalEncaisseLocal = paymentAgg._sum.amount ?? 0

    return ok({
      counters: { attendance: attendancePending, overtime: overtimePending, advances: advancesPending, payrolls: payrollsPending, invoices: invoicesOverdue, complaints: complaintsOpen, trialEnding },
      stats: {
        candidates, candidatesAvail, missions, allMissions,
        totalCA: totalCALocal, totalCAEur,
        totalEncaisse: totalEncaisseLocal, totalEncaisseEur,
        margin: marginLocal, marginEur
      },
      treasury,
      caByCountry,
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
