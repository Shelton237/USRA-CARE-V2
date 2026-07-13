import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)
    const { searchParams } = new URL(req.url)
    const status    = searchParams.get('status')    ?? ''
    const type      = searchParams.get('type')      ?? ''
    const clientId  = searchParams.get('clientId')  ?? ''
    const countryId = searchParams.get('countryId') ?? ''

    const invoices = await prisma.invoice.findMany({
      where: {
        ...scope,
        ...(status    && { status }),
        ...(type      && { invoiceType: type }),
        ...(clientId  && { clientId: Number(clientId) }),
        ...(countryId && { countryId: Number(countryId) }),
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
    await requireAuth()
    const body = await req.json()
    const { lines, date, dueDate, ...invoiceData } = body

    // Générer la référence en utilisant l'année de la date de facture
    const country = await prisma.country.findUnique({ where: { id: invoiceData.countryId } })
    const invoiceYear = date ? new Date(date).getFullYear() : new Date().getFullYear()
    const count = await prisma.invoice.count({
      where: {
        countryId: invoiceData.countryId,
        date: { gte: new Date(invoiceYear, 0, 1), lt: new Date(invoiceYear + 1, 0, 1) },
      },
    })
    const reference = `${country?.invoicePrefix}-${invoiceYear}-${String(count + 1).padStart(4, '0')}`

    const invoice = await prisma.invoice.create({
      data: {
        ...invoiceData,
        date:    date    ? new Date(date)    : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        reference,
        lines: lines?.length ? { create: lines } : undefined,
      },
      include: { lines: true },
    })
    return ok(invoice, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
