import { prisma } from '@/lib/db'
import { err, requireAuth } from '@/lib/api'
import { renderInvoicePdf } from '@/lib/invoicePdf'

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
        payments: { select: { amount: true } },
      },
    })
    if (!invoice) return err('Introuvable', 404)

    const pdf = await renderInvoicePdf(invoice)
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.reference}.pdf"`,
      },
    })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
