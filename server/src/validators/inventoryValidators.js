const { body } = require('express-validator');

const stockAdjustmentValidator = [
  body('product_id')
    .isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('movement_type')
    .isIn(['DAMAGE', 'EXPIRED', 'RETURN', 'ADJUSTMENT'])
    .withMessage('Adjustment type must be DAMAGE, EXPIRED, RETURN, or ADJUSTMENT'),
  body('quantity_change')
    .isInt()
    .not().equals('0').withMessage('Quantity change must be a non-zero integer'),
  body('reason')
    .trim()
    .notEmpty().withMessage('Mandatory reason is required for manual stock adjustments')
    .isLength({ min: 5, max: 500 }).withMessage('Adjustment reason must be at least 5 characters long')
];

module.exports = { stockAdjustmentValidator };
