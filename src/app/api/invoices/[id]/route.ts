import { prisma } from '@/lib/db'
import { ok, err, requireAuth, logAudit } from '@/lib/api'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        country: {
          select: {
            entityName: true, taxId: true, statId: true, address: true, city: true,
            entityPhone: true, entityEmail: true, bankName: true, bankAccount: true,
            legalMention: true, symbol: true,
          },
        },
        lines: true,
        payments: { orderBy: { date: 'desc' } },
      },
    })
    if (!invoice) return err('Introuvable', 404)
    return ok(invoice)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role === 'operator') return err('Accès refusé', 403)
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    const body = await req.json()

    const data: any = {}
    if (body.action === 'mark-sent') {
      data.status = 'sent'
    } else if (body.action === 'mark-paid') {
      data.status = 'paid'
      if (body.paymentMethod) data.paymentMethod = body.paymentMethod
    } else if (body.action === 'mark-overdue') {
      data.status = 'overdue'
    } else {
      if (body.status !== undefined) data.status = body.status
      if (body.notes !== undefined) data.notes = body.notes
    }

    const invoice = await prisma.invoice.update({ where: { id }, data })
    void logAudit(Number(session.user?.id), 'Changement statut', 'Factures', id, body.action ?? data.status)
    return ok(invoice)
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
    await prisma.invoice.delete({ where: { id } })
    void logAudit(Number(session.user?.id), 'Suppression', 'Factures', id)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
