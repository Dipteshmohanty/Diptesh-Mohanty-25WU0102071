const { pool, withTransaction } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

function generateInvoiceNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${randomSuffix}`;
}

async function processCheckout({ cashierId, items, paymentMethod, discountAmount = 0, taxRate = 0, notes = '', idempotencyKey = null, ipAddress = null }) {
  // 1. Idempotency Check
  if (idempotencyKey) {
    const [existing] = await pool.execute(
      'SELECT response_body FROM idempotency_keys WHERE idempotency_key = ?',
      [idempotencyKey]
    );
    if (existing.length > 0) {
      return typeof existing[0].response_body === 'string' 
        ? JSON.parse(existing[0].response_body) 
        : existing[0].response_body;
    }
  }

  // 2. Execute Transaction
  const result = await withTransaction(async (conn) => {
    // Sort product IDs to prevent deadlock during concurrent checkouts
    const uniqueProductIds = [...new Set(items.map(i => parseInt(i.product_id, 10)))].sort((a, b) => a - b);
    
    // Acquire row-level locks on products (FOR UPDATE)
    const placeholders = uniqueProductIds.map(() => '?').join(',');
    const [lockedProducts] = await conn.execute(
      `SELECT product_id, sku, barcode, product_name, cost_price, selling_price, stock_quantity, is_active 
       FROM products 
       WHERE product_id IN (${placeholders}) 
       FOR UPDATE`,
      uniqueProductIds
    );

    const productMap = new Map();
    lockedProducts.forEach(p => productMap.set(p.product_id, p));

    // Validate existence, active status, and stock sufficiency
    const consolidatedQuantities = new Map();
    for (const item of items) {
      const pid = parseInt(item.product_id, 10);
      const qty = parseInt(item.quantity, 10);
      consolidatedQuantities.set(pid, (consolidatedQuantities.get(pid) || 0) + qty);
    }

    for (const [pid, requestedQty] of consolidatedQuantities.entries()) {
      const product = productMap.get(pid);
      if (!product) {
        const err = new Error(`Product ID ${pid} does not exist in inventory.`);
        err.statusCode = 404;
        err.isPublic = true;
        throw err;
      }
      if (!product.is_active) {
        const err = new Error(`Product "${product.product_name}" is currently deactivated and cannot be sold.`);
        err.statusCode = 400;
        err.isPublic = true;
        throw err;
      }
      if (product.stock_quantity < requestedQty) {
        const err = new Error(`Insufficient stock for "${product.product_name}". Available: ${product.stock_quantity}, requested: ${requestedQty}.`);
        err.statusCode = 400;
        err.isPublic = true;
        throw err;
      }
    }

    // Server-side calculation of pricing and line items
    let subtotal = 0;
    const computedSaleItems = [];

    for (const item of items) {
      const pid = parseInt(item.product_id, 10);
      const qty = parseInt(item.quantity, 10);
      const product = productMap.get(pid);
      
      const unitPrice = parseFloat(product.selling_price);
      const unitCost = parseFloat(product.cost_price);
      const lineTotal = Math.round((unitPrice * qty) * 100) / 100;
      subtotal = Math.round((subtotal + lineTotal) * 100) / 100;

      computedSaleItems.push({
        product_id: pid,
        product_name: product.product_name,
        sku: product.sku,
        quantity: qty,
        unit_price: unitPrice,
        unit_cost: unitCost,
        discount_amount: 0.00,
        line_total: lineTotal,
        prevStock: product.stock_quantity,
        newStock: product.stock_quantity - qty
      });
    }

    const cleanDiscount = Math.min(subtotal, Math.max(0, parseFloat(discountAmount) || 0));
    const taxableAmount = Math.max(0, subtotal - cleanDiscount);
    const cleanTaxRate = Math.max(0, parseFloat(taxRate) || 0);
    const calculatedTax = Math.round((taxableAmount * (cleanTaxRate / 100)) * 100) / 100;
    const finalTotal = Math.round((taxableAmount + calculatedTax) * 100) / 100;

    const invoiceNumber = generateInvoiceNumber();

    // Insert sales record
    const [saleInsert] = await conn.execute(
      `INSERT INTO sales 
        (invoice_number, cashier_id, sale_date, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status, status, notes)
       VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, 'PAID', 'COMPLETED', ?)`,
      [invoiceNumber, cashierId, subtotal, cleanDiscount, calculatedTax, finalTotal, paymentMethod, notes || null]
    );
    const saleId = saleInsert.insertId;

    // Insert sale items, deduct stock, and log stock movements
    for (const item of computedSaleItems) {
      await conn.execute(
        `INSERT INTO sale_items 
          (sale_id, product_id, quantity, unit_price, unit_cost, discount_amount, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [saleId, item.product_id, item.quantity, item.unit_price, item.unit_cost, item.discount_amount, item.line_total]
      );

      // Stock deduction
      await conn.execute(
        `UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?`,
        [item.quantity, item.product_id]
      );

      // Stock movement record
      await conn.execute(
        `INSERT INTO stock_movements
          (product_id, user_id, movement_type, quantity_change, previous_quantity, new_quantity, reference_type, reference_id, reason, movement_date)
         VALUES (?, ?, 'SALE', ?, ?, ?, 'SALE', ?, ?, NOW())`,
        [item.product_id, cashierId, -item.quantity, item.prevStock, item.newStock, invoiceNumber, `POS Checkout Invoice #${invoiceNumber}`]
      );
    }

    const receiptData = {
      sale_id: saleId,
      invoice_number: invoiceNumber,
      cashier_id: cashierId,
      sale_date: new Date().toISOString(),
      subtotal,
      discount_amount: cleanDiscount,
      tax_amount: calculatedTax,
      total_amount: finalTotal,
      payment_method: paymentMethod,
      payment_status: 'PAID',
      status: 'COMPLETED',
      notes,
      items: computedSaleItems.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        sku: i.sku,
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.line_total
      }))
    };

    // Store idempotency key if provided
    if (idempotencyKey) {
      await conn.execute(
        `INSERT INTO idempotency_keys (idempotency_key, endpoint, response_body, created_at)
         VALUES (?, '/api/sales', ?, NOW())`,
        [idempotencyKey, JSON.stringify(receiptData)]
      );
    }

    return receiptData;
  });

  // Audit log outside transaction
  await logAudit({
    userId: cashierId,
    action: 'SALE_COMPLETED',
    entityType: 'SALES',
    entityId: result.sale_id,
    details: { invoice_number: result.invoice_number, total: result.total_amount, payment: result.payment_method },
    ipAddress
  });

  return result;
}

