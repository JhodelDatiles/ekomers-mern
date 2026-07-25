import { config } from "../envconfig.js";
import {
  orderConfirmationEmail,
  verificationEmailTemplate,
} from "../utils/emailTemplates.js";
import transporter from "../config/email.js";

// ─────────────────────────────────────────────────────────────────
// Brevo (formerly Sendinblue) HTTP API
// Free tier: 300 emails/day, no domain needed, works on Render
// ───────────────────────────────────────────────────────────────── 

const isProduction = process.env.NODE_ENV === "production";
// ─────────────────────────────────────────────────────────────────
// Production: Brevo HTTP API. Development: Nodemailer (Gmail).
// ─────────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  if (isProduction) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": config.brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "EKOMERS", email: config.emailFrom },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Brevo error: ${res.status}`);

    console.log(`Brevo sent — messageId: ${data.messageId}`);
    return data;
  }

  const info = await transporter.sendMail({
    from: `"EKOMERS (DEV)" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  });

  console.log(`Nodemailer sent (dev) — messageId: ${info.messageId}`);
  return info;
};

// ─── Order Confirmation ───
export const sendOrderConfirmation = async (order, user) => {
  try {
    await sendEmail({
      to: user.email,
      subject: `Order Confirmed — #${order._id}`,
      html: orderConfirmationEmail(order, user),
    });
    console.log("Order confirmation email sent to:", user.email);
  } catch (error) {
    console.error("Order email failed:", error.message);
  }
};

// ─── Security Code (password reset / account deletion) ───
export const sendSecurityCode = async (user, code, type) => {
  try {
    await sendEmail({
      to: user.email,
      subject:
        type === "password"
          ? "Password Reset Code — EKOMERS"
          : "Account Deletion Code — EKOMERS",
      text: `Your security code is: ${code}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 40px; background: #0a0a0a; color: #fff; border-radius: 16px; text-align: center;">
          <h2 style="font-style: italic; text-transform: uppercase; letter-spacing: -1px;">Security Code</h2>
          <p style="color: #aaa; font-size: 13px;">
            Use this code to ${type === "password" ? "reset your password" : "delete your account"}.
            It expires in <strong>10 minutes</strong>.
          </p>
          <div style="font-size: 40px; font-weight: 900; letter-spacing: 8px; color: #fff; background: #1a1a1a; padding: 24px; border-radius: 12px; margin: 24px 0;">
            ${code}
          </div>
          <p style="color: #555; font-size: 11px;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
    console.log("Security code sent to:", user.email);
    return true;
  } catch (error) {
    console.error("Security code email failed:", error.message);
    return false;
  }
};

// ─── Email Verification ───
export const sendVerificationEmail = async (user) => {
  try {
    const token = user.verificationToken;
    if (!token) throw new Error("No verification token found on user");

    const verificationUrl = `${config.clientUrl}/verify-email/${token}`;
    console.log(`Verification link: ${verificationUrl}`);

    await sendEmail({
      to: user.email,
      subject: "Verify Your Email — EKOMERS",
      html: verificationEmailTemplate(user.username, verificationUrl),
    });

    console.log("Verification email sent to:", user.email);
    return true;
  } catch (error) {
    console.error("Verification email failed:", error.message);
    return false;
  }
};
