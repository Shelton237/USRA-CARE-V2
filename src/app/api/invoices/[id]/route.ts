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
        lines: { include: { overtimeRecords: { select: { id: true } } } },
        payments: { orderBy: { date: 'desc' } },
        relances: { orderBy: { sentAt: 'desc' } },
      },
    })
    if (!invoice) return err('Introuvable', 404)
    return ok(invoice)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)

    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) return err('Introuvable', 404)
    if (invoice.status !== 'draft') return err('Seules les factures brouillon sont modifiables', 400)
    if (session.user?.role === 'operator' && invoice.countryId !== Number(session.user?.countryId)) {
      return err('Accès refusé', 403)
    }

    const body = await req.json()
    const { lines, date, dueDate, reference, id: _id, ...data } = body

    // Libère les heures sup liées aux anciennes lignes avant de les supprimer
    // (la FK OvertimeRecord.invoiceLineId passe à onDelete: SetNull, donc pas d'échec ici,
    // mais on le fait explicitement pour rester correct même si l'ordre de suppression changeait)
    await prisma.invoiceLine.deleteMany({ where: { invoiceId: id } })

    const linesInput = (lines ?? []).map((l: any) => {
      const { overtimeRecordId, ...rest } = l
      return rest
    })

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...data,
        date:    date    ? new Date(date)    : invoice.date,
        dueDate: dueDate ? new Date(dueDate) : null,
        lines: linesInput.length ? { create: linesInput } : undefined,
      },
      include: { lines: { orderBy: { id: 'asc' } } },
    })

    await Promise.all(
      (lines ?? []).map((l: any, i: number) =>
        l.overtimeRecordId
          ? prisma.overtimeRecord.update({ where: { id: Number(l.overtimeRecordId) }, data: { invoiceLineId: updated.lines[i].id } })
          : Promise.resolve()
      )
    )

    void logAudit(Number(session.user?.id), 'Modification', 'Factures', id)
    return ok(updated)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    const body = await req.json()

    // Vérifier le scope pour les opérateurs
    if (session.user?.role === 'operator') {
      const invoice = await prisma.invoice.findUnique({ where: { id }, select: { countryId: true } })
      if (invoice?.countryId !== Number(session.user?.countryId)) return err('Accès refusé', 403)
    }

    const data: any = {}
    if (body.action === 'set-acompte') {
      if (!body.acompteAmount || body.acompteAmount <= 0) return err('Montant requis', 400)
      const inv = await prisma.invoice.findUnique({ where: { id } })
      if (!inv) return err('Introuvable', 404)
      data.acompteAmount = Number(body.acompteAmount)
      data.acompteDate   = body.acompteDate ? new Date(body.acompteDate) : new Date()
      data.acompteMethod = body.acompteMethod ?? 'cash'
      await prisma.payment.create({
        data: {
          invoiceId:     id,
          countryId:     inv.countryId,
          date:          data.acompteDate,
          amount:        data.acompteAmount,
          paymentMethod: data.acompteMethod,
          notes:         'acompte',
        },
      })
      await prisma.cashEntry.create({
        data: {
          countryId:   inv.countryId,
          type:        'income',
          category:    'encaissement',
          date:        data.acompteDate,
          amount:      data.acompteAmount,
          description: `Acompte Facture ${inv.reference}`,
        },
      })
      data.status = data.acompteAmount >= inv.total ? 'paid' : 'partially_paid'
    } else if (body.action === 'mark-sent') {
      data.status = 'sent'
    } else if (body.action === 'mark-paid') {
      data.status = 'paid'
      if (body.paymentMethod) data.paymentMethod = body.paymentMethod
    } else if (body.action === 'mark-overdue') {
      if (session.user?.role === 'operator') return err('Accès refusé', 403)
      data.status = 'overdue'
    } else {
      if (session.user?.role === 'operator') return err('Accès refusé', 403)
      if (body.status !== undefined) data.status = body.status
      if (body.notes !== undefined) data.notes = body.notes
    }

    // Marquer payée doit aussi créer la ligne de paiement correspondante (sinon elle
    // n'apparaît jamais dans Paiements reçus ni dans les totaux encaissés)
    if (body.action === 'mark-paid') {
      const before = await prisma.invoice.findUnique({
        where: { id },
        include: { payments: { select: { amount: true } } },
      })
      if (before) {
        const alreadyPaid = before.payments.reduce((s, p) => s + p.amount, 0)
        const remaining = before.total - alreadyPaid
        if (remaining > 0) {
          await prisma.payment.create({
            data: {
              invoiceId: id,
              countryId: before.countryId,
              date: new Date(),
              amount: remaining,
              paymentMethod: body.paymentMethod ?? before.paymentMethod ?? 'cash',
            },
          })
          await prisma.cashEntry.create({
            data: {
              countryId: before.countryId,
              type: 'income',
              category: 'encaissement',
              date: new Date(),
              amount: remaining,
              description: `Facture ${before.reference}`,
            },
          })
        }
      }
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
