const { body } = require('express-validator');

const loginValidator = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

module.exports = { loginValidator };
