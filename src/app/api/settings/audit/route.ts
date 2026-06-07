import { prisma } from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

export async function GET() {
  try {
    const session = await requireAuth()
    if (!['admin', 'dg'].includes(session.user?.role ?? '')) return err('Accès refusé', 403)

    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    })

    const data = logs.map(l => ({
      id:         l.id,
      timestamp:  l.createdAt,
      userId:     l.userId,
      userName:   `${l.user.firstName} ${l.user.lastName}`.trim(),
      action:     l.action,
      module:     l.module,
      entityId:   l.entityId,
      detail:     l.detail,
    }))

    return ok(data)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
