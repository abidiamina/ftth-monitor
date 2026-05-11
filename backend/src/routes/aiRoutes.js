const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Route accessible par tous les utilisateurs connectés
router.get('/message', protect, aiController.getPersonalizedMessage);

// Routes réservées aux responsables et admins
router.get('/predictions', protect, authorize('RESPONSABLE', 'ADMIN'), aiController.getOutagePredictions);
router.get('/sentiment-stats', protect, authorize('RESPONSABLE', 'ADMIN'), aiController.getSentimentStats);

module.exports = router;
