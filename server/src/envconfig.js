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
    : 'http://localhost:5173',  // ✅ hardcoded, no env variable needed

  mongoUri: process.env.MONGO_URI,
  port: process.env.PORT || 5000,
  brevoApiKey: process.env.BREVO_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'noreply@ekomers.com',
};
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('clientUrl will be:', config.clientUrl);
console.log('PayMongo key starts with:', config.paymongoSecret?.slice(0, 10));
console.log('PayMongo webhook starts with:', config.paymongoSecret?.slice(0, 10));