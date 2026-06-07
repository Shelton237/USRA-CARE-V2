import { prisma } from '@/lib/db'
import { ok, err, requireAuth, logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)

    const { id } = await params
    const body = await req.json()
    const { password, ...data } = body
    const avatar = `${(data.firstName?.[0] ?? '').toUpperCase()}${(data.lastName?.[0] ?? '').toUpperCase()}`

    const updateData: any = { ...data, avatar }
    if (password) updateData.password = await bcrypt.hash(password, 10)

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      include: { country: true, office: true },
    })
    const { password: _, ...safeUser } = user
    void logAudit(Number(session.user?.id), 'Modification', 'Utilisateurs', Number(id))
    return ok(safeUser)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role !== 'admin') return err('Accès refusé', 403)

    const { id } = await params
    if (String(session.user?.id) === id) return err('Vous ne pouvez pas supprimer votre propre compte', 400)

    await prisma.user.delete({ where: { id: Number(id) } })
    void logAudit(Number(session.user?.id), 'Suppression', 'Utilisateurs', Number(id))
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
