const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateToken } = require('../utils/jwtUtils');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { nom, prenom, email, motDePasse, telephone, role } = req.body;

    // Vérifier si l'email existe déjà
    const existing = await prisma.utilisateur.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email déjà utilisé.' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(motDePasse, 10);

    // Créer l'utilisateur + profil selon le rôle
    const user = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email,
        motDePasse: hashedPassword,
        telephone,
        role,
        ...(role === 'TECHNICIEN' && {
          technicien: { create: {} },
        }),
        ...(role === 'RESPONSABLE' && {
          responsable: { create: {} },
        }),
      },
      select: {
        id: true, nom: true, prenom: true, email: true, role: true, createdAt: true,
      },
    });

    const token = generateToken({ id: user.id, role: user.role });

    res.status(201).json({ success: true, token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'inscription.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    const user = await prisma.utilisateur.findUnique({ where: { email } });
    if (!user || !user.actif) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
    }

    const isMatch = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
    }

    const token = generateToken({ id: user.id, role: user.role });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la connexion.' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await prisma.utilisateur.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, nom: true, prenom: true, email: true,
        telephone: true, role: true, createdAt: true,
        technicien: true,
        responsable: true,
      },
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

module.exports = { register, login, getMe };
