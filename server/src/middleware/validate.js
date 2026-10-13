const { validationResult } = require('express-validator');
const { error } = require('../utils/apiResponse');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));
    return error(res, 'Validation failed: Please check input fields', 422, formatted);
  }
  next();
}

module.exports = { validate };
