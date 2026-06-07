const { verifyToken } = require('../utils/jwtUtils');
const prisma = require('../config/prisma');

/**
 * MIDDLEWARE DE PROTECTION (protect)
 * Objectif : Bloquer l'accès aux routes privées si l'utilisateur n'est pas connecté.
 * 
 * Logique pour la soutenance :
 * 1. Lit l'en-tête "Authorization: Bearer <token>" de la requête entrante.
 * 2. Décrypte le token JWT avec la clé secrète du serveur (`verifyToken`).
 * 3. Interroge la base de données pour s'assurer que l'utilisateur existe toujours et n'est pas bloqué.
 * 4. Ajoute l'objet utilisateur (`req.user`) pour que les contrôleurs suivants sachent qui fait l'action.
 */
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
      select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true, bloque: true },
    });

    if (!user || !user.actif || user.bloque) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable, désactivé ou bloqué.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré.' });
  }
};

/**
 * MIDDLEWARE D'AUTORISATION (authorize)
 * Objectif : Contrôler les permissions granulaires (RBAC - Role-Based Access Control).
 * 
 * Logique pour la soutenance :
 * - Accepte une liste de rôles permis (ex: `authorize('ADMIN', 'RESPONSABLE')`).
 * - Si le rôle du `req.user` (déjà vérifié par le middleware `protect`) ne correspond pas, renvoie une erreur 403 Forbidden.
 */
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
