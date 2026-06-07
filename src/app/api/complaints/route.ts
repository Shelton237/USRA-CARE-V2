import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter , logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session, req)
    const clientId = new URL(req.url).searchParams.get('clientId') ?? ''
    const complaints = await prisma.complaint.findMany({
      where: { ...scope, ...(clientId && { clientId: Number(clientId) }) },
      include: {
        client: { select: { name: true, companyName: true } },
        candidates: { include: { candidate: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(complaints)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const b = await req.json()
    if (!b.clientId || !b.type || !b.severity || !b.description) return err('Champs requis manquants', 400)

    const client = await prisma.client.findUnique({ where: { id: Number(b.clientId) } })
    if (!client) return err('Client introuvable', 404)

    const complaint = await prisma.complaint.create({
      data: {
        countryId:    client.countryId,
        clientId:     Number(b.clientId),
        date:         new Date(b.date ?? new Date()),
        receivedVia:  b.receivedVia  ?? 'phone',
        receivedById: session.user?.id ? Number(session.user.id) : null,
        type:         b.type,
        severity:     b.severity,
        description:  b.description,
        status:       'received',
      },
    })

    // Lier les candidats concernés
    if (Array.isArray(b.candidateIds) && b.candidateIds.length > 0) {
      await prisma.complaintCandidate.createMany({
        data: b.candidateIds.map((cid: number) => ({ complaintId: complaint.id, candidateId: Number(cid) })),
        skipDuplicates: true,
      })
    }

    void logAudit(Number(session.user?.id), 'Création', 'Plaintes', complaint.id, complaint.type)
    return ok(complaint, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('POST /api/complaints', e)
    return err('Erreur serveur', 500)
  }
}
