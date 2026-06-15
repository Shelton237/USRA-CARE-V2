import { prisma } from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    const body = await req.json()
    const tpl = await prisma.interviewTemplate.update({
      where: { id },
      data: { label: body.label, sections: body.sections ?? [] },
    })
    return ok(tpl)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
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
    await prisma.interviewTemplate.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
