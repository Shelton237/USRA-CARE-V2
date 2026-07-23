
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.invoice.count();
  const samples = await prisma.invoice.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
  console.log('TOTAL INVOICES:', count);
  console.log('SAMPLES:', JSON.stringify(samples, null, 2));
  
  const admin = await prisma.user.findUnique({ where: { id: 1 }, include: { country: true } });
  console.log('ADMIN USER:', JSON.stringify({ id: admin.id, role: admin.role, countryId: admin.countryId, country: admin.country }, null, 2));
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
