import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Pays
  const mg = await prisma.country.upsert({
    where: { code: 'MG' },
    update: {},
    create: {
      name: 'Madagascar', code: 'MG', currency: 'MGA', currencyName: 'Ariary',
      symbol: 'Ar', exchangeToEur: 0.0002, phonePrefix: '+261', invoicePrefix: 'MG',
      active: true, entityName: 'USRA CARE SARLU', taxId: 'NIF : 5018370696',
      statId: 'STAT : 81211 11 2023 0 11485', address: 'LOT IIP 154 JC Météo Avaradoha',
      city: 'Antananarivo 101', entityPhone: '+261 38 262 02 50', entityEmail: 'contact@usra-care.com',
      bankName: 'BNI Madagascar', bankAccount: '00001 23456 78901234567 89',
      legalMention: 'SARL unipersonnelle au capital de 1 000 000 Ar',
      vatRate: 20, syntheticTaxEnabled: true, syntheticTaxRate: 5, prorataBase: 30,
      contributions: {
        create: [
          { code: 'cnaps_e', label: 'CNaPS (patronal)', mode: 'percent', value: 13, part: 'employer', enabled: true },
          { code: 'cnaps_s', label: 'CNaPS (salarial)', mode: 'percent', value: 1, part: 'employee', enabled: true },
          { code: 'ostie_e', label: 'OSTIE (patronal)', mode: 'percent', value: 5, part: 'employer', enabled: true },
          { code: 'ostie_s', label: 'OSTIE (salarial)', mode: 'percent', value: 1, part: 'employee', enabled: true },
          { code: 'fmfp', label: 'FMFP', mode: 'percent', value: 1, part: 'employer', enabled: true },
        ],
      },
      irsaBrackets: {
        create: [
          { fromAmount: 0, toAmount: 350000, rate: 0, sortOrder: 1 },
          { fromAmount: 350000, toAmount: 400000, rate: 5, sortOrder: 2 },
          { fromAmount: 400000, toAmount: 500000, rate: 10, sortOrder: 3 },
          { fromAmount: 500000, toAmount: 600000, rate: 15, sortOrder: 4 },
          { fromAmount: 600000, toAmount: null, rate: 20, sortOrder: 5 },
        ],
      },
    },
  })

  const cm = await prisma.country.upsert({
    where: { code: 'CM' },
    update: {},
    create: {
      name: 'Cameroun', code: 'CM', currency: 'XAF', currencyName: 'Franc CFA',
      symbol: 'FCFA', exchangeToEur: 0.00152, phonePrefix: '+237', invoicePrefix: 'CM',
      active: true, entityName: 'USRA CARE Cameroun SARL', taxId: 'NIU : M021912345678X',
      city: 'Douala', vatRate: 19.25, prorataBase: 30,
      contributions: {
        create: [
          { code: 'cnps_e', label: 'CNPS (patronal)', mode: 'percent', value: 11.2, part: 'employer', enabled: true },
          { code: 'cnps_s', label: 'CNPS (salarial)', mode: 'percent', value: 4.2, part: 'employee', enabled: true },
        ],
      },
      irsaBrackets: {
        create: [
          { fromAmount: 0, toAmount: 62000, rate: 0, sortOrder: 1 },
          { fromAmount: 62000, toAmount: 310000, rate: 10, sortOrder: 2 },
          { fromAmount: 310000, toAmount: null, rate: 15, sortOrder: 3 },
        ],
      },
    },
  })

  const ci = await prisma.country.upsert({
    where: { code: 'CI' },
    update: {},
    create: {
      name: "Côte d'Ivoire", code: 'CI', currency: 'XOF', currencyName: 'Franc CFA Ouest',
      symbol: 'FCFA', exchangeToEur: 0.00152, phonePrefix: '+225', invoicePrefix: 'CI',
      active: true, entityName: "USRA CARE Côte d'Ivoire SARL",
      city: 'Abidjan', vatRate: 18, prorataBase: 30,
      contributions: {
        create: [
          { code: 'cnps_e', label: 'CNPS (patronal)', mode: 'percent', value: 16.4, part: 'employer', enabled: true },
          { code: 'cnps_s', label: 'CNPS (salarial)', mode: 'percent', value: 6.3, part: 'employee', enabled: true },
        ],
      },
      irsaBrackets: {
        create: [
          { fromAmount: 0, toAmount: 75000, rate: 0, sortOrder: 1 },
          { fromAmount: 75000, toAmount: 240000, rate: 16, sortOrder: 2 },
          { fromAmount: 240000, toAmount: null, rate: 21, sortOrder: 3 },
        ],
      },
    },
  })

  // Bureaux
  const office1 = await prisma.office.upsert({
    where: { id: 1 }, update: {},
    create: { countryId: mg.id, name: 'Siège Antananarivo', address: 'LOT IIP 154 JC Météo Avaradoha', city: 'Antananarivo', phone: '+261 38 262 02 50', email: 'tana@usra-care.com', active: true },
  })
  const office2 = await prisma.office.upsert({
    where: { id: 2 }, update: {},
    create: { countryId: mg.id, name: 'Agence Antsirabe', city: 'Antsirabe', email: 'antsirabe@usra-care.com', active: true },
  })
  const office3 = await prisma.office.upsert({
    where: { id: 3 }, update: {},
    create: { countryId: cm.id, name: 'Bureau Douala', city: 'Douala', email: 'douala@usra-care.com', active: true },
  })
  const office4 = await prisma.office.upsert({
    where: { id: 4 }, update: {},
    create: { countryId: ci.id, name: 'Bureau Abidjan', city: 'Abidjan', email: 'abidjan@usra-care.com', active: true },
  })

  // Utilisateurs
  const hash = async (p: string) => bcrypt.hash(p, 10)
  await prisma.user.upsert({
    where: { email: 'admin@usra-care.com' }, update: {},
    create: { firstName: 'Admin', lastName: 'Global', email: 'admin@usra-care.com', role: 'admin', avatar: 'AG', active: true, password: await hash('admin123') },
  })
  await prisma.user.upsert({
    where: { email: 'jean@usra-care.com' }, update: {},
    create: { firstName: 'Jean', lastName: 'Rakoto', email: 'jean@usra-care.com', role: 'dg', countryId: mg.id, officeId: office1.id, avatar: 'JR', active: true, password: await hash('dg123') },
  })
  await prisma.user.upsert({
    where: { email: 'faly@usra-care.com' }, update: {},
    create: { firstName: 'Faly', lastName: 'Andria', email: 'faly@usra-care.com', role: 'operator', countryId: mg.id, officeId: office1.id, avatar: 'FA', active: true, password: await hash('op123') },
  })
  await prisma.user.upsert({
    where: { email: 'paul@usra-care.com' }, update: {},
    create: { firstName: 'Paul', lastName: 'Ndjock', email: 'paul@usra-care.com', role: 'dg', countryId: cm.id, officeId: office3.id, avatar: 'PN', active: true, password: await hash('dg123') },
  })
  await prisma.user.upsert({
    where: { email: 'marie@usra-care.com' }, update: {},
    create: { firstName: 'Marie', lastName: 'Kouassi', email: 'marie@usra-care.com', role: 'operator', countryId: ci.id, officeId: office4.id, avatar: 'MK', active: true, password: await hash('op123') },
  })

  // Services
  const services = [
    { name: 'Ménage', type: 'long_term', icon: '🏠', interviewTemplate: 'menage' },
    { name: 'Cuisine', type: 'long_term', icon: '🍳', interviewTemplate: 'cuisine' },
    { name: "Garde d'enfants", type: 'long_term', icon: '👶', interviewTemplate: 'nounou' },
    { name: 'Chauffeur', type: 'long_term', icon: '🚗', interviewTemplate: 'chauffeur' },
    { name: 'Gardiennage', type: 'long_term', icon: '🛡️', interviewTemplate: 'gardien' },
    { name: 'Jardinage', type: 'long_term', icon: '🌿', interviewTemplate: 'jardinier' },
    { name: 'Nettoyage entreprise', type: 'long_term', icon: '🏢', interviewTemplate: 'menage' },
    { name: 'Agent de sécurité', type: 'long_term', icon: '🔒', interviewTemplate: 'gardien' },
    { name: 'Aide personne âgée', type: 'long_term', icon: '🤝', interviewTemplate: 'aide_senior' },
    { name: 'Plomberie', type: 'short_term', icon: '🔧', interviewTemplate: 'technique' },
    { name: 'Électricité', type: 'short_term', icon: '⚡', interviewTemplate: 'technique' },
    { name: 'Peinture', type: 'short_term', icon: '🎨', interviewTemplate: 'technique' },
    { name: 'Ingénieur Logiciel', type: 'long_term', icon: '💻', interviewTemplate: 'qualifie' },
    { name: 'Comptable', type: 'long_term', icon: '📊', interviewTemplate: 'qualifie' },
    { name: 'Réceptionniste', type: 'long_term', icon: '📞', interviewTemplate: 'reception' },
  ]
  for (const s of services) {
    await prisma.service.upsert({ where: { id: services.indexOf(s) + 1 }, update: {}, create: s })
  }

  // Paramètres notifications
  const notifTypes = ['overdue_invoice', 'trial_ending', 'eval_due', 'grave_complaint', 'payroll_pending', 'advance_pending']
  for (const type of notifTypes) {
    await prisma.notifSetting.upsert({ where: { type }, update: {}, create: { type, enabled: true, threshold: 7 } })
  }

  console.log('✅ Seed terminé avec succès !')
  console.log('\n📋 Comptes créés :')
  console.log('  admin@usra-care.com  / admin123  (Super Admin)')
  console.log('  jean@usra-care.com   / dg123     (DG Madagascar)')
  console.log('  faly@usra-care.com   / op123     (Opérateur Tana)')
  console.log('  paul@usra-care.com   / dg123     (DG Cameroun)')
  console.log('  marie@usra-care.com  / op123     (Opérateur Abidjan)')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
