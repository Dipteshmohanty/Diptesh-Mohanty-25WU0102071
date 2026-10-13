const { pool } = require('../config/db');

/**
 * Log an audit action into audit_logs table
 * @param {Object} options
 * @param {number|null} options.userId
 * @param {string} options.action
 * @param {string} options.entityType
 * @param {string|number|null} options.entityId
 * @param {Object|null} options.details
 * @param {string|null} options.ipAddress
 */
async function logAudit({ userId = null, action, entityType, entityId = null, details = null, ipAddress = null }) {
  try {
    const detailsJson = details ? JSON.stringify(details) : null;
    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, action, entityType, entityId ? String(entityId) : null, detailsJson, ipAddress]
    );
  } catch (err) {
    // Non-blocking: audit log failure should not crash main transactions
    console.error('Audit logging error:', err.message);
  }
}

module.exports = { logAudit };
