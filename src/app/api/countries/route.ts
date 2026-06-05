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
