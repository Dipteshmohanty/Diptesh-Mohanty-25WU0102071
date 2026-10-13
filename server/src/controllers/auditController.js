const { pool } = require('../config/db');
const { success } = require('../utils/apiResponse');

async function getAuditLogs(req, res, next) {
  try {
    const { action, entity_type, user_id, page = 1, limit = 50 } = req.query;

    let whereClauses = [];
    const params = [];

    if (action) {
      whereClauses.push('a.action LIKE ?');
      params.push(`%${action}%`);
    }
    if (entity_type) {
      whereClauses.push('a.entity_type = ?');
      params.push(entity_type);
    }
    if (user_id) {
      whereClauses.push('a.user_id = ?');
      params.push(user_id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [countResult] = await pool.execute(`SELECT COUNT(*) as total FROM audit_logs a ${whereSql}`, params);
    const total = countResult[0].total;

    const queryParams = [...params, parseInt(limit, 10), offset];
    const [logs] = await pool.query(`
      SELECT 
        a.log_id,
        a.user_id,
        u.full_name AS user_name,
        a.action,
        a.entity_type,
        a.entity_id,
        a.details,
        a.ip_address,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.user_id
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    return success(res, logs, 'Audit logs retrieved', 200, {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAuditLogs };
