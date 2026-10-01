import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const usersToSet = [
    {
      email: 'rajgamer9717@gmail.com',
      username: 'rajgamer',
      role: UserRole.ADMIN,
      displayName: 'Raj Admin',
    },
    {
      email: 'deek34137@gmail.com',
      username: 'deekmod',
      role: UserRole.MODERATOR,
      displayName: 'Deek Moderator',
    },
  ];

  console.log('--- SETTING USER ROLES ---');

  for (const item of usersToSet) {
    const existing = await prisma.user.findUnique({
      where: { email: item.email },
    });

    if (existing) {
      const updated = await prisma.user.update({
        where: { email: item.email },
        data: { role: item.role },
      });
      console.log(`[UPDATED] User ${item.email} role updated to: ${updated.role}`);
    } else {
      const defaultPassword = 'TempPassword123!';
      const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
      
      const created = await prisma.user.create({
        data: {
          email: item.email,
          username: item.username,
          displayName: item.displayName,
          role: item.role,
          password: hashedPassword,
        },
      });
      console.log(`[CREATED] User ${item.email} created with role: ${created.role}`);
      console.log(`          Username: ${item.username}`);
      console.log(`          Temporary Password: ${defaultPassword}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
