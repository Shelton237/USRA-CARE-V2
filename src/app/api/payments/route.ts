import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter, logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session, _req)
    const payments = await prisma.payment.findMany({
      where: scope.countryId ? { invoice: { countryId: scope.countryId } } : {},
      include: {
        invoice: {
          select: {
            reference: true, total: true,
            client: { select: { name: true } },
            country: { select: { symbol: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    })
    return ok(payments)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await req.json()
    if (!body.invoiceId || !body.amount || !body.paymentMethod) return err('Champs requis manquants', 400)

    const invoice = await prisma.invoice.findUnique({ where: { id: Number(body.invoiceId) } })
    if (!invoice) return err('Facture introuvable', 404)

    const payment = await prisma.payment.create({
      data: {
        invoiceId:      Number(body.invoiceId),
        countryId:      invoice.countryId,
        date:           new Date(body.date),
        amount:         Number(body.amount),
        paymentMethod:  body.paymentMethod,
        mobileProvider: body.mobileProvider ?? null,
        reference:      body.reference ?? null,
        notes:          body.notes     ?? null,
      },
    })

    const totalPaid = await prisma.payment.aggregate({
      where: { invoiceId: invoice.id },
      _sum: { amount: true },
    })
    const paid = totalPaid._sum.amount ?? 0
    let newStatus = invoice.status
    if (paid >= invoice.total) newStatus = 'paid'
    else if (paid > 0) newStatus = 'partially_paid'
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: newStatus } })

    void logAudit(Number(session.user?.id), 'Paiement', 'Factures', Number(body.invoiceId))
    return ok(payment, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
