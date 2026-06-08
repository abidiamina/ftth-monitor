require('dotenv').config();
const { sendEmployeeWelcomeEmail } = require('./src/utils/emailService');

const test = async () => {
  try {
    const res = await sendEmployeeWelcomeEmail({
      to: process.env.SMTP_USER, // Send to self to avoid bouncing
      prenom: 'Test',
      email: 'test@example.com',
      temporaryPassword: 'password123',
      role: 'TECHNICIEN'
    });
    console.log('Result:', res);
  } catch (err) {
    console.error('Error:', err);
  }
};
test();
