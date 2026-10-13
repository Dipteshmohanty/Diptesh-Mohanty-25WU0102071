const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const {
  createProductValidator,
  updateProductValidator,
  updateProductStatusValidator
} = require('../validators/productValidators');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, productController.getProducts);
router.get('/:id', authenticate, productController.getProductById);

// Creation, editing, and status updates restricted to Admin and Inventory Manager
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  createProductValidator,
  validate,
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  updateProductValidator,
  validate,
  productController.updateProduct
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  updateProductStatusValidator,
  validate,
  productController.updateProductStatus
);

module.exports = router;
