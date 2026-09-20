import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'kims_jwt_access_secret_super_secure_key_12345',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'kims_jwt_refresh_secret_super_secure_key_67890',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '1d',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/v1/auth/google/callback',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'eus@kims.ac.in',
    password: process.env.SMTP_PASSWORD || '',
    secure: process.env.SMTP_SECURE === 'true',
    from: process.env.MAIL_FROM || 'KIMS ICT Service Desk <eus@kims.ac.in>',
  },
};

export default config;
