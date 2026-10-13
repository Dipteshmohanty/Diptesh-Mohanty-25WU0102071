const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { createCategoryValidator, updateCategoryValidator } = require('../validators/categoryValidators');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, categoryController.getCategories);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  createCategoryValidator,
  validate,
  categoryController.createCategory
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  updateCategoryValidator,
  validate,
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  categoryController.deleteCategory
);

module.exports = router;
