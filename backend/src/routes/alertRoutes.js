const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alertsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Route protegee : RESPONSABLE et ADMIN
router.get('/', protect, authorize('RESPONSABLE', 'ADMIN'), alertsController.getActiveAlerts);

module.exports = router;
