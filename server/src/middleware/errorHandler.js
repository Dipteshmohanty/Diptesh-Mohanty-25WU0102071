const { error } = require('../utils/apiResponse');

function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  // Handle express JSON body parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return error(res, 'Malformed JSON payload in request body', 400);
  }

  // Handle MySQL errors
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        return error(res, 'A record with this unique identifier (SKU, barcode, email, or invoice) already exists.', 409);
      case 'ER_ROW_IS_REFERENCED_2':
        return error(res, 'Cannot delete or alter this entity because active related records (such as sales or products) depend on it.', 400);
      case 'ER_NO_REFERENCED_ROW_2':
        return error(res, 'Specified foreign reference (category, supplier, or product ID) does not exist.', 400);
      case 'ER_CHECK_CONSTRAINT_VIOLATED':
        return error(res, 'Database check constraint violation: Quantity, price, or stock value is out of permitted range.', 400);
      case 'ECONNREFUSED':
      case 'PROTOCOL_CONNECTION_LOST':
        return error(res, 'Database connection is temporarily unavailable. Please verify MySQL service status.', 503);
    }
  }

  const statusCode = err.statusCode || 500;
  const message = err.isPublic ? err.message : (statusCode === 500 ? 'An internal server error occurred' : err.message);

  return error(res, message, statusCode);
}

module.exports = { errorHandler };
