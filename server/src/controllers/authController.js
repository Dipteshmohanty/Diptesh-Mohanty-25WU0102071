const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateToken } = require('../utils/jwt');
const { success, error } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const [rows] = await pool.execute(
      'SELECT user_id, full_name, email, password_hash, role, is_active FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      await logAudit({ action: 'LOGIN_FAILED', entityType: 'USERS', details: { email, reason: 'User not found' }, ipAddress });
      return error(res, 'Invalid email or password', 401);
    }

    const user = rows[0];

    if (!user.is_active) {
      await logAudit({ userId: user.user_id, action: 'LOGIN_BLOCKED', entityType: 'USERS', entityId: user.user_id, details: { email, reason: 'Deactivated account' }, ipAddress });
      return error(res, 'Account is deactivated. Please contact an administrator.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await logAudit({ userId: user.user_id, action: 'LOGIN_FAILED', entityType: 'USERS', entityId: user.user_id, details: { email, reason: 'Wrong password' }, ipAddress });
      return error(res, 'Invalid email or password', 401);
    }

    const token = generateToken({
      user_id: user.user_id,
      email: user.email,
      role: user.role
    });

    await logAudit({
      userId: user.user_id,
      action: 'LOGIN_SUCCESS',
      entityType: 'USERS',
      entityId: user.user_id,
      details: { role: user.role },
      ipAddress
    });

    return success(res, {
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      },
      token
    }, 'Authentication successful');
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT user_id, full_name, email, role, is_active, created_at FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return error(res, 'User session invalid or deactivated', 401);
    }

    return success(res, rows[0], 'Profile retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  if (req.user) {
    await logAudit({
      userId: req.user.user_id,
      action: 'LOGOUT',
      entityType: 'USERS',
      entityId: req.user.user_id,
      ipAddress: req.ip
    });
  }
  return success(res, null, 'Logged out successfully');
}

module.exports = { login, getMe, logout };
