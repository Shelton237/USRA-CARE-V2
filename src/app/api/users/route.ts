import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter, logAudit } from '@/lib/api'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const role = session.user?.role
    const countryId = session.user?.countryId ? Number(session.user.countryId) : null

    // Admin voit tout, DG voit son pays, Operator n'a pas accès
    const where: any = {}
    if (role === 'dg' && countryId) where.countryId = countryId
    else if (role === 'operator') return err('Accès refusé', 403)

    const search = new URL(req.url).searchParams.get('search') ?? ''
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName:  { contains: search } },
        { email:     { contains: search } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        country: { select: { id: true, name: true } },
        office:  { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Ne jamais renvoyer le mot de passe
    return ok(users.map(({ password: _, ...u }) => u))
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    return err('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const role = session.user?.role
    if (role === 'operator') return err('Accès refusé', 403)

    const body = await req.json()
    const { password, ...data } = body
    if (!password) return err('Mot de passe requis', 400)

    const hashedPassword = await bcrypt.hash(password, 10)
    const avatar = `${(data.firstName?.[0] ?? '').toUpperCase()}${(data.lastName?.[0] ?? '').toUpperCase()}`

    const user = await prisma.user.create({
      data: { ...data, password: hashedPassword, avatar },
      include: { country: true, office: true },
    })
    const { password: _, ...safeUser } = user
    void logAudit(Number(session.user?.id), 'Création', 'Utilisateurs', user.id, `${user.firstName} ${user.lastName}`)
    return ok(safeUser, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    if (e.code === 'P2002') return err('Email déjà utilisé', 409)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
