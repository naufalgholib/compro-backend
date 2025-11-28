const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Prisma 7 requires adapter
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // Create sample users for each role
  const passwordHash = await bcrypt.hash('password123', 12);

  const users = [
    // Regular Users
    {
      email: 'user1@company.com',
      name: 'Ahmad User',
      passwordHash,
      role: 'USER',
      division: 'Unit A',
    },
    {
      email: 'user2@company.com',
      name: 'Budi User',
      passwordHash,
      role: 'USER',
      division: 'Unit B',
    },
    {
      email: 'user3@company.com',
      name: 'Citra User',
      passwordHash,
      role: 'USER',
      division: 'Unit A',
    },
    // Managers
    {
      email: 'manager.unita@company.com',
      name: 'Manager Unit A',
      passwordHash,
      role: 'MANAGER',
      division: 'Unit A',
    },
    {
      email: 'manager.unitb@company.com',
      name: 'Manager Unit B',
      passwordHash,
      role: 'MANAGER',
      division: 'Unit B',
    },
    // VP IT
    {
      email: 'vp.it@company.com',
      name: 'VP IT Department',
      passwordHash,
      role: 'VP',
      division: 'IT',
    },
    // Manager IT
    {
      email: 'manager.it@company.com',
      name: 'Manager IT Mapping',
      passwordHash,
      role: 'MANAGER_IT',
      division: 'IT',
    },
    // Developers
    {
      email: 'dev1@company.com',
      name: 'Developer Satu',
      passwordHash,
      role: 'DEV',
      division: 'IT',
    },
    {
      email: 'dev2@company.com',
      name: 'Developer Dua',
      passwordHash,
      role: 'DEV',
      division: 'IT',
    },
    {
      email: 'dev3@company.com',
      name: 'Developer Tiga',
      passwordHash,
      role: 'DEV',
      division: 'IT',
    },
  ];

  console.log('Creating users...');
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
    console.log(`  ✓ Created user: ${user.email} (${user.role})`);
  }

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('   User: user1@company.com / password123');
  console.log('   Manager: manager.unita@company.com / password123');
  console.log('   VP: vp.it@company.com / password123');
  console.log('   Manager IT: manager.it@company.com / password123');
  console.log('   Developer: dev1@company.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
