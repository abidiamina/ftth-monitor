const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const {
  sendEmployeeResetPasswordEmail,
  sendEmployeeWelcomeEmail,
} = require('../utils/emailService');

const EMPLOYEE_ROLES = ['RESPONSABLE', 'TECHNICIEN'];

const sanitizeUser = (user) => ({
  id: user.id,
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  telephone: user.telephone,
  role: user.role,
  actif: user.actif,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const userSelect = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  telephone: true,
  role: true,
  actif: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
};

const createTemporaryPassword = () => {
  return `FTTH-${crypto.randomBytes(4).toString('hex')}`;
};

const findUserById = async (id) => {
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return prisma.utilisateur.findUnique({
    where: { id },
    select: userSelect,
  });
};

const listUsers = async (req, res) => {
  try {
    const role = req.query.role?.toString().trim().toUpperCase();
    const actif = req.query.actif;

    const where = {};

    if (role) {
      where.role = role;
    }

    if (actif === 'true' || actif === 'false') {
      where.actif = actif === 'true';
    }

    const users = await prisma.utilisateur.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la recuperation des utilisateurs.' });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        ...userSelect,
        client: true,
        technicien: true,
        responsable: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la recuperation de l utilisateur.' });
  }
};

const listTechnicians = async (req, res) => {
  try {
    const techniciens = await prisma.technicien.findMany({
      include: {
        utilisateur: {
          select: { id: true, nom: true, prenom: true, email: true, telephone: true, actif: true },
        },
      },
    });

    res.json({ success: true, data: techniciens });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la recuperation des techniciens.' });
  }
};

const createEmployee = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, role } = req.body;
    const normalizedEmail = email?.trim()?.toLowerCase();
    const normalizedRole = role?.trim()?.toUpperCase();

    if (!nom?.trim() || !prenom?.trim() || !normalizedEmail || !normalizedRole) {
      return res.status(400).json({
        success: false,
        message: 'Nom, prenom, email et role sont obligatoires.',
      });
    }

    if (!EMPLOYEE_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Le role employe doit etre RESPONSABLE ou TECHNICIEN.',
      });
    }

    const existing = await prisma.utilisateur.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email deja utilise.',
      });
    }

    const temporaryPassword = createTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = await prisma.utilisateur.create({
      data: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: normalizedEmail,
        telephone: telephone?.trim() || null,
        motDePasse: hashedPassword,
        role: normalizedRole,
        mustChangePassword: true,
        ...(normalizedRole === 'TECHNICIEN' && {
          technicien: { create: {} },
        }),
        ...(normalizedRole === 'RESPONSABLE' && {
          responsable: { create: {} },
        }),
      },
      select: userSelect,
    });

    const emailResult = await sendEmployeeWelcomeEmail({
      to: normalizedEmail,
      prenom: prenom.trim(),
      email: normalizedEmail,
      temporaryPassword,
      role: normalizedRole,
    });

    res.status(201).json({
      success: true,
      message: emailResult.delivered
        ? 'Compte employe cree et email envoye.'
        : 'Compte employe cree. Email non envoye, identifiants disponibles dans les logs serveur.',
      data: sanitizeUser(user),
      emailDelivery: emailResult,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la creation du compte employe.",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { nom, prenom, telephone, email } = req.body;

    const existingUser = await findUserById(userId);

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    if (!nom?.trim() || !prenom?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nom, prenom et email sont obligatoires.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const duplicate = await prisma.utilisateur.findFirst({
      where: {
        email: normalizedEmail,
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Email deja utilise.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.utilisateur.update({
        where: { id: userId },
        data: {
          nom: nom.trim(),
          prenom: prenom.trim(),
          email: normalizedEmail,
          telephone: telephone?.trim() || null,
        },
      });

      if (existingUser.role === 'CLIENT') {
        await tx.client.updateMany({
          where: { utilisateurId: userId },
          data: {
            nom: nom.trim(),
            prenom: prenom.trim(),
            email: normalizedEmail,
            telephone: telephone?.trim() || '',
          },
        });
      }
    });

    const updatedUser = await findUserById(userId);

    res.json({
      success: true,
      message: 'Utilisateur mis a jour avec succes.',
      data: sanitizeUser(updatedUser),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise a jour de l utilisateur.' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { actif } = req.body;

    if (typeof actif !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Le champ actif doit etre un booleen.',
      });
    }

    const existingUser = await findUserById(userId);

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    if (existingUser.role === 'ADMIN' && req.user.id === userId && actif === false) {
      return res.status(400).json({
        success: false,
        message: 'Un administrateur ne peut pas desactiver son propre compte.',
      });
    }

    const updatedUser = await prisma.utilisateur.update({
      where: { id: userId },
      data: { actif },
      select: userSelect,
    });

    res.json({
      success: true,
      message: actif ? 'Compte active avec succes.' : 'Compte desactive avec succes.',
      data: sanitizeUser(updatedUser),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise a jour du statut.' });
  }
};

const resetEmployeePassword = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    if (!EMPLOYEE_ROLES.includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: 'La reinitialisation par email est reservee aux comptes employes.',
      });
    }

    const temporaryPassword = createTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const updatedUser = await prisma.utilisateur.update({
      where: { id: userId },
      data: {
        motDePasse: hashedPassword,
        mustChangePassword: true,
      },
      select: userSelect,
    });

    const emailResult = await sendEmployeeResetPasswordEmail({
      to: user.email,
      prenom: user.prenom,
      email: user.email,
      temporaryPassword,
      role: user.role,
    });

    res.json({
      success: true,
      message: emailResult.delivered
        ? 'Mot de passe reinitialise et email envoye.'
        : 'Mot de passe reinitialise. Email non envoye, identifiants disponibles dans les logs serveur.',
      data: sanitizeUser(updatedUser),
      emailDelivery: emailResult,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la reinitialisation du mot de passe.' });
  }
};

module.exports = {
  createEmployee,
  getUserById,
  listTechnicians,
  listUsers,
  resetEmployeePassword,
  updateUser,
  updateUserStatus,
};
