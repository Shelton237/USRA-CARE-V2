import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function run() {
  const exists = await prisma.user.findUnique({ where: { email: 'hanta@usra-care.com' } })
  if (exists) { console.log('Hanta existe déjà'); return }

  await prisma.user.create({
    data: {
      firstName: 'Hanta', lastName: 'Razafy',
      email: 'hanta@usra-care.com', phone: '+261 34 00 00 03',
      role: 'operator', countryId: 1, officeId: 2,
      avatar: 'HR', active: true,
      password: await bcrypt.hash('op123', 10),
    },
  })
  console.log('✅ Hanta Razafy créée — op123')
}

run().catch(console.error).finally(() => prisma.$disconnect())
