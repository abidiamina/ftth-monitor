const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateToken } = require('../utils/jwtUtils');
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
  role: user.role,
  actif: user.actif,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt,
});

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
            nom: nom.trim(),
            prenom: prenom.trim(),
            email: normalizedEmail,
            telephone: telephone.trim(),
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
        role: true,
        actif: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    const token = generateToken({ id: user.id, role: user.role });

    res.status(201).json({ success: true, token, user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur lors de l'inscription." });
  }
};

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

    if (!user || !user.actif) {
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
        role: true,
        actif: true,
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
      { requireAddress: true }
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
            nom: nom.trim(),
            prenom: prenom.trim(),
            telephone: telephone?.trim() || '',
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
        role: true,
        actif: true,
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
        role: true,
        actif: true,
        mustChangePassword: true,
        createdAt: true,
      },
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

module.exports = { register, login, getMe, updateMe, changePassword };
