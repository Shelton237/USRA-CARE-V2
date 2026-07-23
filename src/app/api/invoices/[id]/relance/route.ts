import { prisma } from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'
import { sendMail } from '@/lib/mailer'
import { renderInvoicePdf } from '@/lib/invoicePdf'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)

    const body = await req.json()
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
        relances: true,
      },
    })
    if (!invoice) return err('Introuvable', 404)

    const to: string = body.to || invoice.client?.email || ''
    if (!to) return err('Adresse email requise', 400)

    const sym = invoice.country?.symbol ?? '€'
    const paidAmount = (invoice.payments ?? []).reduce((s, p) => s + p.amount, 0)
    const remaining = invoice.total - paidAmount
    const relanceNum = (invoice.relances?.length ?? 0) + 1

    const pdf = await renderInvoicePdf(invoice as any)

    const dateStr = new Date(invoice.date).toLocaleDateString('fr-FR')
    const dueStr  = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '—'

    await sendMail({
      to,
      subject: `Relance n°${relanceNum} — Facture ${invoice.reference} — ${invoice.client?.name ?? ''}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1E293B">
          <div style="background:#0D9488;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:22px">USRA CARE</h1>
            <p style="color:#CCFBF1;margin:4px 0 0;font-size:13px">Relance de paiement — N°${relanceNum}</p>
          </div>
          <div style="padding:32px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 16px">Bonjour <strong>${invoice.client?.name ?? ''}</strong>,</p>
            <p style="margin:0 0 20px;color:#475569">
              Sauf erreur de notre part, la facture ci-dessous reste en attente de règlement.
              Nous vous remercions de bien vouloir procéder au paiement dans les meilleurs délais.
            </p>
            <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:20px 24px;margin:0 0 24px">
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:5px 0;color:#92400E;font-size:13px;width:140px">Référence</td>
                  <td style="padding:5px 0;font-weight:700;font-size:13px">${invoice.reference}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#92400E;font-size:13px">Date</td>
                  <td style="padding:5px 0;font-size:13px">${dateStr}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#92400E;font-size:13px">Échéance</td>
                  <td style="padding:5px 0;font-size:13px;color:#DC2626;font-weight:600">${dueStr}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#92400E;font-size:13px">Montant total</td>
                  <td style="padding:5px 0;font-weight:700;font-size:14px">${invoice.total.toLocaleString('fr-FR')} ${sym}</td>
                </tr>
                ${remaining < invoice.total ? `
                <tr>
                  <td style="padding:5px 0;color:#92400E;font-size:13px">Reste à payer</td>
                  <td style="padding:5px 0;font-weight:700;font-size:14px;color:#DC2626">${remaining.toLocaleString('fr-FR')} ${sym}</td>
                </tr>` : ''}
              </table>
            </div>
            ${invoice.country?.bankName && invoice.country?.bankAccount ? `
            <p style="font-size:13px;color:#475569;margin:0 0 8px"><strong>Coordonnées bancaires :</strong></p>
            <p style="font-size:13px;color:#475569;margin:0 0 24px">${invoice.country.bankName} — ${invoice.country.bankAccount}</p>
            ` : ''}
            <p style="margin:0;font-size:12px;color:#94A3B8">
              La facture est jointe à cet email. Pour toute question, contactez-nous à
              ${invoice.country?.entityEmail ?? 'contact@usra-care.com'}.
            </p>
          </div>
          <p style="text-align:center;font-size:11px;color:#CBD5E1;margin:16px 0 0">
            ${invoice.country?.entityName ?? 'USRA CARE'} · ${invoice.country?.taxId ?? ''}
          </p>
        </div>
      `,
      attachments: [{ filename: `${invoice.reference}.pdf`, content: pdf }],
    })

    const relance = await prisma.invoiceRelance.create({
      data: { invoiceId: id, to, note: body.note ?? null },
    })

    return ok({ relance, relanceNum })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('POST /relance', e)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
