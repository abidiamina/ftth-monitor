const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { sendPasswordResetEmail } = require('../utils/emailService');
const { generateToken } = require('../utils/jwtUtils');
const { logAction } = require('../utils/auditService');
const { createNotifications } = require('../utils/notificationService');
const {
  normalizeText,
  validateLoginPayload,
  validatePasswordChangePayload,
  validateRegisterPayload,
  validateUserProfilePayload,
} = require('../utils/validation');

const sanitizeUser = (user) => ({
  id: user.id,
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  telephone: user.telephone,
  pushToken: user.pushToken,
  role: user.role,
  actif: user.actif,
  bloque: user.bloque,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt,
});

const buildNewClientNotificationPayloads = (clientUser, adminIds = []) =>
  adminIds.map((adminId) => ({
    titre: 'Nouveau client inscrit',
    message: `Un nouveau client s'est inscrit : ${clientUser.prenom} ${clientUser.nom} (${clientUser.email}).`,
    userId: adminId,
  }));

/**
 * REGISTER (Inscription Client)
 * Objectif : Permettre à un nouveau client de créer son compte.
 * 
 * Logique pour la soutenance :
 * 1. Validation de la robustesse du mot de passe et format email.
 * 2. Vérification de l'existence de l'email en BDD.
 * 3. Hachage : Chiffrement du mot de passe avec bcrypt (sécurité).
 * 4. Transaction : Création de l'utilisateur (rôle CLIENT) et du profil Client associé.
 * 5. Notification : Envoi d'une alerte aux Admins pour les prévenir de l'inscription.
 */
const register = async (req, res) => {
  try {
    const { nom, prenom, email, motDePasse, telephone, adresse } = req.body;
    const normalizedEmail = normalizeText(email).toLowerCase();
    const trimmedPassword = normalizeText(motDePasse);
    const validationError = validateRegisterPayload({
      nom,
      prenom,
      email: normalizedEmail,
      motDePasse: trimmedPassword,
      telephone,
      adresse,
    });

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

    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

    const user = await prisma.utilisateur.create({
      data: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: normalizedEmail,
        motDePasse: hashedPassword,
        telephone: telephone.trim(),
        role: 'CLIENT',
        client: {
          create: {
            adresse: adresse.trim(),
          },
        },
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        pushToken: true,
        role: true,
        actif: true,
        bloque: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    const token = generateToken({ id: user.id, role: user.role });

    await logAction({
      action: 'REGISTER',
      entite: 'UTILISATEUR',
      entiteId: user.id,
      details: 'Inscription nouvel utilisateur',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ip: req.ip,
    });

    try {
      const admins = await prisma.utilisateur.findMany({
        where: {
          role: 'ADMIN',
          actif: true,
        },
        select: {
          id: true,
        },
      });

      if (admins.length > 0) {
        await createNotifications(
          buildNewClientNotificationPayloads(
            user,
            admins.map((admin) => admin.id)
          )
        );
      }
    } catch (notificationError) {
      console.error('Erreur lors de l envoi de la notification nouveau client.', notificationError);
    }

    res.status(201).json({ success: true, token, user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur lors de l'inscription." });
  }
};

/**
 * LOGIN (Connexion)
 * Objectif : Authentifier un utilisateur et lui fournir un token d'accès.
 * 
 * Logique pour la soutenance :
 * 1. Vérification si l'utilisateur existe et s'il est actif/non bloqué.
 * 2. Comparaison (bcrypt.compare) entre le mot de passe fourni et le hash en BDD.
 * 3. JWT : Génération d'un token JSON Web Token contenant l'ID et le Rôle.
 * 4. Audit : Trace de la connexion dans les logs de sécurité (logAction).
 */
const login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const normalizedEmail = normalizeText(email).toLowerCase();
    const validationError = validateLoginPayload({ email: normalizedEmail, motDePasse });

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const user = await prisma.utilisateur.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.actif || user.bloque) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect.',
      });
    }

    const isMatch = await bcrypt.compare(motDePasse, user.motDePasse);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect.',
      });
    }

    const token = generateToken({ id: user.id, role: user.role });

    await logAction({
      action: 'LOGIN',
      entite: 'UTILISATEUR',
      entiteId: user.id,
      details: 'Connexion reussie',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ip: req.ip,
    });

    res.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la connexion.' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.utilisateur.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        pushToken: true,
        role: true,
        actif: true,
        bloque: true,
        mustChangePassword: true,
        createdAt: true,
        client: true,
        technicien: true,
        responsable: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable.',
      });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

