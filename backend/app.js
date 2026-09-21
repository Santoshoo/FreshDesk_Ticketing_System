import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import ticketTypeRoutes from './routes/ticketTypeRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import employeeEmailRoutes from './routes/employeeEmailRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

const app = express();

// Security and basic middlewares
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/ticket-types', ticketTypeRoutes);
app.use('/api/v1/tags', tagRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/employee-emails', employeeEmailRoutes);
app.use('/api/v1/contacts', contactRoutes);

// Fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
});

// Central error handling
app.use(errorHandler);

export default app;
