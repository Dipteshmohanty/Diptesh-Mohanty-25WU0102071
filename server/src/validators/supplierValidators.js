const { body, param } = require('express-validator');

const createSupplierValidator = [
  body('supplier_name')
    .trim()
    .notEmpty().withMessage('Supplier name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Supplier name must be between 2 and 150 characters'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Must be a valid email address'),
  body('phone')
    .optional()
    .trim(),
  body('address')
    .optional()
    .trim()
];

const updateSupplierValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Supplier ID must be a positive integer'),
  body('supplier_name')
    .optional()
    .trim()
    .notEmpty().withMessage('Supplier name cannot be empty'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Must be a valid email address')
];

module.exports = {
  createSupplierValidator,
  updateSupplierValidator
};
