import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding system configuration...');

  // 1. Roles
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Full system control and administration' },
    { name: 'ADMIN', description: 'Administrative access for master data management' },
    { name: 'AGENT', description: 'Service desk support agent' },
    { name: 'EMPLOYEE', description: 'Standard hospital employee / requester' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'SUPER_ADMIN' },
  });

  // 2. Default System Administrator Account (ONLY system account required for initial setup)
  const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Kims@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const adminEmail = 'admin@kims.hospital';
  const adminEmployeeId = 'ADMIN001';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
    },
    create: {
      name: 'System Administrator',
      email: adminEmail,
      employeeId: adminEmployeeId,
      mobile: '9876543210',
      passwordHash,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
    },
  });

  // 3. Initialize Ticket Sequence Counter
  await prisma.ticketSequence.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      currentNumber: 0,
    },
  });

  console.log('System configuration seed complete. No demo business data was added.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
