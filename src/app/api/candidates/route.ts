import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter, logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session, req)
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? ''

    const candidates = await prisma.candidate.findMany({
      where: {
        ...scope,
        ...(status && { status }),
        ...(search && {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }),
      },
      include: {
        country: { select: { name: true, symbol: true } },
        office: { select: { name: true } },
        specialties: { include: { service: true } },
        evaluations: true,
        missions: { where: { status: 'active' }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(candidates)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await req.json()
    const { specialties, primarySpecialtyId, interview, ...data } = body

    const candidate = await prisma.candidate.create({
      data: {
        ...data,
        primarySpecialtyId: primarySpecialtyId ? Number(primarySpecialtyId) : null,
        specialties: specialties?.length ? {
          create: specialties.map((sId: number) => ({
            serviceId: sId,
            isPrimary: sId === primarySpecialtyId,
          })),
        } : undefined,
        ...(interview ? {
          interview: { create: { template: interview.template, answers: interview.answers } },
        } : {}),
      },
    })
    void logAudit(Number(session.user?.id), 'Création', 'Candidats', candidate.id, `${candidate.firstName} ${candidate.lastName}`)
    return ok(candidate, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
