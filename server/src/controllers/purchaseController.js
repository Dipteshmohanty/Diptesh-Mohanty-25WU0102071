const { pool } = require('../config/db');
const { createPurchaseOrder, receivePurchaseOrder } = require('../services/purchaseService');
const { success, error } = require('../utils/apiResponse');

async function createPurchase(req, res, next) {
  try {
    const { supplier_id, items, notes } = req.body;

    const purchase = await createPurchaseOrder({
      supplierId: supplier_id,
      createdBy: req.user.user_id,
      items,
      notes
    });

    return success(res, purchase, 'Purchase order created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function getPurchases(req, res, next) {
  try {
    const { status, supplier_id, page = 1, limit = 50 } = req.query;

    let whereClauses = [];
    const params = [];

    if (status) {
      whereClauses.push('p.status = ?');
      params.push(status);
    }
    if (supplier_id) {
      whereClauses.push('p.supplier_id = ?');
      params.push(supplier_id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [countResult] = await pool.execute(`SELECT COUNT(*) as total FROM purchases p ${whereSql}`, params);
    const total = countResult[0].total;

    const queryParams = [...params, parseInt(limit, 10), offset];
    const [purchases] = await pool.query(`
      SELECT 
        p.*,
        s.supplier_name,
        u1.full_name AS created_by_name,
        u2.full_name AS received_by_name,
        COUNT(pi.purchase_item_id) AS item_count
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.supplier_id
      JOIN users u1 ON p.created_by = u1.user_id
      LEFT JOIN users u2 ON p.received_by = u2.user_id
      LEFT JOIN purchase_items pi ON p.purchase_id = pi.purchase_id
      ${whereSql}
      GROUP BY p.purchase_id
      ORDER BY p.purchase_date DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    return success(res, purchases, 'Purchases retrieved', 200, {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (err) {
    next(err);
  }
}

async function getPurchaseById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    const [purchases] = await pool.execute(`
      SELECT 
        p.*,
        s.supplier_name,
        s.email AS supplier_email,
        s.phone AS supplier_phone,
        u1.full_name AS created_by_name,
        u2.full_name AS received_by_name
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.supplier_id
      JOIN users u1 ON p.created_by = u1.user_id
      LEFT JOIN users u2 ON p.received_by = u2.user_id
      WHERE p.purchase_id = ?
    `, [id]);

    if (purchases.length === 0) {
      return error(res, 'Purchase order not found', 404);
    }

    const [items] = await pool.execute(`
      SELECT 
        pi.*,
        p.product_name,
        p.sku,
        p.stock_quantity as current_stock
      FROM purchase_items pi
      JOIN products p ON pi.product_id = p.product_id
      WHERE pi.purchase_id = ?
    `, [id]);

    return success(res, {
      purchase: purchases[0],
      items
    }, 'Purchase order details retrieved');
  } catch (err) {
    next(err);
  }
}

async function receivePurchase(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    const result = await receivePurchaseOrder({
      purchaseId: id,
      userId: req.user.user_id,
      ipAddress: req.ip
    });

    return success(res, result, 'Purchase order items successfully received into inventory.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPurchase,
  getPurchases,
  getPurchaseById,
  receivePurchase
};
