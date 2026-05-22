const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.aiConfig.findFirst({ where: { isActive: true } })
  .then(c => console.log('Active DB Config:', c))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
