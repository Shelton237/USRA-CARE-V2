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
    if (body.status)     data.status     = body.status
    if (body.daysWorked !== undefined) data.daysWorked = Number(body.daysWorked)
    if (body.notes      !== undefined) data.notes      = body.notes

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
