const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Route protegee : RESPONSABLE et ADMIN
router.get('/dashboard', protect, authorize('RESPONSABLE', 'ADMIN'), statsController.getDashboardStats);
router.get('/report', protect, authorize('RESPONSABLE', 'ADMIN'), statsController.getReportData);

module.exports = router;
