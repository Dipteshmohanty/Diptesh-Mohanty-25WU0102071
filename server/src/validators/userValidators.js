const { body, param } = require('express-validator');

const createUserValidator = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['ADMIN', 'CASHIER', 'INVENTORY_MANAGER'])
    .withMessage('Role must be one of: ADMIN, CASHIER, INVENTORY_MANAGER')
];

const updateUserValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['ADMIN', 'CASHIER', 'INVENTORY_MANAGER'])
    .withMessage('Role must be one of: ADMIN, CASHIER, INVENTORY_MANAGER'),
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const updateUserStatusValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  body('is_active')
    .isBoolean().withMessage('is_active must be true or false')
];

module.exports = {
  createUserValidator,
  updateUserValidator,
  updateUserStatusValidator
};
