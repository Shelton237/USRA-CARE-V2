import { prisma } from '@/lib/db'
import { ok, err, requireAuth, logAudit } from '@/lib/api'
import { renderInvoicePdf } from '@/lib/invoicePdf'
import { sendMail } from '@/lib/mailer'
import { fmt } from '@/lib/utils'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    const body = await req.json().catch(() => ({}))

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
        payments: { select: { amount: true } },
      },
    })
    if (!invoice) return err('Introuvable', 404)

    if (session.user?.role === 'operator' && invoice.countryId !== Number(session.user?.countryId)) {
      return err('Accès refusé', 403)
    }

    const to = body.to || invoice.client?.email
    if (!to) return err('Aucune adresse email pour ce client', 400)

    const pdf = await renderInvoicePdf(invoice)
    const sym = invoice.country?.symbol ?? '€'

    await sendMail({
      to,
      subject: `Facture ${invoice.reference} — USRA CARE`,
      html: `
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-joint la facture <strong>${invoice.reference}</strong> d'un montant de
        <strong>${fmt(invoice.total, sym)}</strong>, à régler avant le ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '—'}.</p>
        <p>Cordialement,<br/>USRA CARE</p>
      `,
      attachments: [{ filename: `${invoice.reference}.pdf`, content: pdf }],
    })

    void logAudit(Number(session.user?.id), 'Envoi email', 'Factures', id, to)
    return ok({ sent: true, to })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? "Erreur lors de l'envoi", 500)
  }
}
