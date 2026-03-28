const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  listNotifications,
  markNotificationAsRead,
} = require('../controllers/notificationController');

router.get('/', protect, listNotifications);
router.patch('/:id/read', protect, markNotificationAsRead);

module.exports = router;
