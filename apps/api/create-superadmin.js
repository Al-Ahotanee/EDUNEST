const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 12);
  const existing = await prisma.$queryRaw`SELECT id FROM User WHERE email = 'superadmin@schoolerp.com' LIMIT 1`;
  if (existing && existing.length > 0) {
    await prisma.$executeRaw`
      UPDATE User 
      SET password = ${password}, isSuperAdmin = 1, isActive = 1, firstName = 'Platform', lastName = 'SuperAdmin' 
      WHERE email = 'superadmin@schoolerp.com'
    `;
    console.log('✅ Updated existing superadmin@schoolerp.com');
  } else {
    const id = uuidv4();
    await prisma.$executeRaw`
      INSERT INTO User (id, email, password, firstName, lastName, isSuperAdmin, isActive, isEmailVerified, createdAt, updatedAt)
      VALUES (${id}, 'superadmin@schoolerp.com', ${password}, 'Platform', 'SuperAdmin', 1, 1, 1, NOW(), NOW())
    `;
    console.log('✅ Created superadmin@schoolerp.com');
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
