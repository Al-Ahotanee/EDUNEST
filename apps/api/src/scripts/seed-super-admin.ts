import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@schoolerp.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2024!';

  const existing = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  if (existing) {
    console.log(`✅ Super admin already exists: ${existing.email}`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      email, password: hashed,
      firstName: 'Platform', lastName: 'Administrator',
      isSuperAdmin: true, isActive: true, isEmailVerified: true,
    },
  });

  console.log('✅ Super admin created successfully!');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log('   ⚠️  Change the password immediately after first login!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
