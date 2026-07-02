const nodemailer = require('nodemailer');

async function sendSmsOtp({ phone, otp }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !fromPhone) {
    throw new Error('SMS OTP delivery is not configured');
  }

  const body = new URLSearchParams({
    To: phone,
    From: fromPhone,
    Body: `Your Marketplace Premium OTP is ${otp}. It expires in 5 minutes.`,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`SMS OTP send failed: ${message}`);
  }
}

async function sendEmailOtp({ email, otp }) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    throw new Error('Email OTP delivery is not configured');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Marketplace Premium Login OTP',
    text: `Your Marketplace Premium OTP is ${otp}. It expires in 5 minutes.`,
  });
}

async function deliverOtp({ channel, phone, email, otp }) {
  if (channel === 'sms') {
    await sendSmsOtp({ phone, otp });
    return;
  }

  if (channel === 'email') {
    if (!email) {
      throw new Error('Email is required when channel is email');
    }
    await sendEmailOtp({ email, otp });
    return;
  }

  throw new Error('Unsupported OTP channel');
}

module.exports = { deliverOtp };