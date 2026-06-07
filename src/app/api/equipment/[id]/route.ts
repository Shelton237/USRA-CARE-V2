import { prisma } from '@/lib/db'
import { ok, err, requireAuth, logAudit } from '@/lib/api'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)

    const body = await req.json()
    const data: any = {}

    // Champs de statut
    if (body.returnedAt !== undefined) data.returnedAt = body.returnedAt ? new Date(body.returnedAt) : null
    // Champs éditables
    if (body.signed      !== undefined) data.signed     = Boolean(body.signed)
    if (body.notes       !== undefined) data.notes      = body.notes ?? null
    if (body.date        !== undefined) data.date       = new Date(body.date)
    if (body.missionId   !== undefined) data.missionId  = body.missionId ? Number(body.missionId) : null
    if (body.items       !== undefined) {
      data.items      = body.items
      data.totalValue = (body.items as any[]).reduce((s: number, it: any) => s + Number(it.value ?? 0), 0)
    }
    if (body.totalValue !== undefined && body.items === undefined) data.totalValue = Number(body.totalValue)

    const record = await prisma.equipmentRecord.update({ where: { id }, data })
    void logAudit(Number(session.user?.id), body.returnedAt ? 'Restitution' : 'Modification', 'Matériels', id)
    return ok(record)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('PATCH /api/equipment/[id]', e)
    return err('Erreur serveur', 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    await prisma.equipmentRecord.delete({ where: { id } })
    void logAudit(Number(session.user?.id), 'Suppression', 'Matériels', id)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
