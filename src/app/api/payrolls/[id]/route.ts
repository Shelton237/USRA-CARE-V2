import { prisma } from '@/lib/db'
import { ok, err, requireAuth, logAudit } from '@/lib/api'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)

    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        candidate: { select: { firstName: true, lastName: true, nationalId: true, phone: true } },
        mission: { select: { startDate: true, client: { select: { name: true } } } },
        country: {
          select: { entityName: true, taxId: true, statId: true, address: true, city: true, legalMention: true, symbol: true },
        },
      },
    })
    if (!payroll) return err('Introuvable', 404)

    const [y, m] = payroll.period.split('-').map(Number)
    const overtime = await prisma.overtimeRecord.aggregate({
      where: { missionId: payroll.missionId, status: 'validated', date: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) } },
      _sum: { hours: true },
    })

    return ok({ ...payroll, overtimeHours: overtime._sum.hours ?? 0 })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    const body = await req.json()

    const data: any = {}
    if (body.action === 'pay') {
      data.status      = 'paid'
      data.paymentDate = new Date()
      if (body.paymentMethod) data.paymentMethod = body.paymentMethod
      if (body.paymentRef)    data.paymentRef    = body.paymentRef
      data.validatedById = Number(session.user.id)
      data.validatedAt   = new Date()
    } else if (body.action === 'reject') {
      data.status = 'rejected'
    } else if (body.action === 'modify') {
      const current = await prisma.payroll.findUnique({
        where: { id },
        select: { netBase: true, overtimeAmount: true, deductions: true },
      })
      if (!current) return err('Introuvable', 404)
      const bonuses         = Number(body.bonuses ?? 0)
      const manualDeductions = Number(body.manualDeductions ?? 0)
      data.bonuses    = bonuses
      data.netSalary  = (current.netBase ?? 0) + (current.overtimeAmount ?? 0) + bonuses - (current.deductions ?? 0) - manualDeductions
      if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod || null
      if (body.status !== undefined) {
        data.status = body.status
        if (body.status === 'paid') {
          data.paymentDate   = new Date()
          data.validatedById = Number(session.user.id)
          data.validatedAt   = new Date()
        }
      }
    }

    const payroll = await prisma.payroll.update({ where: { id }, data })
    void logAudit(Number(session.user?.id), body.action === 'pay' ? 'Paiement' : body.action === 'reject' ? 'Rejet' : 'Modification', 'Bulletins', id)
    return ok(payroll)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    await prisma.payroll.delete({ where: { id } })
    void logAudit(Number(session.user?.id), 'Suppression', 'Bulletins', id)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
