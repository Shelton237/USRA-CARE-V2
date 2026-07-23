
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@usra-care.com';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found. Creating...');
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        active: true,
      }
    });
    console.log('Admin user created with password admin123');
  } else {
    console.log('User found. Resetting password to admin123 and ensuring active is true...');
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashed, active: true }
    });
    console.log('Admin user password reset to admin123');
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

