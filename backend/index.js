import app from './app.js';
import { config } from './config/env.js';
import logger from './utils/logger.js';
import prisma from './config/database.js';

const PORT = config.port || 7777;

async function startServer() {
  try {
    // Verify database connectivity
    await prisma.$connect();
    logger.info('Connected to MySQL database via Prisma successfully.');

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(
        `KIMS ICT Service Desk backend server running on http://0.0.0.0:${PORT} [${config.nodeEnv}]`
      );
    });

    // Support long-running high-volume ingestion streams (up to 30 mins)
    server.timeout = 1800000;
    server.requestTimeout = 1800000;
    server.keepAliveTimeout = 1800000;
    server.headersTimeout = 1801000;

  } catch (error) {
    console.error('========== BACKEND STARTUP ERROR ==========');
    console.error(error);
    console.error(error?.stack);
    console.error('===========================================');

    logger.error({ err: error }, 'Failed to start backend server');
    process.exit(1);
  }
}

startServer();