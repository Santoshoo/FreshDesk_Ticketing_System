import app from './app.js';
import { config } from './config/env.js';
import logger from './utils/logger.js';
import prisma from './config/database.js';

const PORT = config.port || 5000;

async function startServer() {
  try {
    // Verify database connectivity
    await prisma.$connect();
    logger.info('Connected to MySQL database via Prisma successfully.');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`KIMS ICT Service Desk backend server running on http://0.0.0.0:${PORT} [${config.nodeEnv}]`);
    });
  } catch (error) {
    logger.error('Failed to start backend server:', error);
    process.exit(1);
  }
}

startServer();
