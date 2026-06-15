import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const scope = scopeFilter(session)
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const type = searchParams.get('type') ?? ''

    const clients = await prisma.client.findMany({
      where: {
        ...scope,
        ...(type && { type }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { companyName: { contains: search } },
            { phone: { contains: search } },
          ],
        }),
      },
      include: {
        country: { select: { name: true, symbol: true } },
        _count: { select: { missions: true, invoices: true, complaints: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(clients)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const body = await req.json()
    const client = await prisma.client.create({ data: body })
    return ok(client, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
