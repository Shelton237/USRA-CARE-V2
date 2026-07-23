import { prisma } from '@/lib/db'
import { ok, err, requireAuth, scopeFilter } from '@/lib/api'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { sendMail } from '@/lib/mailer'

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

    const roleLabel: Record<string, string> = { admin: 'Administrateur', dg: 'Directeur Général', operator: 'Opérateur' }
    const appUrl = process.env.NEXTAUTH_URL?.replace('/v2', '') ?? 'https://usra-care.com/v2'
    void sendMail({
      to: data.email,
      subject: 'Bienvenue sur USRA-CARE Backoffice — Vos paramètres de connexion',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1E293B">
          <div style="background:#0D9488;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:22px">USRA CARE</h1>
            <p style="color:#CCFBF1;margin:4px 0 0;font-size:13px">Backoffice RH</p>
          </div>
          <div style="padding:32px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 16px">Bonjour <strong>${data.firstName} ${data.lastName}</strong>,</p>
            <p style="margin:0 0 24px;color:#475569">
              Votre compte a été créé sur la plateforme <strong>USRA-CARE Backoffice</strong>.
              Voici vos paramètres de connexion :
            </p>
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:20px 24px;margin:0 0 24px">
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-size:13px;width:120px">Rôle</td>
                  <td style="padding:6px 0;font-weight:600;font-size:13px">${roleLabel[data.role] ?? data.role}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-size:13px">Identifiant</td>
                  <td style="padding:6px 0;font-weight:600;font-size:13px">${data.email}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-size:13px">Mot de passe</td>
                  <td style="padding:6px 0;font-weight:600;font-size:13px;font-family:monospace;letter-spacing:1px">${password}</td>
                </tr>
              </table>
            </div>
            <a href="${appUrl}/login"
              style="display:inline-block;background:#0D9488;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
              Se connecter →
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#94A3B8">
              Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.
            </p>
          </div>
          <p style="text-align:center;font-size:11px;color:#CBD5E1;margin:16px 0 0">
            USRA CARE · ${user.country?.name ?? ''} · notifications@usra-care.com
          </p>
        </div>
      `,
    }).catch(mailErr => console.error('Mail creation user failed:', mailErr))

    return ok(safeUser, 201)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return err('Non autorisé', 401)
    if (e.code === 'P2002') return err('Email déjà utilisé', 409)
    return err(e.message ?? 'Erreur serveur', 500)
  }
}
