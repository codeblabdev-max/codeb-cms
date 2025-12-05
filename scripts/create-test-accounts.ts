import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test accounts...');

  try {
    // Check if accounts already exist
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@test.com' }
    });

    const existingUser = await prisma.user.findUnique({
      where: { email: 'user@test.com' }
    });

    if (existingAdmin) {
      console.log('✅ admin@test.com already exists');
    } else {
      const hashedAdminPassword = await bcrypt.hash('admin123', 10);
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@test.com',
          username: 'testadmin',
          name: '테스트 관리자',
          password: hashedAdminPassword,
          role: 'ADMIN',
          isActive: true,
          provider: 'local',
          emailVerified: true
        }
      });
      console.log('✅ Created admin@test.com:', adminUser.email);
    }

    if (existingUser) {
      console.log('✅ user@test.com already exists');
    } else {
      const hashedUserPassword = await bcrypt.hash('user123', 10);
      const regularUser = await prisma.user.create({
        data: {
          email: 'user@test.com',
          username: 'demouser',
          name: '테스트 사용자',
          password: hashedUserPassword,
          role: 'USER',
          isActive: true,
          provider: 'local',
          emailVerified: true
        }
      });
      console.log('✅ Created user@test.com:', regularUser.email);
    }

    // Show all users
    console.log('\n📋 All users in database:');
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        username: true,
        name: true,
        role: true,
        isActive: true
      },
      orderBy: { createdAt: 'asc' }
    });
    console.table(allUsers);

  } catch (error) {
    console.error('❌ Error creating test accounts:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
