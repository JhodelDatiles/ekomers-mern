import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

export const config = {
  paymongoSecret: isProduction
    ? process.env.PAYMONGO_SECRET_KEY_LIVE
    : process.env.PAYMONGO_SECRET_KEY_TEST,
  paymongoWebhooks: isProduction
    ? process.env.PAYMONGO_WEBHOOK_SECRET_LIVE
    : process.env.PAYMONGO_WEBHOOK_SECRET_TEST,
  clientUrl: isProduction
    ? process.env.CLIENT_URL_PROD
    : "http://localhost:5173",
  //NODE STATUS
  isProduction,
  //DATABASE
  mongoUri: process.env.MONGO_URI,
  //PORT
  port: process.env.PORT || 5000,
  //(PROD) BREVO EMAIL SENDER
  brevoApiKey: process.env.BREVO_API_KEY,
  //(DEV) NODEMAILER EMAIL SENDER
  emailFrom: process.env.EMAIL_FROM || "noreply@ekomers.com",
  //ClOUDINARY
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
};

// debugging

console.log(`------------------------------------------------------`);
console.log(`Paymongo secret: ${config.paymongoSecret.slice(3,7)}`);

if(config.paymongoWebhooks.includes('whsk')){
  console.log(`Paymongo webhook: ${config.paymongoWebhooks.slice(0,4)}`);
}

console.log(`Node status: ${config.isProduction}`);

console.log(`Cloud name: ${config.cloudinaryCloudName.slice(0,4)}`);
console.log(`Cloud key: ${config.cloudinaryApiKey.slice(0,4)}`);
console.log(`Cloud secret: ${config.cloudinaryApiSecret.slice(0,4)}`);
console.log(`------------------------------------------------------`);


