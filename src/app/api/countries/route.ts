import { prisma } from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const url = new URL(req.url)
    const all = url.searchParams.get('all') === 'true'
    const isAdmin = session.user?.role === 'admin'

    const countries = await prisma.country.findMany({
      where: all && isAdmin ? {} : { active: true },
      include: { contributions: true, irsaBrackets: { orderBy: { sortOrder: 'asc' } }, offices: true },
      orderBy: { name: 'asc' },
    })
    return ok(countries)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    if (session.user?.role !== 'admin') return err('Accès refusé', 403)
    const body = await req.json()
    const { contributions, irsaBrackets, ...data } = body

    const country = await prisma.country.create({
      data: {
        name:                 data.name || 'Nouveau pays',
        code:                 (data.code || 'XX').toUpperCase(),
        currency:             data.currency || 'USD',
        currencyName:         data.currencyName || '',
        symbol:               data.symbol || '$',
        exchangeToEur:        parseFloat(data.exchangeToEur) || 1,
        phonePrefix:          data.phonePrefix || '',
        invoicePrefix:        data.invoicePrefix || '',
        active:               Boolean(data.active),
        entityName:           data.entityName || null,
        taxId:                data.taxId || null,
        statId:               data.statId || null,
        address:              data.address || null,
        city:                 data.city || null,
        entityPhone:          data.entityPhone || null,
        entityEmail:          data.entityEmail || null,
        bankName:             data.bankName || null,
        bankAccount:          data.bankAccount || null,
        legalMention:         data.legalMention || null,
        mobileMoneyProviders: data.mobileMoneyProviders || null,
        vatRate:              parseFloat(data.vatRate) || 20,
        syntheticTaxEnabled:  Boolean(data.syntheticTaxEnabled),
        syntheticTaxRate:     parseFloat(data.syntheticTaxRate) || 0,
        prorataBase:          parseInt(data.prorataBase) || 30,
        ...(Array.isArray(contributions) && contributions.length > 0 ? {
          contributions: { createMany: { data: contributions.map((c: any, i: number) => ({
            code: c.code || `contrib_${i}`, label: c.label || '', mode: c.mode || 'percent',
            value: parseFloat(c.value) || 0, base: c.base || 'gross',
            part: c.part || 'employee', enabled: c.enabled !== false,
          })) } }
        } : {}),
        ...(Array.isArray(irsaBrackets) && irsaBrackets.length > 0 ? {
          irsaBrackets: { createMany: { data: irsaBrackets.map((b: any, i: number) => ({
            fromAmount: parseFloat(b.fromAmount) || 0,
            toAmount: b.toAmount != null ? parseFloat(b.toAmount) : null,
            rate: parseFloat(b.rate) || 0, sortOrder: i + 1,
          })) } }
        } : {}),
      },
      include: { contributions: true, irsaBrackets: { orderBy: { sortOrder: 'asc' } }, offices: true },
    })
    return ok(country)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('POST /api/countries', e)
    return err('Erreur serveur', 500)
  }
}
