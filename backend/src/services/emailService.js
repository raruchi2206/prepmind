const nodemailer = require("nodemailer");
const { env } = require("../config/env");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_PORT === 465,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

async function sendPasswordResetOTP(toEmail, otp) {
  const mailOptions = {
    from: env.EMAIL_FROM,
    to: toEmail,
    subject: "PrepMind Password Reset Code",
    text: `PrepMind Password Reset\n\nYour verification code is:\n\n${otp}\n\nThis code will expire in ${env.OTP_EXPIRES_MINUTES} minutes.\n\nIf you did not request this password reset, you can safely ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2ded5; border-radius: 12px; background-color: #faf8f5; color: #1f1b16;">
        <h2 style="margin-top: 0; color: #1f1b16; font-size: 22px;">PrepMind Password Reset</h2>
        <p style="font-size: 15px; color: #595349;">You requested a password reset for your PrepMind account. Use the verification code below to proceed:</p>
        <div style="margin: 24px 0; padding: 16px; background-color: #ffffff; border: 1px solid #dcd7cb; border-radius: 8px; text-align: center;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #2b2214; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #787063;">This code will expire in <strong>${env.OTP_EXPIRES_MINUTES} minutes</strong>. For your security, never share this code with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e6e2d8; margin: 20px 0;" />
        <p style="font-size: 12px; color: #8e8578; margin-bottom: 0;">If you did not request this password reset, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    const transport = getTransporter();
    await transport.sendMail(mailOptions);
  } catch (error) {
    console.error("Email delivery failed:", error.message);
    throw new Error("Unable to send verification email. Please try again later.");
  }
}

module.exports = { sendPasswordResetOTP };
