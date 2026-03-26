const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} = require('../controllers/clientController');

// GET  /api/clients   → tous les rôles connectés
// POST /api/clients   → Admin + Responsable
router
  .route('/')
  .get(protect, getClients)
  .post(protect, authorize('ADMIN', 'RESPONSABLE'), createClient);

// GET    /api/clients/:id  → tous les rôles connectés
// PUT    /api/clients/:id  → Admin + Responsable
// DELETE /api/clients/:id  → Admin seulement
router
  .route('/:id')
  .get(protect, getClient)
  .put(protect, authorize('ADMIN', 'RESPONSABLE'), updateClient)
  .delete(protect, authorize('ADMIN'), deleteClient);

module.exports = router;