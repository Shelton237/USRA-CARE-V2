import { prisma } from '@/lib/db'
import { ok, err, requireAuth, logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        country: { select: { name: true, symbol: true } },
        office:  { select: { name: true } },
        specialties: { include: { service: true } },
        interview: true,
        evaluations: { include: { client: { select: { name: true } } }, orderBy: { date: 'desc' } },
        missions: {
          include: { client: { select: { name: true } }, service: { select: { name: true, icon: true } } },
          orderBy: { startDate: 'desc' },
        },
        payrolls: { orderBy: { period: 'desc' } },
        complaints: {
          include: {
            complaint: {
              include: { client: { select: { name: true } } },
            },
          },
          orderBy: { complaint: { createdAt: 'desc' } },
        },
      },
    })
    if (!candidate) return err('Candidat introuvable', 404)
    return ok(candidate)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)

    const body = await req.json()
    const { specialties, primarySpecialtyId, interview, ...data } = body

    await prisma.$transaction(async tx => {
      await tx.candidate.update({
        where: { id },
        data: {
          ...data,
          primarySpecialtyId: primarySpecialtyId ? Number(primarySpecialtyId) : null,
        },
      })
      if (specialties !== undefined) {
        await tx.candidateSpecialty.deleteMany({ where: { candidateId: id } })
        if (specialties.length) {
          await tx.candidateSpecialty.createMany({
            data: specialties.map((sId: number) => ({
              candidateId: id, serviceId: sId,
              isPrimary: sId === Number(primarySpecialtyId),
            })),
          })
        }
      }
      if (interview !== undefined) {
        await tx.interview.upsert({
          where: { candidateId: id },
          create: { candidateId: id, template: interview.template, answers: interview.answers },
          update: { template: interview.template, answers: interview.answers },
        })
      }
    })

    const updated = await prisma.candidate.findUnique({
      where: { id },
      include: {
        country: { select: { name: true } },
        specialties: { include: { service: true } },
        evaluations: true,
      },
    })
    void logAudit(Number(session.user?.id), 'Modification', 'Candidats', id)
    return ok(updated)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('PUT /api/candidates/[id]', e)
    return err('Erreur serveur', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    await prisma.candidate.delete({ where: { id } })
    void logAudit(Number(session.user?.id), 'Suppression', 'Candidats', id)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
