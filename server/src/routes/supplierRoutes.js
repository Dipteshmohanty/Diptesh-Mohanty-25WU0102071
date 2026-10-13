const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { createSupplierValidator, updateSupplierValidator } = require('../validators/supplierValidators');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate, authorize('ADMIN', 'INVENTORY_MANAGER'));

router.get('/', supplierController.getSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.post('/', createSupplierValidator, validate, supplierController.createSupplier);
router.put('/:id', updateSupplierValidator, validate, supplierController.updateSupplier);

module.exports = router;
