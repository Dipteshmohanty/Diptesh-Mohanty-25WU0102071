const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { createSaleValidator, refundSaleValidator } = require('../validators/saleValidators');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Complete sale (POS)
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'CASHIER'),
  createSaleValidator,
  validate,
  salesController.createSale
);

// View sales history
router.get('/', authenticate, salesController.getSales);
router.get('/:id', authenticate, salesController.getSaleById);
router.get('/:id/receipt', authenticate, salesController.getReceipt);

// Process authorized refund
router.post(
  '/:id/refund',
  authenticate,
  authorize('ADMIN'),
  refundSaleValidator,
  validate,
  salesController.refundSale
);

module.exports = router;
