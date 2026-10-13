const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { createUserValidator, updateUserValidator, updateUserStatusValidator } = require('../validators/userValidators');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All user management routes are restricted to ADMIN
router.use(authenticate, authorize('ADMIN'));

router.get('/', userController.getUsers);
router.post('/', createUserValidator, validate, userController.createUser);
router.put('/:id', updateUserValidator, validate, userController.updateUser);
router.patch('/:id/status', updateUserStatusValidator, validate, userController.updateUserStatus);

module.exports = router;
