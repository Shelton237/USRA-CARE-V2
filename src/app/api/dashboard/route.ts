import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'

export async function GET() {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)

    const [
      attendancePending, overtimePending, advancesPending,
      payrollsPending, invoicesOverdue, complaintsOpen, trialEnding,
      candidates, missions, invoices, payments,
      countries,
    ] = await Promise.all([
      prisma.attendanceRecord.count({ where: { ...scope, status: 'pending' } }),
      prisma.overtimeRecord.count({ where: { ...scope, status: 'pending' } }),
      prisma.advance.count({ where: { status: 'pending', candidate: scope.countryId ? { countryId: scope.countryId } : {} } }),
      prisma.payroll.count({ where: { ...scope, status: 'pending_validation' } }),
      prisma.invoice.count({ where: { ...scope, status: { not: 'paid' }, dueDate: { lt: new Date() } } }),
      prisma.complaint.count({ where: { ...scope, status: { notIn: ['resolved', 'unfounded'] } } }),
      prisma.mission.count({ where: { ...scope, status: 'active', trialPeriodEnd: { lte: new Date(Date.now() + 7 * 86400000) }, trialConfirmed: false } }),
      prisma.candidate.count({ where: scope }),
      prisma.mission.count({ where: { ...scope, status: 'active' } }),
      prisma.invoice.aggregate({ where: scope, _sum: { total: true } }),
      prisma.payment.aggregate({ where: {}, _sum: { amount: true } }),
      prisma.country.findMany({ where: { active: true } }),
    ])

    const notifications = [
      ...overtimePending > 0 ? [{ id: 'ot', title: `${overtimePending} heure(s) sup à valider`, page: 'overtime', type: 'warning' }] : [],
      ...advancesPending > 0 ? [{ id: 'adv', title: `${advancesPending} avance(s) à approuver`, page: 'advances', type: 'warning' }] : [],
      ...attendancePending > 0 ? [{ id: 'att', title: `${attendancePending} présence(s) à valider`, page: 'attendance', type: 'warning' }] : [],
      ...payrollsPending > 0 ? [{ id: 'pay', title: `${payrollsPending} bulletin(s) à valider`, page: 'payrolls', type: 'warning' }] : [],
      ...invoicesOverdue > 0 ? [{ id: 'inv', title: `${invoicesOverdue} facture(s) en retard`, page: 'invoices', type: 'danger' }] : [],
      ...complaintsOpen > 0 ? [{ id: 'cmp', title: `${complaintsOpen} plainte(s) ouverte(s)`, page: 'complaints', type: 'danger' }] : [],
      ...trialEnding > 0 ? [{ id: 'tri', title: `${trialEnding} fin(s) d'essai imminente(s)`, page: 'missions', type: 'info' }] : [],
    ]

    return ok({
      counters: { attendance: attendancePending, overtime: overtimePending, advances: advancesPending, payrolls: payrollsPending, invoices: invoicesOverdue, complaints: complaintsOpen, evaluations: 0 },
      notifications,
      stats: { candidates, missions, totalCA: invoices._sum.total ?? 0, totalEncaisse: payments._sum.amount ?? 0 },
      countries,
    })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
