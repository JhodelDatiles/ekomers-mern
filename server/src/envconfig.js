import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  // Use the live key if in production, otherwise use test key
  paymongoSecret: isProduction 
    ? process.env.PAYMONGO_SECRET_KEY_LIVE 
    : process.env.PAYMONGO_SECRET_KEY_TEST,
  // same logic as the paymongoSecret
  paymongoWebhooks: isProduction 
    ? process.env.PAYMONGO_WEBHOOK_SECRET_LIVE 
    : process.env.PAYMONGO_WEBHOOK_SECRET_TEST,
    
  // The URL of your React frontend
  clientUrl: isProduction 
    ? process.env.CLIENT_URL_PROD 
    : 'http://localhost:5173',

  mongoUri: process.env.MONGO_URI,
  port: process.env.PORT || 5000
};

