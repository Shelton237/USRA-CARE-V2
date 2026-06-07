import { prisma } from '@/lib/db'
import { ok, err, requireAuth, logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  try {
    await requireAuth()
    const services = await prisma.service.findMany({
      orderBy: { name: 'asc' },
    })
    return ok(services)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const body = await req.json()
    if (!body.name) return err('Nom requis', 400)
    const service = await prisma.service.create({
      data: {
        name:              body.name,
        type:              body.type ?? 'long_term',
        icon:              body.icon              ?? null,
        category:          body.category          ?? null,
        description:       body.description       ?? null,
        interviewTemplate: body.interviewTemplate ?? null,
        active:            true,
      },
    })
    void logAudit(Number(session.user?.id), 'Création', 'Services', service.id, service.name)
    return ok(service, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('POST /api/services', e)
    return err('Erreur serveur', 500)
  }
}