async function processRefund({ saleId, userId, reason, ipAddress = null }) {
  const result = await withTransaction(async (conn) => {
    // 1. Lock sale row
    const [sales] = await conn.execute(
      `SELECT * FROM sales WHERE sale_id = ? FOR UPDATE`,
      [saleId]
    );

    if (sales.length === 0) {
      const err = new Error('Sales transaction not found');
      err.statusCode = 404;
      err.isPublic = true;
      throw err;
    }

    const sale = sales[0];
    if (sale.status === 'REFUNDED') {
      const err = new Error('This transaction has already been refunded');
      err.statusCode = 400;
      err.isPublic = true;
      throw err;
    }

    // 2. Fetch sale items
    const [items] = await conn.execute(
      `SELECT si.*, p.stock_quantity, p.product_name 
       FROM sale_items si
       JOIN products p ON si.product_id = p.product_id
       WHERE si.sale_id = ?`,
      [saleId]
    );

    // 3. Mark sale as refunded
    await conn.execute(
      `UPDATE sales SET status = 'REFUNDED', payment_status = 'REFUNDED' WHERE sale_id = ?`,
      [saleId]
    );

    // 4. Return stock and record stock movements
    for (const item of items) {
      const prevQty = item.stock_quantity;
      const newQty = prevQty + item.quantity;

      await conn.execute(
        `UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?`,
        [item.quantity, item.product_id]
      );

      await conn.execute(
        `INSERT INTO stock_movements
          (product_id, user_id, movement_type, quantity_change, previous_quantity, new_quantity, reference_type, reference_id, reason, movement_date)
         VALUES (?, ?, 'RETURN', ?, ?, ?, 'REFUND', ?, ?, NOW())`,
        [item.product_id, userId, item.quantity, prevQty, newQty, sale.invoice_number, `Refund/Return for Invoice #${sale.invoice_number}: ${reason}`]
      );
    }

    // 5. Insert returns_refunds record
    const [refundInsert] = await conn.execute(
      `INSERT INTO returns_refunds (sale_id, processed_by, refund_amount, reason, refund_date)
       VALUES (?, ?, ?, ?, NOW())`,
      [saleId, userId, sale.total_amount, reason]
    );

    return {
      refund_id: refundInsert.insertId,
      sale_id: saleId,
      invoice_number: sale.invoice_number,
      refund_amount: sale.total_amount,
      status: 'REFUNDED'
    };
  });

  await logAudit({
    userId,
    action: 'SALE_REFUNDED',
    entityType: 'SALES',
    entityId: saleId,
    details: { reason, amount: result.refund_amount },
    ipAddress
  });

  return result;
}

module.exports = {
  processCheckout,
  processRefund,
  generateInvoiceNumber
};
