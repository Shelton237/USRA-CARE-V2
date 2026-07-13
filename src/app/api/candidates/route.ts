import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)
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
    const { specialties, primarySpecialtyId, interview, birthDate, ...data } = body
    const ns = (v: any) => (v === '' || v == null) ? null : v

    const candidate = await prisma.candidate.create({
      data: {
        ...data,
        birthDate:        birthDate ? new Date(birthDate) : null,
        phone2:           ns(data.phone2),
        email:            ns(data.email),
        address:          ns(data.address),
        city:             ns(data.city),
        nationalId:       ns(data.nationalId),
        emergencyName1:   ns(data.emergencyName1),
        emergencyPhone1:  ns(data.emergencyPhone1),
        emergencyRelation1: ns(data.emergencyRelation1),
        emergencyName2:   ns(data.emergencyName2),
        emergencyPhone2:  ns(data.emergencyPhone2),
        emergencyRelation2: ns(data.emergencyRelation2),
        guarantorName:    ns(data.guarantorName),
        guarantorPhone:   ns(data.guarantorPhone),
        guarantorId:      ns(data.guarantorId),
        guarantorJob:     ns(data.guarantorJob),
        guarantorAddress: ns(data.guarantorAddress),
        mobileMoneyAccount: ns(data.mobileMoneyAccount),
        bankAccount:      ns(data.bankAccount),
        notes:            ns(data.notes),
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
    return ok(candidate, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
