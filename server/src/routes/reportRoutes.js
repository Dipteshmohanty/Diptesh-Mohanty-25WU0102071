const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/dashboard', authenticate, authorize('ADMIN'), reportController.getDashboard);
router.get('/sales', authenticate, authorize('ADMIN'), reportController.getSales);
router.get('/top-products', authenticate, authorize('ADMIN', 'INVENTORY_MANAGER'), reportController.getTopProducts);
router.get('/categories', authenticate, authorize('ADMIN'), reportController.getCategories);
router.get('/inventory-valuation', authenticate, authorize('ADMIN', 'INVENTORY_MANAGER'), reportController.getValuation);
router.get('/cashiers', authenticate, authorize('ADMIN'), reportController.getCashierPerformance);

module.exports = router;
