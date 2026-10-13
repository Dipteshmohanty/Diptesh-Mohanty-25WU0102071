const { pool } = require('../config/db');
const { getInventorySummary, recordStockAdjustment } = require('../services/inventoryService');
const { success } = require('../utils/apiResponse');

async function getSummary(req, res, next) {
  try {
    const summary = await getInventorySummary();
    return success(res, summary, 'Inventory summary retrieved');
  } catch (err) {
    next(err);
  }
}

async function getLowStock(req, res, next) {
  try {
    const [products] = await pool.execute(`
      SELECT 
        p.product_id,
        p.sku,
        p.barcode,
        p.product_name,
        c.category_name,
        p.stock_quantity,
        p.reorder_level,
        p.cost_price,
        p.selling_price
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      WHERE p.is_active = 1 AND p.stock_quantity <= p.reorder_level
      ORDER BY p.stock_quantity ASC
    `);

    return success(res, products, 'Low stock alerts retrieved');
  } catch (err) {
    next(err);
  }
}

async function getMovements(req, res, next) {
  try {
    const { product_id, movement_type, start_date, end_date, page = 1, limit = 50 } = req.query;

    let whereClauses = [];
    const params = [];

    if (product_id) {
      whereClauses.push('sm.product_id = ?');
      params.push(product_id);
    }

    if (movement_type) {
      whereClauses.push('sm.movement_type = ?');
      params.push(movement_type);
    }

    if (start_date) {
      whereClauses.push('DATE(sm.movement_date) >= ?');
      params.push(start_date);
    }

    if (end_date) {
      whereClauses.push('DATE(sm.movement_date) <= ?');
      params.push(end_date);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total FROM stock_movements sm ${whereSql}
    `, params);
    const total = countResult[0].total;

    const queryParams = [...params, parseInt(limit, 10), offset];
    const [movements] = await pool.query(`
      SELECT 
        sm.movement_id,
        sm.product_id,
        p.product_name,
        p.sku,
        sm.user_id,
        u.full_name AS user_name,
        sm.movement_type,
        sm.quantity_change,
        sm.previous_quantity,
        sm.new_quantity,
        sm.reference_type,
        sm.reference_id,
        sm.reason,
        sm.movement_date
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.product_id
      JOIN users u ON sm.user_id = u.user_id
      ${whereSql}
      ORDER BY sm.movement_date DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    return success(res, movements, 'Stock movements retrieved', 200, {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (err) {
    next(err);
  }
}

async function createAdjustment(req, res, next) {
  try {
    const { product_id, movement_type, quantity_change, reason } = req.body;

    const result = await recordStockAdjustment({
      productId: product_id,
      userId: req.user.user_id,
      movementType: movement_type,
      quantityChange: parseInt(quantity_change, 10),
      reason,
      ipAddress: req.ip
    });

    return success(res, result, 'Stock adjustment recorded successfully', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  getLowStock,
  getMovements,
  createAdjustment
};
