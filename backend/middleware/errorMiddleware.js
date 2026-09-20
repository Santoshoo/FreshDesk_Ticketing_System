import logger from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error({
    msg: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);

  // Prisma unique constraint violation code P2002
  if (err.code === 'P2002') {
    const target = err.meta?.target ? ` (${Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target})` : '';
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: `A record with this unique value already exists${target}.`,
      },
    });
  }

  // Known business error codes
  if (err.code === 'TICKET_NUMBER_CAPACITY_EXHAUSTED') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'TICKET_NUMBER_CAPACITY_EXHAUSTED',
        message: 'System ticket number limit (99999) has been reached.',
      },
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred',
      details: err.details || undefined,
    },
  });
}

export default errorHandler;
