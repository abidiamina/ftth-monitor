const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createEmployee,
  deleteUser,
  getUserById,
  listTechnicians,
  listUsers,
  resetEmployeePassword,
  updateUser,
  updateUserStatus,
} = require('../controllers/userController');

router.get('/', protect, authorize('ADMIN'), listUsers);
router.get('/techniciens', protect, authorize('ADMIN', 'RESPONSABLE'), listTechnicians);
router.post('/employees', protect, authorize('ADMIN'), createEmployee);
router.get('/:id', protect, authorize('ADMIN'), getUserById);
router.patch('/:id', protect, authorize('ADMIN'), updateUser);
router.patch('/:id/status', protect, authorize('ADMIN'), updateUserStatus);
router.patch('/:id/reset-password', protect, authorize('ADMIN'), resetEmployeePassword);
router.delete('/:id', protect, authorize('ADMIN'), deleteUser);

module.exports = router;
