const reportService = require('../services/reportService');
const { pool } = require('../config/db');
const { success } = require('../utils/apiResponse');

async function getDashboard(req, res, next) {
  try {
    const data = await reportService.getDashboardOverview();
    return success(res, data, 'Dashboard overview metrics retrieved');
  } catch (err) {
    next(err);
  }
}

async function getSales(req, res, next) {
  try {
    const { start_date, end_date, cashier_id, payment_method } = req.query;
    const data = await reportService.getSalesReport({
      startDate: start_date,
      endDate: end_date,
      cashierId: cashier_id,
      paymentMethod: payment_method
    });
    return success(res, data, 'Sales report generated');
  } catch (err) {
    next(err);
  }
}

async function getTopProducts(req, res, next) {
  try {
    const { limit = 10, start_date, end_date } = req.query;
    const data = await reportService.getTopProductsReport({
      limit,
      startDate: start_date,
      endDate: end_date
    });
    return success(res, data, 'Top selling products report generated');
  } catch (err) {
    next(err);
  }
}

async function getCategories(req, res, next) {
  try {
    const data = await reportService.getSalesByCategoryReport();
    return success(res, data, 'Category sales report generated');
  } catch (err) {
    next(err);
  }
}

async function getValuation(req, res, next) {
  try {
    const data = await reportService.getInventoryValuationReport();
    return success(res, data, 'Inventory valuation report generated');
  } catch (err) {
    next(err);
  }
}

async function getCashierPerformance(req, res, next) {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        u.user_id,
        u.full_name,
        u.email,
        COUNT(s.sale_id) AS total_transactions,
        COALESCE(SUM(s.total_amount), 0) AS total_revenue,
        COALESCE(AVG(s.total_amount), 0) AS average_basket_value
      FROM users u
      LEFT JOIN sales s ON u.user_id = s.cashier_id AND s.status = 'COMPLETED'
      WHERE u.role = 'CASHIER'
      GROUP BY u.user_id
      ORDER BY total_revenue DESC
    `);
    return success(res, rows, 'Cashier performance report retrieved');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  getSales,
  getTopProducts,
  getCategories,
  getValuation,
  getCashierPerformance
};
