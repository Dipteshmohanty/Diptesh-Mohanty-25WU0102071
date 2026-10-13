const { pool } = require('../config/db');

/**
 * Get dashboard overview KPI numbers for Admin
 */
async function getDashboardOverview() {
  // Today's sales KPI
  const [todaySales] = await pool.execute(`
    SELECT 
      COUNT(*) AS today_orders_count,
      COALESCE(SUM(total_amount), 0) AS today_revenue
    FROM sales
    WHERE DATE(sale_date) = CURDATE() AND status = 'COMPLETED'
  `);

  // Overall sales and profit
  const [overallFinancials] = await pool.execute(`
    SELECT 
      COALESCE(SUM(s.total_amount), 0) AS total_revenue,
      COALESCE(SUM(si.quantity * si.unit_cost), 0) AS total_cogs,
      COUNT(DISTINCT s.sale_id) AS total_transactions
    FROM sales s
    LEFT JOIN sale_items si ON s.sale_id = si.sale_id
    WHERE s.status = 'COMPLETED'
  `);

  // Product and stock KPIs
  const [productKpis] = await pool.execute(`
    SELECT 
      COUNT(*) AS total_products,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_products,
      COALESCE(SUM(stock_quantity), 0) AS total_stock_units,
      COALESCE(SUM(CASE WHEN is_active = 1 AND stock_quantity <= reorder_level AND stock_quantity > 0 THEN 1 ELSE 0 END), 0) AS low_stock_count,
      COALESCE(SUM(CASE WHEN is_active = 1 AND stock_quantity = 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_count,
      COALESCE(SUM(stock_quantity * cost_price), 0) AS inventory_valuation
    FROM products
  `);

  // Recent 5 sales
  const [recentSales] = await pool.execute(`
    SELECT s.sale_id, s.invoice_number, s.total_amount, s.payment_method, s.sale_date, s.status, u.full_name AS cashier_name
    FROM sales s
    JOIN users u ON s.cashier_id = u.user_id
    ORDER BY s.sale_date DESC
    LIMIT 5
  `);

  // Recent low stock items
  const [urgentLowStock] = await pool.execute(`
    SELECT p.product_id, p.sku, p.product_name, p.stock_quantity, p.reorder_level, c.category_name
    FROM products p
    JOIN categories c ON p.category_id = c.category_id
    WHERE p.is_active = 1 AND p.stock_quantity <= p.reorder_level
    ORDER BY p.stock_quantity ASC
    LIMIT 6
  `);

  // 7-day sales trend for Recharts
  const [salesTrend] = await pool.execute(`
    SELECT 
      DATE_FORMAT(d.dt, '%Y-%m-%d') AS date,
      COALESCE(SUM(s.total_amount), 0) AS revenue,
      COALESCE(SUM(si.quantity * si.unit_cost), 0) AS cost,
      COALESCE(SUM(s.total_amount) - SUM(si.quantity * si.unit_cost), 0) AS profit,
      COUNT(DISTINCT s.sale_id) AS orders
    FROM (
      SELECT CURDATE() - INTERVAL (a.a + (10 * b.a)) DAY AS dt
      FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) AS a
      CROSS JOIN (SELECT 0 AS a) AS b
    ) d
    LEFT JOIN sales s ON DATE(s.sale_date) = d.dt AND s.status = 'COMPLETED'
    LEFT JOIN sale_items si ON s.sale_id = si.sale_id
    GROUP BY d.dt
    ORDER BY d.dt ASC
  `);

  const revenue = parseFloat(overallFinancials[0].total_revenue || 0);
  const cogs = parseFloat(overallFinancials[0].total_cogs || 0);
  const profit = Math.round((revenue - cogs) * 100) / 100;

  return {
    kpis: {
      todayRevenue: parseFloat(todaySales[0].today_revenue),
      todayOrders: parseInt(todaySales[0].today_orders_count, 10),
      totalRevenue: revenue,
      totalCost: cogs,
      totalProfit: profit,
      totalTransactions: parseInt(overallFinancials[0].total_transactions, 10),
      totalProducts: parseInt(productKpis[0].total_products, 10),
      activeProducts: parseInt(productKpis[0].active_products, 10),
      totalStockUnits: parseInt(productKpis[0].total_stock_units, 10),
      lowStockCount: parseInt(productKpis[0].low_stock_count, 10),
      outOfStockCount: parseInt(productKpis[0].out_of_stock_count, 10),
      inventoryValuation: parseFloat(productKpis[0].inventory_valuation)
    },
    salesTrend,
    recentSales,
    urgentLowStock
  };
}

/**
 * Filtered Sales Report (with date range)
 */
async function getSalesReport({ startDate, endDate, cashierId, paymentMethod }) {
  let whereClauses = ["s.status = 'COMPLETED'"];
  const params = [];

  if (startDate) {
    whereClauses.push("DATE(s.sale_date) >= ?");
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push("DATE(s.sale_date) <= ?");
    params.push(endDate);
  }
  if (cashierId) {
    whereClauses.push("s.cashier_id = ?");
    params.push(cashierId);
  }
  if (paymentMethod) {
    whereClauses.push("s.payment_method = ?");
    params.push(paymentMethod);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const [sales] = await pool.execute(`
    SELECT 
      s.sale_id,
      s.invoice_number,
      s.sale_date,
      s.subtotal,
      s.discount_amount,
      s.tax_amount,
      s.total_amount,
      s.payment_method,
      s.status,
      u.full_name AS cashier_name,
      COALESCE(SUM(si.quantity * si.unit_cost), 0) AS total_cost,
      (s.total_amount - COALESCE(SUM(si.quantity * si.unit_cost), 0)) AS profit
    FROM sales s
    JOIN users u ON s.cashier_id = u.user_id
    LEFT JOIN sale_items si ON s.sale_id = si.sale_id
    ${whereSql}
    GROUP BY s.sale_id
    ORDER BY s.sale_date DESC
  `, params);

  // Aggregated summary
  let totalRevenue = 0;
  let totalCost = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  for (const s of sales) {
    totalRevenue += parseFloat(s.total_amount);
    totalCost += parseFloat(s.total_cost);
    totalDiscount += parseFloat(s.discount_amount);
    totalTax += parseFloat(s.tax_amount);
  }

  const grossProfit = Math.round((totalRevenue - totalCost) * 100) / 100;

  return {
    summary: {
      count: sales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      grossProfit,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      profitMarginPercent: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0
    },
    sales
  };
}

/**
 * Top selling products report
 */
async function getTopProductsReport({ limit = 10, startDate, endDate }) {
  let dateFilter = '';
  const params = [];
  if (startDate && endDate) {
    dateFilter = 'AND DATE(s.sale_date) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  params.push(parseInt(limit, 10));

  const [rows] = await pool.execute(`
    SELECT 
      p.product_id,
      p.sku,
      p.product_name,
      c.category_name,
      COALESCE(SUM(si.quantity), 0) AS total_quantity_sold,
      COALESCE(SUM(si.line_total), 0) AS total_revenue,
      COALESCE(SUM(si.quantity * si.unit_cost), 0) AS total_cost,
      COALESCE(SUM(si.line_total - (si.quantity * si.unit_cost)), 0) AS gross_profit
    FROM products p
    JOIN categories c ON p.category_id = c.category_id
    JOIN sale_items si ON p.product_id = si.product_id
    JOIN sales s ON si.sale_id = s.sale_id
    WHERE s.status = 'COMPLETED' ${dateFilter}
    GROUP BY p.product_id
    ORDER BY total_quantity_sold DESC
    LIMIT ?
  `, params);

  return rows;
}

/**
 * Sales by category report
 */
async function getSalesByCategoryReport() {
  const [rows] = await pool.execute(`
    SELECT 
      c.category_id,
      c.category_name,
      COUNT(DISTINCT p.product_id) AS total_products,
      COALESCE(SUM(si.quantity), 0) AS items_sold,
      COALESCE(SUM(si.line_total), 0) AS total_revenue
    FROM categories c
    LEFT JOIN products p ON c.category_id = p.category_id
    LEFT JOIN sale_items si ON p.product_id = si.product_id
    LEFT JOIN sales s ON si.sale_id = s.sale_id AND s.status = 'COMPLETED'
    GROUP BY c.category_id
    ORDER BY total_revenue DESC
  `);

  return rows;
}

/**
 * Inventory Valuation report
 */
async function getInventoryValuationReport() {
  const [items] = await pool.execute(`
    SELECT 
      p.product_id,
      p.sku,
      p.product_name,
      c.category_name,
      p.stock_quantity,
      p.cost_price,
      p.selling_price,
      (p.stock_quantity * p.cost_price) AS total_cost_value,
      (p.stock_quantity * p.selling_price) AS total_retail_value,
      ((p.stock_quantity * p.selling_price) - (p.stock_quantity * p.cost_price)) AS potential_profit
    FROM products p
    JOIN categories c ON p.category_id = c.category_id
    WHERE p.is_active = 1
    ORDER BY total_cost_value DESC
  `);

  let totalCostVal = 0;
  let totalRetailVal = 0;
  let totalUnits = 0;

  for (const item of items) {
    totalCostVal += parseFloat(item.total_cost_value);
    totalRetailVal += parseFloat(item.total_retail_value);
    totalUnits += parseInt(item.stock_quantity, 10);
  }

  return {
    summary: {
      totalProducts: items.length,
      totalUnits,
      totalCostValue: Math.round(totalCostVal * 100) / 100,
      totalRetailValue: Math.round(totalRetailVal * 100) / 100,
      potentialGrossProfit: Math.round((totalRetailVal - totalCostVal) * 100) / 100
    },
    items
  };
}

module.exports = {
  getDashboardOverview,
  getSalesReport,
  getTopProductsReport,
  getSalesByCategoryReport,
  getInventoryValuationReport
};
