import { prisma } from '@/lib/db'
import { ok, err, requireAuth, logAudit } from '@/lib/api'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    const { action } = await req.json()
    if (!['validate','reject'].includes(action)) return err('Action invalide', 400)

    const record = await prisma.overtimeRecord.update({
      where: { id },
      data: {
        status:       action === 'validate' ? 'validated' : 'rejected',
        validatedById: Number(session.user.id),
        validatedAt:   new Date(),
      },
    })
    void logAudit(Number(session.user?.id), action === 'validate' ? 'Validation' : 'Rejet', 'Heures sup.', id)
    return ok(record)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('PATCH /api/overtime/[id]', e)
    return err('Erreur serveur', 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    await prisma.overtimeRecord.delete({ where: { id } })
    void logAudit(Number(session.user?.id), 'Suppression', 'Heures sup.', id)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
