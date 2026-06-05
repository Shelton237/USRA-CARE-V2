import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  const [users, countries, services, offices, candidates, clients, missions] = await Promise.all([
    prisma.user.count(),
    prisma.country.count(),
    prisma.service.count(),
    prisma.office.count(),
    prisma.candidate.count(),
    prisma.client.count(),
    prisma.mission.count(),
  ])

  console.log('\n📊 Base de données : usra_backoffice (MySQL via WAMP)')
  console.log('──────────────────────────────────────')
  console.log(`✅ Utilisateurs  : ${users}`)
  console.log(`✅ Pays          : ${countries}`)
  console.log(`✅ Bureaux       : ${offices}`)
  console.log(`✅ Services      : ${services}`)
  console.log(`✅ Candidats     : ${candidates}`)
  console.log(`✅ Clients       : ${clients}`)
  console.log(`✅ Missions      : ${missions}`)
  console.log('──────────────────────────────────────')
  console.log('✅ Connexion MySQL OK — les données persistent bien en BD\n')
}

check().catch(console.error).finally(() => prisma.$disconnect())
