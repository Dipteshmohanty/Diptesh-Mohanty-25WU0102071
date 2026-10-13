const { pool, withTransaction } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

function generatePurchaseReference() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `PO-${dateStr}-${randomSuffix}`;
}

async function createPurchaseOrder({ supplierId, createdBy, items, notes = '' }) {
  return await withTransaction(async (conn) => {
    // 1. Verify supplier
    const [suppliers] = await conn.execute(
      'SELECT supplier_id, supplier_name FROM suppliers WHERE supplier_id = ? AND is_active = 1',
      [supplierId]
    );
    if (suppliers.length === 0) {
      const err = new Error('Selected supplier does not exist or is inactive.');
      err.statusCode = 404;
      err.isPublic = true;
      throw err;
    }

    let subtotal = 0;
    const computedItems = [];

    // 2. Validate product IDs
    for (const item of items) {
      const pid = parseInt(item.product_id, 10);
      const qty = parseInt(item.quantity, 10);
      const unitCost = parseFloat(item.unit_cost);

      const [prods] = await conn.execute(
        'SELECT product_id, product_name FROM products WHERE product_id = ?',
        [pid]
      );
      if (prods.length === 0) {
        const err = new Error(`Product ID ${pid} does not exist.`);
        err.statusCode = 404;
        err.isPublic = true;
        throw err;
      }

      const lineTotal = Math.round((qty * unitCost) * 100) / 100;
      subtotal = Math.round((subtotal + lineTotal) * 100) / 100;

      computedItems.push({
        product_id: pid,
        quantity: qty,
        unit_cost: unitCost,
        line_total: lineTotal
      });
    }

    const reference = generatePurchaseReference();

    // 3. Insert purchase record
    const [purchaseInsert] = await conn.execute(
      `INSERT INTO purchases (purchase_reference, supplier_id, created_by, purchase_date, subtotal, total_amount, status, notes)
       VALUES (?, ?, ?, NOW(), ?, ?, 'ORDERED', ?)`,
      [reference, supplierId, createdBy, subtotal, subtotal, notes || null]
    );
    const purchaseId = purchaseInsert.insertId;

    // 4. Insert purchase items
    for (const item of computedItems) {
      await conn.execute(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, line_total)
         VALUES (?, ?, ?, ?, ?)`,
        [purchaseId, item.product_id, item.quantity, item.unit_cost, item.line_total]
      );
    }

    return {
      purchase_id: purchaseId,
      purchase_reference: reference,
      supplier_id: supplierId,
      subtotal,
      total_amount: subtotal,
      status: 'ORDERED'
    };
  });
}

async function receivePurchaseOrder({ purchaseId, userId, ipAddress = null }) {
  const result = await withTransaction(async (conn) => {
    // 1. Lock purchase row
    const [purchases] = await conn.execute(
      `SELECT * FROM purchases WHERE purchase_id = ? FOR UPDATE`,
      [purchaseId]
    );

    if (purchases.length === 0) {
      const err = new Error('Purchase order not found');
      err.statusCode = 404;
      err.isPublic = true;
      throw err;
    }

    const purchase = purchases[0];
    if (purchase.status === 'RECEIVED') {
      const err = new Error('This purchase order has already been received. Duplicate receipt prevented.');
      err.statusCode = 400;
      err.isPublic = true;
      throw err;
    }
    if (purchase.status === 'CANCELLED') {
      const err = new Error('Cannot receive a cancelled purchase order.');
      err.statusCode = 400;
      err.isPublic = true;
      throw err;
    }

    // 2. Fetch purchase items
    const [items] = await conn.execute(
      `SELECT pi.*, p.stock_quantity, p.product_name 
       FROM purchase_items pi
       JOIN products p ON pi.product_id = p.product_id
       WHERE pi.purchase_id = ?`,
      [purchaseId]
    );

    // 3. Atomically increase stock and record stock movements
    for (const item of items) {
      const prevStock = item.stock_quantity;
      const newStock = prevStock + item.quantity;

      await conn.execute(
        `UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?`,
        [item.quantity, item.product_id]
      );

      await conn.execute(
        `INSERT INTO stock_movements
          (product_id, user_id, movement_type, quantity_change, previous_quantity, new_quantity, reference_type, reference_id, reason, movement_date)
         VALUES (?, ?, 'PURCHASE', ?, ?, ?, 'PURCHASE', ?, ?, NOW())`,
        [item.product_id, userId, item.quantity, prevStock, newStock, purchase.purchase_reference, `Received shipment for PO #${purchase.purchase_reference}`]
      );
    }

    // 4. Update purchase status
    await conn.execute(
      `UPDATE purchases SET status = 'RECEIVED', received_at = NOW(), received_by = ? WHERE purchase_id = ?`,
      [userId, purchaseId]
    );

    return {
      purchase_id: purchaseId,
      purchase_reference: purchase.purchase_reference,
      status: 'RECEIVED',
      items_received: items.length
    };
  });

  await logAudit({
    userId,
    action: 'PURCHASE_RECEIVED',
    entityType: 'PURCHASES',
    entityId: purchaseId,
    details: { reference: result.purchase_reference },
    ipAddress
  });

  return result;
}

module.exports = {
  createPurchaseOrder,
  receivePurchaseOrder,
  generatePurchaseReference
};
