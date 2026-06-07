import { prisma } from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role !== 'admin') return err('Accès refusé', 403)

    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)

    const body = await req.json()
    const { contributions, irsaBrackets, offices, ...data } = body

    await prisma.country.update({
      where: { id },
      data: {
        name:                 data.name,
        currency:             data.currency,
        currencyName:         data.currencyName,
        symbol:               data.symbol,
        exchangeToEur:        parseFloat(data.exchangeToEur) || 1,
        phonePrefix:          data.phonePrefix,
        invoicePrefix:        data.invoicePrefix,
        active:               Boolean(data.active),
        entityName:           data.entityName ?? null,
        taxId:                data.taxId ?? null,
        statId:               data.statId ?? null,
        address:              data.address ?? null,
        city:                 data.city ?? null,
        entityPhone:          data.entityPhone ?? null,
        entityEmail:          data.entityEmail ?? null,
        bankName:             data.bankName ?? null,
        bankAccount:          data.bankAccount ?? null,
        legalMention:         data.legalMention ?? null,
        mobileMoneyProviders: data.mobileMoneyProviders ?? null,
        vatRate:              parseFloat(data.vatRate) || 20,
        syntheticTaxEnabled:  Boolean(data.syntheticTaxEnabled),
        syntheticTaxRate:     parseFloat(data.syntheticTaxRate) || 0,
        prorataBase:          parseInt(data.prorataBase) || 30,
      },
    })

    // Replace contributions
    if (Array.isArray(contributions)) {
      await prisma.contribution.deleteMany({ where: { countryId: id } })
      if (contributions.length > 0) {
        await prisma.contribution.createMany({
          data: contributions.map((c: any, i: number) => ({
            countryId: id,
            code:      c.code || `contrib_${i}`,
            label:     c.label || '',
            mode:      c.mode || 'percent',
            value:     parseFloat(c.value) || 0,
            base:      c.base || 'gross',
            part:      c.part || 'employee',
            enabled:   c.enabled !== false,
          })),
        })
      }
    }

    // Replace IRSA brackets
    if (Array.isArray(irsaBrackets)) {
      await prisma.irsaBracket.deleteMany({ where: { countryId: id } })
      if (irsaBrackets.length > 0) {
        await prisma.irsaBracket.createMany({
          data: irsaBrackets.map((b: any, i: number) => ({
            countryId:  id,
            fromAmount: parseFloat(b.fromAmount) || 0,
            toAmount:   b.toAmount != null ? parseFloat(b.toAmount) : null,
            rate:       parseFloat(b.rate) || 0,
            sortOrder:  i + 1,
          })),
        })
      }
    }

    const updated = await prisma.country.findUnique({
      where: { id },
      include: {
        contributions: true,
        irsaBrackets: { orderBy: { sortOrder: 'asc' } },
        offices: true,
      },
    })

    return ok(updated)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('PUT /api/countries/[id]', e)
    return err('Erreur serveur', 500)
  }
}

// Mise à jour rapide du taux de change uniquement
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role !== 'admin') return err('Accès refusé', 403)

    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)

    const body = await req.json()
    const exchangeToEur = parseFloat(body.exchangeToEur)
    if (!exchangeToEur || exchangeToEur <= 0) return err('Taux invalide', 400)

    const updated = await prisma.country.update({
      where: { id },
      data: { exchangeToEur },
      select: { id: true, name: true, symbol: true, exchangeToEur: true },
    })

    return ok(updated)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.user?.role !== 'admin') return err('Accès refusé', 403)

    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)

    await prisma.country.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
