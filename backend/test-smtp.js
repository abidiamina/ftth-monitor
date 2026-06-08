require('dotenv').config();
const nodemailer = require('nodemailer');

const test = async () => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    await transporter.verify();
    console.log('SMTP Config OK');
  } catch (err) {
    console.error('SMTP Error:', err);
  }
};
test();
