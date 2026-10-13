const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { createPurchaseValidator, receivePurchaseValidator } = require('../validators/purchaseValidators');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate, authorize('ADMIN', 'INVENTORY_MANAGER'));

router.get('/', purchaseController.getPurchases);
router.get('/:id', purchaseController.getPurchaseById);
router.post('/', createPurchaseValidator, validate, purchaseController.createPurchase);
router.post('/:id/receive', receivePurchaseValidator, validate, purchaseController.receivePurchase);

module.exports = router;
