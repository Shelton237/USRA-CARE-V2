import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter, logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session, req)
    const { searchParams } = new URL(req.url)
    const status   = searchParams.get('status')   ?? ''
    const type     = searchParams.get('type')     ?? ''
    const clientId = searchParams.get('clientId') ?? ''

    const invoices = await prisma.invoice.findMany({
      where: {
        ...scope,
        ...(status   && { status }),
        ...(type     && { invoiceType: type }),
        ...(clientId && { clientId: Number(clientId) }),
      },
      include: {
        client: { select: { name: true } },
        country: { select: { name: true, symbol: true } },
        payments: { select: { amount: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { date: 'desc' },
    })
    return ok(invoices)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await req.json()
    const { lines, ...invoiceData } = body

    // Générer la référence
    const country = await prisma.country.findUnique({ where: { id: invoiceData.countryId } })
    const year = new Date().getFullYear()
    const count = await prisma.invoice.count({ where: { countryId: invoiceData.countryId } })
    const reference = `${country?.invoicePrefix}-${year}-${String(count + 1).padStart(4, '0')}`

    const invoice = await prisma.invoice.create({
      data: {
        ...invoiceData,
        reference,
        lines: lines?.length ? { create: lines } : undefined,
      },
      include: { lines: true },
    })
    void logAudit(Number(session.user?.id), 'Création', 'Factures', invoice.id, invoice.reference)
    return ok(invoice, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
