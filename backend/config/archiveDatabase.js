import { PrismaClient } from '@prisma/client-archive';
import { config } from './env.js';

// Safe BigInt JSON serialization
if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}

export const prismaArchive = new PrismaClient({
  datasources: {
    db: { url: config.archiveDatabaseUrl },
  },
  log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

export default prismaArchive;
