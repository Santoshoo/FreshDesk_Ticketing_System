import { PrismaClient } from '@prisma/client';

// Graceful BigInt JSON serialization
BigInt.prototype.toJSON = function () {
  return this.toString();
};

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
