import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    // Changed this from EMAIL_PASSWORD to EMAIL_PASS to match your .env
    pass: process.env.EMAIL_PASS 
  }
});

export default transporter;