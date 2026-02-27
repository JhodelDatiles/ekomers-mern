import transporter from '../config/email.js';
import { orderConfirmationEmail, verificationEmailTemplate } from '../utils/emailTemplates.js';
import {config} from '../envconfig.js';

// Logic for Order Emails
export const sendOrderConfirmation = async (order, user) => {
  try {
    const mailOptions = {
      from: `"Your Store Name" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Order Confirmation - #${order._id}`,
      html: orderConfirmationEmail(order, user)
    };

    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent to:', user.email);
  } catch (error) {
    console.error('Error sending order email:', error);
  }
};

// Logic for Security Code Emails
export const sendSecurityCode = async (user, code, type) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: type === 'password' ? 'Password Change Code' : 'Account Deletion Code',
      text: `Your security code is: ${code}. It expires in 10 minutes.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    // THIS LOG IS CRITICAL - Look at your terminal after adding this
    console.error("❌ NODEMAILER ERROR:", error.message);
    return false;
  }
};

export const sendVerificationEmail = async (user) => {
  try {
    // Use the field we just saved in the controller
    const token = user.verificationToken; 
    
    if (!token) throw new Error("No token found for user");

    const verificationUrl = `${config.clientUrl}/verify-email/${token}`;
    
    console.log(`🔗 [DEBUG] Sending Link: ${verificationUrl}`);

    const mailOptions = {
      from: `"EKOMERS" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Verify Your Email',
      html: verificationEmailTemplate(user.username, verificationUrl)
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Email Error:', error.message);
    return false;
  }
};