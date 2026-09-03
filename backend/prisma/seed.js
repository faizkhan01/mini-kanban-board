/* eslint-disable @typescript-eslint/no-var-requires */
// Demo data. Plain CommonJS so it runs on the host and in the Docker image without ts-node.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { email: 'alice@example.com', name: 'Alice', passwordHash },
  });
  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { email: 'bob@example.com', name: 'Bob', passwordHash },
  });

  const existing = await prisma.board.findFirst({
    where: { ownerId: alice.id, name: 'Product Roadmap' },
  });
  if (existing) {
    console.log(
      'Seed already applied. Logins: alice@example.com / bob@example.com (password123)',
    );
    return;
  }

  const board = await prisma.board.create({
    data: {
      name: 'Product Roadmap',
      ownerId: alice.id,
      members: { create: { userId: bob.id, role: 'EDITOR' } },
      columns: {
        create: [
          { name: 'Backlog', position: 0 },
          { name: 'In Progress', position: 1 },
          { name: 'Done', position: 2 },
        ],
      },
    },
    include: { columns: { orderBy: { position: 'asc' } } },
  });

  const [backlog, inProgress, done] = board.columns;
  await prisma.task.createMany({
    data: [
      { boardId: board.id, columnId: backlog.id, title: 'Research competitors', position: 0 },
      { boardId: board.id, columnId: backlog.id, title: 'Draft PRD', position: 1 },
      { boardId: board.id, columnId: inProgress.id, title: 'Design wireframes', position: 0 },
      { boardId: board.id, columnId: done.id, title: 'Kick-off meeting', position: 0 },
    ],
  });

  console.log('Seeded board "Product Roadmap".');
  console.log('Logins: alice@example.com or bob@example.com (password: password123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
