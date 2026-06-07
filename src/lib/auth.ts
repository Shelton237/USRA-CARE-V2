import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

async function auditAuth(userId: number, action: string, detail?: string) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, module: 'auth', detail: detail ?? null },
    })
  } catch {}
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret:    process.env.NEXTAUTH_SECRET,
  session:   { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  pages: {
    signIn: '/v2/login',
    error:  '/v2/login',
  },
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',        type: 'email'    },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { country: true },
        })
        if (!user || !user.active) return null
        const valid = await bcrypt.compare(credentials.password as string, user.password)
        if (!valid) {
          await auditAuth(user.id, 'LOGIN_FAILED', `Mot de passe incorrect — ${user.email}`)
          return null
        }
        return {
          id:            String(user.id),
          email:         user.email,
          name:          `${user.firstName} ${user.lastName}`,
          role:          user.role,
          countryId:     user.countryId,
          officeId:      user.officeId,
          firstName:     user.firstName,
          lastName:      user.lastName,
          avatar:        user.avatar ?? `${user.firstName[0]}${user.lastName[0]}`,
          countryName:   user.country?.name   ?? null,
          countrySymbol: user.country?.symbol ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) Object.assign(token, user)
      return token
    },
    async session({ session, token }: any) {
      session.user = { ...session.user, ...token }
      return session
    },
  },
  events: {
    async signIn({ user }: any) {
      if (user?.id) {
        await auditAuth(
          Number(user.id),
          'LOGIN',
          `Connexion réussie — ${user.email}`
        )
      }
    },
    async signOut({ token }: any) {
      if (token?.id) {
        await auditAuth(
          Number(token.id),
          'LOGOUT',
          `Déconnexion — ${token.email}`
        )
      }
    },
  },
})
