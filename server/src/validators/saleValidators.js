const { body } = require('express-validator');

const createSaleValidator = [
  body('items')
    .isArray({ min: 1 }).withMessage('Cart must contain at least one item'),
  body('items.*.product_id')
    .isInt({ min: 1 }).withMessage('Each item must have a valid product_id'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Item quantity must be at least 1'),
  body('payment_method')
    .isIn(['CASH', 'CARD', 'UPI']).withMessage('Payment method must be CASH, CARD, or UPI'),
  body('discount_amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount amount must be non-negative'),
  body('tax_rate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Tax rate percentage must be between 0 and 100'),
  body('idempotency_key')
    .optional()
    .trim()
    .isLength({ min: 10, max: 100 }).withMessage('Idempotency key must be between 10 and 100 characters')
];

const refundSaleValidator = [
  body('reason')
    .trim()
    .notEmpty().withMessage('A valid reason is required for processing a refund/return')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be at least 5 characters long')
];

module.exports = {
  createSaleValidator,
  refundSaleValidator
};
