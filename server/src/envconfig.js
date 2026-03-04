import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  paymongoSecret: isProduction 
    ? process.env.PAYMONGO_SECRET_KEY_LIVE 
    : process.env.PAYMONGO_SECRET_KEY_TEST,
  paymongoWebhooks: isProduction 
    ? process.env.PAYMONGO_WEBHOOK_SECRET_LIVE 
    : process.env.PAYMONGO_WEBHOOK_SECRET_TEST,
    
  clientUrl: isProduction 
    ? process.env.CLIENT_URL_PROD 
    : 'http://localhost:5173',

  mongoUri: process.env.MONGO_URI,
  port: process.env.PORT || 5000,
  // Resend
  // resendApiKey: process.env.RESEND_API_KEY,
  // emailFrom: process.env.EMAIL_FROM || 'EKOMERS <onboarding@resend.dev>',
  // Brevo — free email API, no domain needed, works on Render free tier
  brevoApiKey: process.env.BREVO_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'noreply@ekomers.com',
};