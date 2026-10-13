const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { success, error } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

async function getUsers(req, res, next) {
  try {
    const [users] = await pool.execute(`
      SELECT user_id, full_name, email, role, is_active, created_at, updated_at
      FROM users
      ORDER BY user_id ASC
    `);
    return success(res, users, 'Users retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { full_name, email, password, role } = req.body;

    const [existing] = await pool.execute(
      'SELECT user_id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    if (existing.length > 0) {
      return error(res, 'A user account with this email address already exists.', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, NOW())`,
      [full_name, email.toLowerCase(), passwordHash, role]
    );

    const newUserId = result.insertId;

    await logAudit({
      userId: req.user.user_id,
      action: 'USER_CREATED',
      entityType: 'USERS',
      entityId: newUserId,
      details: { email, role, full_name },
      ipAddress: req.ip
    });

    return success(res, {
      user_id: newUserId,
      full_name,
      email: email.toLowerCase(),
      role,
      is_active: 1
    }, 'User created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { full_name, email, role, password } = req.body;

    const [existing] = await pool.execute(
      'SELECT * FROM users WHERE user_id = ?',
      [targetUserId]
    );
    if (existing.length === 0) {
      return error(res, 'User not found', 404);
    }
    const targetUser = existing[0];

    // If changing role away from ADMIN, check if this is the last active admin
    if (targetUser.role === 'ADMIN' && role && role !== 'ADMIN') {
      const [adminCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = "ADMIN" AND is_active = 1 AND user_id != ?',
        [targetUserId]
      );
      if (adminCount[0].count === 0) {
        return error(res, 'Cannot change role: The system must retain at least one active Administrator account.', 400);
      }
    }

    // Check email collision
    if (email && email.toLowerCase() !== targetUser.email.toLowerCase()) {
      const [emailCheck] = await pool.execute(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
        [email.toLowerCase(), targetUserId]
      );
      if (emailCheck.length > 0) {
        return error(res, 'Another user with this email address already exists.', 409);
      }
    }

    let passwordHash = targetUser.password_hash;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    await pool.execute(
      `UPDATE users 
       SET full_name = ?, email = ?, role = ?, password_hash = ?
       WHERE user_id = ?`,
      [
        full_name || targetUser.full_name,
        email ? email.toLowerCase() : targetUser.email,
        role || targetUser.role,
        passwordHash,
        targetUserId
      ]
    );

    await logAudit({
      userId: req.user.user_id,
      action: 'USER_UPDATED',
      entityType: 'USERS',
      entityId: targetUserId,
      details: { role: role || targetUser.role },
      ipAddress: req.ip
    });

    return success(res, {
      user_id: targetUserId,
      full_name: full_name || targetUser.full_name,
      email: email ? email.toLowerCase() : targetUser.email,
      role: role || targetUser.role
    }, 'User updated successfully');
  } catch (err) {
    next(err);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    const [existing] = await pool.execute(
      'SELECT * FROM users WHERE user_id = ?',
      [targetUserId]
    );
    if (existing.length === 0) {
      return error(res, 'User not found', 404);
    }
    const targetUser = existing[0];

    // Prevent deactivating the last active admin
    if (targetUser.role === 'ADMIN' && (is_active === false || is_active === 0 || is_active === '0')) {
      const [adminCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = "ADMIN" AND is_active = 1 AND user_id != ?',
        [targetUserId]
      );
      if (adminCount[0].count === 0) {
        return error(res, 'Security Rule: You cannot deactivate the last active Administrator account.', 400);
      }
    }

    const activeFlag = is_active ? 1 : 0;
    await pool.execute(
      'UPDATE users SET is_active = ? WHERE user_id = ?',
      [activeFlag, targetUserId]
    );

    await logAudit({
      userId: req.user.user_id,
      action: activeFlag ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USERS',
      entityId: targetUserId,
      details: { is_active: activeFlag },
      ipAddress: req.ip
    });

    return success(res, { user_id: targetUserId, is_active: activeFlag }, `User status updated to ${activeFlag ? 'active' : 'inactive'}`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  updateUserStatus
};
