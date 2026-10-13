const { error } = require('../utils/apiResponse');

/**
 * Role-Based Access Control middleware
 * @param  {...string} allowedRoles Roles permitted to access the endpoint ('ADMIN', 'CASHIER', 'INVENTORY_MANAGER')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to perform this operation. Allowed roles: ${allowedRoles.join(', ')}`,
        403
      );
    }

    next();
  };
}

module.exports = { authorize };
