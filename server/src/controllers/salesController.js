const { pool } = require('../config/db');
const { processCheckout, processRefund } = require('../services/salesService');
const { success, error } = require('../utils/apiResponse');

async function createSale(req, res, next) {
  try {
    const { items, payment_method, discount_amount, tax_rate, notes, idempotency_key } = req.body;

    const receipt = await processCheckout({
      cashierId: req.user.user_id,
      items,
      paymentMethod: payment_method,
      discountAmount: discount_amount,
      taxRate: tax_rate,
      notes,
      idempotencyKey: idempotency_key,
      ipAddress: req.ip
    });

    return success(res, receipt, 'Sale completed successfully. Receipt generated.', 201);
  } catch (err) {
    next(err);
  }
}

async function getSales(req, res, next) {
  try {
    const { invoice, start_date, end_date, cashier_id, payment_method, status, page = 1, limit = 50 } = req.query;

    let whereClauses = [];
    const params = [];

    // Cashiers can only view their own sales unless they are Admin
    if (req.user.role === 'CASHIER') {
      whereClauses.push('s.cashier_id = ?');
      params.push(req.user.user_id);
    } else if (cashier_id) {
      whereClauses.push('s.cashier_id = ?');
      params.push(cashier_id);
    }

    if (invoice) {
      whereClauses.push('s.invoice_number LIKE ?');
      params.push(`%${invoice}%`);
    }

    if (start_date) {
      whereClauses.push('DATE(s.sale_date) >= ?');
      params.push(start_date);
    }

    if (end_date) {
      whereClauses.push('DATE(s.sale_date) <= ?');
      params.push(end_date);
    }

    if (payment_method) {
      whereClauses.push('s.payment_method = ?');
      params.push(payment_method);
    }

    if (status) {
      whereClauses.push('s.status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total FROM sales s ${whereSql}
    `, params);

    const total = countResult[0].total;

    const queryParams = [...params, parseInt(limit, 10), offset];
    const [sales] = await pool.query(`
      SELECT 
        s.sale_id,
        s.invoice_number,
        s.cashier_id,
        u.full_name AS cashier_name,
        s.sale_date,
        s.subtotal,
        s.discount_amount,
        s.tax_amount,
        s.total_amount,
        s.payment_method,
        s.payment_status,
        s.status,
        s.notes,
        COUNT(si.sale_item_id) AS total_items_count
      FROM sales s
      JOIN users u ON s.cashier_id = u.user_id
      LEFT JOIN sale_items si ON s.sale_id = si.sale_id
      ${whereSql}
      GROUP BY s.sale_id
      ORDER BY s.sale_date DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    return success(res, sales, 'Sales records retrieved', 200, {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (err) {
    next(err);
  }
}

async function getSaleById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    const [sales] = await pool.execute(`
      SELECT 
        s.*,
        u.full_name AS cashier_name,
        u.email AS cashier_email
      FROM sales s
      JOIN users u ON s.cashier_id = u.user_id
      WHERE s.sale_id = ?
    `, [id]);

    if (sales.length === 0) {
      return error(res, 'Sale transaction not found', 404);
    }

    const sale = sales[0];

    // Cashier authorization check
    if (req.user.role === 'CASHIER' && sale.cashier_id !== req.user.user_id) {
      return error(res, 'Forbidden: You are not authorized to view sales from other cashiers', 403);
    }

    const [items] = await pool.execute(`
      SELECT 
        si.*,
        p.product_name,
        p.sku,
        p.barcode,
        c.category_name
      FROM sale_items si
      JOIN products p ON si.product_id = p.product_id
      JOIN categories c ON p.category_id = c.category_id
      WHERE si.sale_id = ?
    `, [id]);

    // Check if refund exists
    const [refunds] = await pool.execute(`
      SELECT r.*, u.full_name as processed_by_name
      FROM returns_refunds r
      JOIN users u ON r.processed_by = u.user_id
      WHERE r.sale_id = ?
    `, [id]);

    return success(res, {
      sale,
      items,
      refund: refunds.length > 0 ? refunds[0] : null
    }, 'Sale details retrieved');
  } catch (err) {
    next(err);
  }
}

async function getReceipt(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    const [sales] = await pool.execute(`
      SELECT 
        s.*,
        u.full_name AS cashier_name
      FROM sales s
      JOIN users u ON s.cashier_id = u.user_id
      WHERE s.sale_id = ?
    `, [id]);

    if (sales.length === 0) {
      return error(res, 'Sale not found', 404);
    }

    const sale = sales[0];

    const [items] = await pool.execute(`
      SELECT 
        si.quantity,
        si.unit_price,
        si.discount_amount,
        si.line_total,
        p.product_name,
        p.sku
      FROM sale_items si
      JOIN products p ON si.product_id = p.product_id
      WHERE si.sale_id = ?
    `, [id]);

    const receipt = {
      storeName: 'FreshMart Superstore',
      storeAddress: '100 Central Boulevard, Commerce District',
      storePhone: '+1 (800) 555-7382',
      invoiceNumber: sale.invoice_number,
      saleDate: sale.sale_date,
      cashierName: sale.cashier_name,
      subtotal: parseFloat(sale.subtotal),
      discountAmount: parseFloat(sale.discount_amount),
      taxAmount: parseFloat(sale.tax_amount),
      totalAmount: parseFloat(sale.total_amount),
      paymentMethod: sale.payment_method,
      paymentStatus: sale.payment_status,
      status: sale.status,
      items: items.map(item => ({
        productName: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price),
        lineTotal: parseFloat(item.line_total)
      }))
    };

    return success(res, receipt, 'Receipt data formatted for printing');
  } catch (err) {
    next(err);
  }
}

async function refundSale(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { reason } = req.body;

    const result = await processRefund({
      saleId: id,
      userId: req.user.user_id,
      reason,
      ipAddress: req.ip
    });

    return success(res, result, 'Sale refunded successfully. Stock returned to inventory.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSale,
  getSales,
  getSaleById,
  getReceipt,
  refundSale
};
