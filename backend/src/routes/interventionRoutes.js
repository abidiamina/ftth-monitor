const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getInterventions,
  getIntervention,
  createIntervention,
  updateIntervention,
  deleteIntervention,
} = require('../controllers/interventionController');

// GET  /api/interventions         → tous les rôles connectés
// POST /api/interventions         → Responsable + Admin seulement
router
  .route('/')
  .get(protect, getInterventions)
  .post(protect, authorize('ADMIN', 'RESPONSABLE', 'CLIENT'), createIntervention);

// GET    /api/interventions/:id   → tous les rôles connectés
// PUT    /api/interventions/:id   → Responsable + Admin + Technicien (pour changer le statut)
// DELETE /api/interventions/:id   → Admin seulement
router
  .route('/:id')
  .get(protect, getIntervention)
  .put(protect, authorize('ADMIN', 'RESPONSABLE', 'TECHNICIEN'), updateIntervention)
  .delete(protect, authorize('ADMIN'), deleteIntervention);

module.exports = router;
