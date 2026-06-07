import { prisma } from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    const body = await req.json()

    const data: any = {}
    if (body.status !== undefined)        data.status        = body.status
    if (body.daysWorked !== undefined)    data.daysWorked    = Number(body.daysWorked)
    if (body.absJustified !== undefined)  data.absJustified  = Number(body.absJustified)
    if (body.absUnjustified !== undefined) data.absUnjustified = Number(body.absUnjustified)
    if (body.paidLeave !== undefined)     data.paidLeave     = Number(body.paidLeave)
    if (body.holidays !== undefined)      data.holidays      = Number(body.holidays)
    if (body.notes !== undefined)         data.notes         = body.notes

    if (body.status === 'validated') {
      data.validatedById = Number(session.user.id)
      data.validatedAt   = new Date()
    }

    const record = await prisma.attendanceRecord.update({ where: { id }, data })
    return ok(record)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('PATCH /api/attendance/[id]', e)
    return err('Erreur serveur', 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    await prisma.attendanceRecord.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
