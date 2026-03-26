const { verifyToken } = require('../utils/jwtUtils');
const prisma = require('../config/prisma');

// Vérifie que le token JWT est valide
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Non autorisé. Token manquant.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true },
    });

    if (!user || !user.actif) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable ou désactivé.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré.' });
  }
};

// Vérifie que l'utilisateur a le bon rôle
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôle requis : ${roles.join(' ou ')}.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
