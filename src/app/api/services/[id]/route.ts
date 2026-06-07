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
    const service = await prisma.service.update({
      where: { id },
      data: {
        name:              body.name,
        type:              body.type,
        icon:              body.icon              ?? null,
        category:          body.category          ?? null,
        description:       body.description       ?? null,
        interviewTemplate: body.interviewTemplate ?? null,
        active:            body.active            ?? true,
      },
    })
    void logAudit(Number(session.user?.id), 'Modification', 'Services', id)
    return ok(service)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('PUT /api/services/[id]', e)
    return err('Erreur serveur', 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    await prisma.service.delete({ where: { id } })
    void logAudit(Number(session.user?.id), 'Suppression', 'Services', id)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('DELETE /api/services/[id]', e)
    return err('Erreur serveur', 500)
  }
}
