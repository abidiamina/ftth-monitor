const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { protect, authorize } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, authorize('ADMIN'), configController.getConfigs);

router
  .route('/:cle')
  .patch(protect, authorize('ADMIN'), configController.updateConfig);

module.exports = router;
