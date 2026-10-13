const { body, param, query } = require('express-validator');

const createProductValidator = [
  body('sku')
    .trim()
    .notEmpty().withMessage('SKU code is required')
    .isLength({ min: 2, max: 50 }).withMessage('SKU must be between 2 and 50 characters'),
  body('barcode')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Barcode cannot exceed 100 characters'),
  body('product_name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Product name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim(),
  body('category_id')
    .isInt({ min: 1 }).withMessage('Valid category ID is required'),
  body('cost_price')
    .isFloat({ min: 0 }).withMessage('Cost price must be a non-negative number'),
  body('selling_price')
    .isFloat({ min: 0 }).withMessage('Selling price must be a non-negative number')
    .custom((val, { req }) => {
      if (parseFloat(val) < parseFloat(req.body.cost_price || 0)) {
        // Warning or allowed with notification, but non-negative is strict
      }
      return true;
    }),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('reorder_level')
    .optional()
    .isInt({ min: 0 }).withMessage('Reorder level must be a non-negative integer')
];

const updateProductValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
  body('sku')
    .optional()
    .trim()
    .notEmpty().withMessage('SKU code cannot be empty'),
  body('barcode')
    .optional({ nullable: true })
    .trim(),
  body('product_name')
    .optional()
    .trim()
    .notEmpty().withMessage('Product name cannot be empty'),
  body('category_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Valid category ID is required'),
  body('cost_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost price must be a non-negative number'),
  body('selling_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Selling price must be a non-negative number'),
  body('reorder_level')
    .optional()
    .isInt({ min: 0 }).withMessage('Reorder level must be a non-negative integer')
];

const updateProductStatusValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
  body('is_active')
    .isBoolean().withMessage('is_active must be true or false')
];

module.exports = {
  createProductValidator,
  updateProductValidator,
  updateProductStatusValidator
};
