import { prisma } from '@/lib/db'
import { ok, err, requireAuth, logAudit } from '@/lib/api'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    const body = await req.json()
    const { userId, period, type, targetValue, countryId } = body
    console.log('[PUT /api/targets/[id]]', { id, userId, period, type, targetValue, countryId })
    const target = await prisma.target.update({
      where: { id },
      data: {
        userId:      Number(userId),
        period,
        type,
        targetValue: Number(targetValue),
        countryId:   countryId ? Number(countryId) : null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true, countryId: true } } },
    })
    console.log('[PUT /api/targets/[id]] updated ok, id=', target.id)
    void logAudit(Number(session.user?.id), 'Modification', 'Objectifs', id)
    return ok(target)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('[PUT /api/targets/[id]] error:', e.message, e.code ?? '')
    return err('Erreur serveur', 500)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    await prisma.target.delete({ where: { id } })
    void logAudit(Number(session.user?.id), 'Suppression', 'Objectifs', id)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('DELETE /api/targets/[id]', e)
    return err('Erreur serveur', 500)
  }
}
