const { body, param } = require('express-validator');

const createCategoryValidator = [
  body('category_name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
];

const updateCategoryValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
  body('category_name')
    .optional()
    .trim()
    .notEmpty().withMessage('Category name cannot be empty')
    .isLength({ min: 2, max: 100 }).withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
];

module.exports = {
  createCategoryValidator,
  updateCategoryValidator
};
