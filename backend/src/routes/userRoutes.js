const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/users - liste tous les utilisateurs (Admin seulement)
router.get('/', protect, authorize('ADMIN'), async (req, res) => {
  const prisma = require('../config/prisma');
  const users = await prisma.utilisateur.findMany({
    select: { id: true, nom: true, prenom: true, email: true, role: true, actif: true, createdAt: true },
  });
  res.json({ success: true, data: users });
});

// GET /api/users/techniciens - liste les techniciens (Admin + Responsable)
router.get('/techniciens', protect, authorize('ADMIN', 'RESPONSABLE'), async (req, res) => {
  const prisma = require('../config/prisma');
  const techniciens = await prisma.technicien.findMany({
    include: {
      utilisateur: {
        select: { id: true, nom: true, prenom: true, email: true, telephone: true },
      },
    },
  });
  res.json({ success: true, data: techniciens });
});

module.exports = router;
