const { pool } = require('../config/db');
const { success, error } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

async function getSuppliers(req, res, next) {
  try {
    const { search } = req.query;
    let whereSql = '';
    const params = [];

    if (search) {
      whereSql = 'WHERE s.supplier_name LIKE ? OR s.email LIKE ? OR s.phone LIKE ?';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const [suppliers] = await pool.execute(`
      SELECT 
        s.*,
        COUNT(p.purchase_id) AS total_orders,
        COALESCE(SUM(CASE WHEN p.status = 'RECEIVED' THEN p.total_amount ELSE 0 END), 0) AS total_purchased_value
      FROM suppliers s
      LEFT JOIN purchases p ON s.supplier_id = p.supplier_id
      ${whereSql}
      GROUP BY s.supplier_id
      ORDER BY s.supplier_name ASC
    `, params);

    return success(res, suppliers, 'Suppliers retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getSupplierById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const [suppliers] = await pool.execute('SELECT * FROM suppliers WHERE supplier_id = ?', [id]);
    if (suppliers.length === 0) {
      return error(res, 'Supplier not found', 404);
    }

    const [purchases] = await pool.execute(`
      SELECT p.*, u.full_name AS created_by_name
      FROM purchases p
      JOIN users u ON p.created_by = u.user_id
      WHERE p.supplier_id = ?
      ORDER BY p.purchase_date DESC
    `, [id]);

    return success(res, {
      supplier: suppliers[0],
      purchases
    }, 'Supplier details retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createSupplier(req, res, next) {
  try {
    const { supplier_name, phone, email, address } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO suppliers (supplier_name, phone, email, address, is_active, created_at) VALUES (?, ?, ?, ?, 1, NOW())',
      [supplier_name.trim(), phone || null, email ? email.toLowerCase().trim() : null, address || null]
    );

    const newId = result.insertId;

    await logAudit({
      userId: req.user.user_id,
      action: 'SUPPLIER_CREATED',
      entityType: 'SUPPLIERS',
      entityId: newId,
      details: { supplier_name },
      ipAddress: req.ip
    });

    return success(res, { supplier_id: newId, supplier_name }, 'Supplier added successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { supplier_name, phone, email, address, is_active } = req.body;

    const [existing] = await pool.execute('SELECT * FROM suppliers WHERE supplier_id = ?', [id]);
    if (existing.length === 0) {
      return error(res, 'Supplier not found', 404);
    }
    const current = existing[0];

    await pool.execute(`
      UPDATE suppliers
      SET 
        supplier_name = ?,
        phone = ?,
        email = ?,
        address = ?,
        is_active = ?
      WHERE supplier_id = ?
    `, [
      supplier_name ? supplier_name.trim() : current.supplier_name,
      phone !== undefined ? phone : current.phone,
      email !== undefined ? (email ? email.toLowerCase().trim() : null) : current.email,
      address !== undefined ? address : current.address,
      is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
      id
    ]);

    await logAudit({
      userId: req.user.user_id,
      action: 'SUPPLIER_UPDATED',
      entityType: 'SUPPLIERS',
      entityId: id,
      details: { supplier_name: supplier_name || current.supplier_name },
      ipAddress: req.ip
    });

    return success(res, { supplier_id: id }, 'Supplier updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier
};
