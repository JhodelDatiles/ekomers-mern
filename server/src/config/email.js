import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    // Changed this from EMAIL_PASSWORD to EMAIL_PASS to match your .env
    pass: process.env.EMAIL_PASS 
  }
});
// Add this to test connection on startup
// transporter.verify((error, success) => {
//   if (error) {
//     console.error('Email transporter error:', error.message);
//   } else {
//     console.log('Email transporter ready');
//   }
// });

export default transporter;