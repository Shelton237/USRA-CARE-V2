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
    if (!['approve','reject'].includes(action)) return err('Action invalide', 400)

    const advance = await prisma.advance.update({
      where: { id },
      data: {
        status:      action === 'approve' ? 'approved' : 'rejected',
        approvedById: Number(session.user.id),
        approvedAt:  new Date(),
      },
    })
    void logAudit(Number(session.user?.id), action === 'approve' ? 'Approbation' : 'Rejet', 'Avances', id)
    return ok(advance)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('PATCH /api/advances/[id]', e)
    return err('Erreur serveur', 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    await prisma.advance.delete({ where: { id } })
    void logAudit(Number(session.user?.id), 'Suppression', 'Avances', id)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
