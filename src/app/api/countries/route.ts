import { prisma } from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

export async function GET() {
  try {
    await requireAuth()
    const countries = await prisma.country.findMany({
      where: { active: true },
      include: { contributions: true, irsaBrackets: { orderBy: { sortOrder: 'asc' } }, offices: true },
      orderBy: { name: 'asc' },
    })
    return ok(countries)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}
