import { prisma } from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    const body = await req.json()
    const client = await prisma.client.update({
      where: { id },
      data: {
        countryId:       body.countryId       ? Number(body.countryId) : undefined,
        type:            body.type,
        name:            body.name,
        companyName:     body.companyName     ?? null,
        contactPerson:   body.contactPerson   ?? null,
        phone:           body.phone,
        email:           body.email           ?? null,
        address:         body.address         ?? null,
        nif:             body.nif             ?? null,
        stat:            body.stat            ?? null,
        commissionRate:  body.commissionRate  !== undefined ? Number(body.commissionRate)  : undefined,
        paymentTermsDays:body.paymentTermsDays !== undefined ? Number(body.paymentTermsDays) : undefined,
        overtimeRate:    body.overtimeRate    !== undefined ? Number(body.overtimeRate) : undefined,
        billingFreq:     body.billingFreq,
        notes:           body.notes           ?? null,
      },
    })
    return ok(client)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('PUT /api/clients/[id]', e)
    return err('Erreur serveur', 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) return err('ID invalide', 400)
    await prisma.client.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    console.error('DELETE /api/clients/[id]', e)
    return err('Erreur serveur', 500)
  }
}
