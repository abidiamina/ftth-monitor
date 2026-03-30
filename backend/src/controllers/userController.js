const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const {
  sendEmployeeResetPasswordEmail,
  sendEmployeeWelcomeEmail,
} = require('../utils/emailService');
const {
  normalizeText,
  validateEmployeePayload,
  validateUserProfilePayload,
} = require('../utils/validation');

const MANAGED_ADMIN_ROLES = ['ADMIN', 'RESPONSABLE', 'TECHNICIEN'];

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

const getDeletionBlockers = async (userId, role) => {
  if (role === 'RESPONSABLE') {
    const responsable = await prisma.responsable.findUnique({
      where: { utilisateurId: userId },
      select: { id: true },
    });

    if (!responsable) {
      return null;
    }

    const interventionsCount = await prisma.intervention.count({
      where: { responsableId: responsable.id },
    });

    if (interventionsCount > 0) {
      return `Impossible de supprimer ce responsable: ${interventionsCount} intervention(s) lui sont encore rattachees. Desactivez plutot le compte ou reaffectez d abord les interventions.`;
    }
  }

  if (role === 'TECHNICIEN') {
    const technicien = await prisma.technicien.findUnique({
      where: { utilisateurId: userId },
      select: { id: true },
    });

    if (!technicien) {
      return null;
    }

    const [interventionsCount, rapportsCount] = await Promise.all([
      prisma.intervention.count({
        where: { technicienId: technicien.id },
      }),
      prisma.rapport.count({
        where: { technicienId: technicien.id },
      }),
    ]);

    if (interventionsCount > 0 || rapportsCount > 0) {
      return `Impossible de supprimer ce technicien: ${interventionsCount} intervention(s) et ${rapportsCount} rapport(s) lui sont encore rattaches. Desactivez plutot le compte ou reaffectez d abord les donnees.`;
    }
  }

  return null;
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
    const normalizedEmail = normalizeText(email).toLowerCase();
    const normalizedRole = normalizeText(role).toUpperCase();
    const validationError = validateEmployeePayload(
      { nom, prenom, email: normalizedEmail, telephone, role: normalizedRole },
      MANAGED_ADMIN_ROLES
    );

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
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
        ? 'Compte cree et email envoye.'
        : 'Compte cree. Email non envoye, identifiants disponibles dans les logs serveur.',
      data: sanitizeUser(user),
      emailDelivery: emailResult,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la creation du compte.",
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

    const normalizedEmail = normalizeText(email).toLowerCase();
    const validationError = validateUserProfilePayload({
      nom,
      prenom,
      email: normalizedEmail,
      telephone,
    });

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

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

const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const existingUser = await findUserById(userId);

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    if (existingUser.role === 'ADMIN' && req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'Un administrateur ne peut pas supprimer son propre compte.',
      });
    }

    const deletionBlocker = await getDeletionBlockers(userId, existingUser.role);

    if (deletionBlocker) {
      return res.status(400).json({
        success: false,
        message: deletionBlocker,
      });
    }

    await prisma.$transaction(async (tx) => {
      if (existingUser.role === 'CLIENT') {
        await tx.client.updateMany({
          where: { utilisateurId: userId },
          data: { utilisateurId: null },
        });
      }

      await tx.utilisateur.delete({
        where: { id: userId },
      });
    });

    res.json({
      success: true,
      message: 'Utilisateur supprime avec succes.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression de l utilisateur.' });
  }
};

const resetEmployeePassword = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    if (!MANAGED_ADMIN_ROLES.includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: 'La reinitialisation par email est reservee aux comptes ADMIN, RESPONSABLE et TECHNICIEN.',
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
  deleteUser,
  getUserById,
  listTechnicians,
  listUsers,
  resetEmployeePassword,
  updateUser,
  updateUserStatus,
};
