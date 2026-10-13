const { body, param } = require('express-validator');

const createPurchaseValidator = [
  body('supplier_id')
    .isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
  body('items')
    .isArray({ min: 1 }).withMessage('Purchase order must have at least one product item'),
  body('items.*.product_id')
    .isInt({ min: 1 }).withMessage('Valid product ID required for each item'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unit_cost')
    .isFloat({ min: 0 }).withMessage('Unit cost must be a non-negative number'),
  body('notes')
    .optional()
    .trim()
];

const receivePurchaseValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid purchase ID is required')
];

module.exports = {
  createPurchaseValidator,
  receivePurchaseValidator
};
