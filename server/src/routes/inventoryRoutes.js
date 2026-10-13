const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { stockAdjustmentValidator } = require('../validators/inventoryValidators');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/summary', authenticate, authorize('ADMIN', 'INVENTORY_MANAGER'), inventoryController.getSummary);
router.get('/low-stock', authenticate, inventoryController.getLowStock);
router.get('/movements', authenticate, authorize('ADMIN', 'INVENTORY_MANAGER'), inventoryController.getMovements);
router.post(
  '/adjustments',
  authenticate,
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  stockAdjustmentValidator,
  validate,
  inventoryController.createAdjustment
);

module.exports = router;
