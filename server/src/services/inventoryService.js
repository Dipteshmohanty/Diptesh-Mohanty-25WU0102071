const { pool, withTransaction } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

function generateAdjustmentReference() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `ADJ-${dateStr}-${randomSuffix}`;
}

async function recordStockAdjustment({ productId, userId, movementType, quantityChange, reason, ipAddress = null }) {
  const result = await withTransaction(async (conn) => {
    // 1. Lock product row
    const [products] = await conn.execute(
      `SELECT product_id, product_name, stock_quantity, is_active FROM products WHERE product_id = ? FOR UPDATE`,
      [productId]
    );

    if (products.length === 0) {
      const err = new Error(`Product with ID ${productId} not found.`);
      err.statusCode = 404;
      err.isPublic = true;
      throw err;
    }

    const product = products[0];
    const prevStock = product.stock_quantity;
    const newStock = prevStock + quantityChange;

    if (newStock < 0) {
      const err = new Error(
        `Invalid adjustment: Stock cannot be negative. Current stock is ${prevStock}, change requested is ${quantityChange}.`
      );
      err.statusCode = 400;
      err.isPublic = true;
      throw err;
    }

    const refId = generateAdjustmentReference();

    // 2. Update stock
    await conn.execute(
      `UPDATE products SET stock_quantity = ? WHERE product_id = ?`,
      [newStock, productId]
    );

    // 3. Log stock movement
    await conn.execute(
      `INSERT INTO stock_movements 
        (product_id, user_id, movement_type, quantity_change, previous_quantity, new_quantity, reference_type, reference_id, reason, movement_date)
       VALUES (?, ?, ?, ?, ?, ?, 'MANUAL_ADJUSTMENT', ?, ?, NOW())`,
      [productId, userId, movementType, quantityChange, prevStock, newStock, refId, reason]
    );

    return {
      product_id: productId,
      product_name: product.product_name,
      movement_type: movementType,
      quantity_change: quantityChange,
      previous_quantity: prevStock,
      new_quantity: newStock,
      reference_id: refId,
      reason
    };
  });

  await logAudit({
    userId,
    action: 'STOCK_ADJUSTMENT',
    entityType: 'PRODUCTS',
    entityId: productId,
    details: { movement_type: movementType, change: quantityChange, reason },
    ipAddress
  });

  return result;
}

async function getInventorySummary() {
  const [metrics] = await pool.execute(`
    SELECT 
      COUNT(*) AS total_products,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_products,
      COALESCE(SUM(stock_quantity), 0) AS total_units,
      COALESCE(SUM(CASE WHEN is_active = 1 AND stock_quantity <= reorder_level AND stock_quantity > 0 THEN 1 ELSE 0 END), 0) AS low_stock_count,
      COALESCE(SUM(CASE WHEN is_active = 1 AND stock_quantity = 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_count,
      COALESCE(SUM(stock_quantity * cost_price), 0) AS total_inventory_cost_value,
      COALESCE(SUM(stock_quantity * selling_price), 0) AS total_inventory_retail_value
    FROM products
  `);

  return metrics[0];
}

module.exports = {
  recordStockAdjustment,
  getInventorySummary,
  generateAdjustmentReference
};
