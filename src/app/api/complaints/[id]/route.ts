import { prisma } from '@/lib/db'
import { ok, err, requireAuth, logAudit } from '@/lib/api'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)

    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)

    const body = await req.json()

    const data: any = {}
    // Status transition
    if (body.status !== undefined) {
      data.status = body.status
      if (body.status === 'resolved' || body.status === 'unfounded') {
        data.resolvedAt   = new Date()
        data.resolvedById = session.user?.id ? Number(session.user.id) : null
      }
    }
    // Decision fields
    if (body.decision      !== undefined) data.decision       = body.decision || null
    if (body.decisionDetail !== undefined) data.decisionDetail = body.decisionDetail || null
    // Full-field edits
    if (body.date        !== undefined) data.date        = new Date(body.date)
    if (body.receivedVia !== undefined) data.receivedVia = body.receivedVia
    if (body.type        !== undefined) data.type        = body.type
    if (body.severity    !== undefined) data.severity    = body.severity
    if (body.description !== undefined) data.description = body.description

    const complaint = await prisma.complaint.update({ where: { id }, data })

    // Replace candidates if candidateIds provided
    if (Array.isArray(body.candidateIds)) {
      await prisma.complaintCandidate.deleteMany({ where: { complaintId: id } })
      if (body.candidateIds.length > 0) {
        await prisma.complaintCandidate.createMany({
          data: body.candidateIds.map((cid: number) => ({
            complaintId: id,
            candidateId: Number(cid),
          })),
          skipDuplicates: true,
        })
      }
    }

    void logAudit(Number(session.user?.id), body.status ? 'Changement statut' : 'Modification', 'Plaintes', id, body.status ?? null)
    return ok(complaint)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('PATCH /api/complaints/[id]', e)
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

    await prisma.complaint.delete({ where: { id } })
    void logAudit(Number(session.user?.id), 'Suppression', 'Plaintes', id)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
