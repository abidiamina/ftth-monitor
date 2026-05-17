const nodemailer = require('nodemailer');

const getMailerConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass },
  };
};

const sendCredentialsEmail = async ({
  to,
  prenom,
  email,
  temporaryPassword,
  role,
  subject = 'Vos identifiants FTTH Monitor',
  intro = `Un compte ${role} a ete cree pour vous sur FTTH Monitor.`,
}) => {
  const mailerConfig = getMailerConfig();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@ftth-monitor.local';
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const text = [
    `Bonjour ${prenom},`,
    '',
    intro,
    `Email: ${email}`,
    `Mot de passe temporaire: ${temporaryPassword}`,
    '',
    `Connectez-vous ici: ${appUrl}/login`,
    'Lors de votre premiere connexion, vous devrez changer votre mot de passe.',
  ].join('\n');

  if (!mailerConfig) {
    console.log('[email:fallback]', { to, subject, text });
    return { delivered: false, fallback: true };
  }

  const transporter = nodemailer.createTransport(mailerConfig);
  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });

  return { delivered: true, fallback: false };
};

const sendEmployeeWelcomeEmail = async (payload) => {
  return sendCredentialsEmail(payload);
};

const sendEmployeeResetPasswordEmail = async (payload) => {
  return sendCredentialsEmail({
    ...payload,
    subject: 'Reinitialisation de vos identifiants FTTH Monitor',
    intro: `Vos identifiants ${payload.role} ont ete reinitialises sur FTTH Monitor.`,
  });
};

const sendPasswordResetEmail = async ({ to, prenom, token }) => {
  const mailerConfig = getMailerConfig();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@ftth-monitor.local';
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const subject = 'Réinitialisation de votre mot de passe FTTH Monitor';

  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const text = [
    `Bonjour ${prenom},`,
    '',
    'Vous avez demande la reinitialisation de votre mot de passe.',
    `Cliquez sur le lien suivant pour choisir un nouveau mot de passe: ${resetUrl}`,
    '',
    'Ce lien expirera dans 1 heure.',
    'Si vous n avez pas demande cette action, ignorez cet email.',
  ].join('\n');

  if (!mailerConfig) {
    console.log('[email:forgot-password:fallback]', { to, subject, text });
    return { delivered: false, fallback: true };
  }

  const transporter = nodemailer.createTransport(mailerConfig);
  await transporter.sendMail({ from, to, subject, text });

  return { delivered: true, fallback: false };
};

const sendOutageAlertEmail = async ({ to, zone, probability, recommendation }) => {
  const mailerConfig = getMailerConfig();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@ftth-monitor.local';
  const subject = `🚨 ALERTE CRITIQUE : Risque de panne élevé - ${zone}`;

  const text = [
    `ALERTE SYSTÈME FTTH MONITOR`,
    `--------------------------`,
    `Zone concernée : ${zone}`,
    `Probabilité de panne : ${probability}%`,
    `Niveau de risque : CRITIQUE`,
    '',
    `Analyse IA :`,
    recommendation,
    '',
    `Veuillez vous connecter au Dashboard Responsable pour plus de détails.`,
    `Généré le : ${new Date().toLocaleString('fr-FR')}`,
  ].join('\n');

  if (!mailerConfig) {
    console.log('[email:outage-alert:fallback]', { to, subject, text });
    return { delivered: false, fallback: true };
  }

  const transporter = nodemailer.createTransport(mailerConfig);
  await transporter.sendMail({ from, to, subject, text });

  return { delivered: true, fallback: false };
};

module.exports = { 
  sendEmployeeWelcomeEmail, 
  sendEmployeeResetPasswordEmail, 
  sendPasswordResetEmail,
  sendOutageAlertEmail
};
