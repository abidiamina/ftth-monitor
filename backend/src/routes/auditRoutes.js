const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Route protegee : ADMIN uniquement
router.get('/', protect, authorize('ADMIN'), auditController.getAuditLogs);

module.exports = router;
