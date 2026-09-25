import nodemailer from 'nodemailer';
import { config } from './env.js';
import logger from '../utils/logger.js';

let transporterInstance = null;

export function getTransporter() {
  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure, // true for 465, false for 587
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
      tls: {
        rejectUnauthorized: false, // Prevents self-signed cert issues in hospital intranet/local setups
      },
      connectionTimeout: 10000, // 10s connection timeout
      greetingTimeout: 10000, // 10s greeting timeout
      socketTimeout: 15000, // 15s socket timeout
    });

    logger.info({
      msg: 'Nodemailer transporter initialized',
      host: config.smtp.host,
      port: config.smtp.port,
      user: config.smtp.user,
      secure: config.smtp.secure,
    });
  }

  return transporterInstance;
}

export async function verifySmtpConnection() {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    logger.info({ msg: 'SMTP server connection verified successfully', user: config.smtp.user });
    return true;
  } catch (error) {
    logger.error({
      msg: 'Failed to verify SMTP server connection',
      error: error.message,
      code: error.code,
    });
    return false;
  }
}

export default {
  getTransporter,
  verifySmtpConnection,
};