const updateMe = async (req, res) => {
  try {
    const { nom, prenom, telephone, adresse } = req.body;
    const validationError = validateUserProfilePayload(
      { nom, prenom, telephone, adresse },
      { requireAddress: false }
    );

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const currentUser = await prisma.utilisateur.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        role: true,
        client: {
          select: { id: true },
        },
      },
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable.',
      });
    }

    if (currentUser.role === 'CLIENT' && !normalizeText(adresse)) {
      return res.status(400).json({
        success: false,
        message: 'L adresse est obligatoire pour un client.',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.utilisateur.update({
        where: { id: req.user.id },
        data: {
          nom: nom.trim(),
          prenom: prenom.trim(),
          telephone: telephone?.trim() || null,
        },
      });

      if (currentUser.role === 'CLIENT' && currentUser.client?.id) {
        await tx.client.update({
          where: { id: currentUser.client.id },
          data: {
            adresse: adresse.trim(),
          },
        });
      }
    });

    const updatedUser = await prisma.utilisateur.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        pushToken: true,
        role: true,
        actif: true,
        bloque: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Profil mis a jour avec succes.',
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise a jour du profil.',
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { motDePasseActuel, nouveauMotDePasse } = req.body;
    const validationError = validatePasswordChangePayload({
      motDePasseActuel,
      nouveauMotDePasse,
    });

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const user = await prisma.utilisateur.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !user.actif) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable ou desactive.',
      });
    }

    const isMatch = await bcrypt.compare(motDePasseActuel, user.motDePasse);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe actuel est incorrect.',
      });
    }

    const hashedPassword = await bcrypt.hash(normalizeText(nouveauMotDePasse), 10);

    const updatedUser = await prisma.utilisateur.update({
      where: { id: req.user.id },
      data: {
        motDePasse: hashedPassword,
        mustChangePassword: false,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        pushToken: true,
        role: true,
        actif: true,
        bloque: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    await logAction({
      action: 'CHANGE_PASSWORD',
      entite: 'UTILISATEUR',
      entiteId: user.id,
      details: 'Changement de mot de passe par l utilisateur',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Mot de passe mis a jour avec succes.',
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise a jour du mot de passe.',
    });
  }
};

const updatePushToken = async (req, res) => {
  try {
    const pushToken =
      typeof req.body?.pushToken === 'string' ? req.body.pushToken.trim() : '';

    const updatedUser = await prisma.utilisateur.update({
      where: { id: req.user.id },
      data: {
        pushToken: pushToken || null,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        pushToken: true,
        role: true,
        actif: true,
        bloque: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      message: pushToken
        ? 'Token push enregistre avec succes.'
        : 'Token push supprime avec succes.',
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise a jour du token push.',
    });
  }
};

/**
 * FORGOT PASSWORD (Mot de passe oublié)
 * Objectif : Initier la procédure de récupération de compte.
 * 
 * Logique : 
 * - Génère un token cryptographique temporaire (durée: 1 heure).
 * - Envoie un email au client avec ce token pour réinitialiser son mot de passe.
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeText(email).toLowerCase();

    const user = await prisma.utilisateur.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.actif || user.bloque) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'Le lien de réinitialisation a été envoyé.',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.utilisateur.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: expires,
      },
    });

    await sendPasswordResetEmail({
      to: user.email,
      prenom: user.prenom,
      token,
    });

    await logAction({
      action: 'REQUEST_PASSWORD_RESET',
      entite: 'UTILISATEUR',
      entiteId: user.id,
      details: 'Demande de reinitialisation de mot de passe',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Le lien de réinitialisation a été envoyé.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la demande.' });
  }
};

/**
 * RESET PASSWORD (Réinitialisation)
 * Objectif : Remplacer l'ancien mot de passe oublié.
 * 
 * Logique : 
 * - Vérifie que le token envoyé par email est toujours valide (non expiré).
 * - Chiffre le nouveau mot de passe.
 * - Supprime le token de sécurité pour empêcher sa réutilisation.
 */
const resetPassword = async (req, res) => {
  try {
    const { token, nouveauMotDePasse } = req.body;

    if (!token || !nouveauMotDePasse) {
      return res.status(400).json({ success: false, message: 'Token et nouveau mot de passe requis.' });
    }

    const user = await prisma.utilisateur.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gte: new Date() },
        actif: true,
        bloque: false,
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Lien invalide ou expire.' });
    }

    const hashedPassword = await bcrypt.hash(normalizeText(nouveauMotDePasse), 10);

    await prisma.utilisateur.update({
      where: { id: user.id },
      data: {
        motDePasse: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
        mustChangePassword: false,
      },
    });

    await logAction({
      action: 'RESET_PASSWORD',
      entite: 'UTILISATEUR',
      entiteId: user.id,
      details: 'Reinitialisation de mot de passe reussie',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Votre mot de passe a ete reinitialise avec succes.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la reinitialisation.' });
  }
};

module.exports = { register, login, getMe, updateMe, changePassword, updatePushToken, forgotPassword, resetPassword };
