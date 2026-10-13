import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Package,
  Layers,
  UserCheck,
  Loader2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function ReportsPage() {
  const { error } = useToast();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Report Data States
  const [salesData, setSalesData] = useState({ summary: {}, sales: [] });
  const [topProducts, setTopProducts] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [valuationData, setValuationData] = useState({ summary: {}, items: [] });
  const [cashierData, setCashierData] = useState([]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let salesQuery = '/reports/sales';
      if (startDate || endDate) {
        salesQuery += `?start_date=${startDate}&end_date=${endDate}`;
      }

      let topQuery = '/reports/top-products?limit=15';
      if (startDate || endDate) {
        topQuery += `&start_date=${startDate}&end_date=${endDate}`;
      }

      const promises = [
        api.get(salesQuery).catch(() => ({ success: false })),
        api.get(topQuery).catch(() => ({ success: false })),
        api.get('/reports/categories').catch(() => ({ success: false })),
        api.get('/reports/inventory-valuation').catch(() => ({ success: false }))
      ];

      if (isAdmin) {
        promises.push(api.get('/reports/cashiers').catch(() => ({ success: false })));
      }

      const results = await Promise.all(promises);

      if (results[0]?.success) setSalesData(results[0].data);
      if (results[1]?.success) setTopProducts(results[1].data);
      if (results[2]?.success) setCategorySales(results[2].data);
      if (results[3]?.success) setValuationData(results[3].data);
      if (results[4]?.success) setCashierData(results[4].data);
    } catch (err) {
      error(err.message || 'Failed to fetch financial reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  // CSV Export utility
  const handleExportCSV = () => {
    let rows = [];
    let filename = `report_${activeTab}_${Date.now()}.csv`;

    if (activeTab === 'sales') {
      rows = [
        ['Invoice Number', 'Date', 'Cashier', 'Subtotal', 'Discount', 'Tax', 'Total Revenue', 'Cost', 'Gross Profit'],
        ...salesData.sales.map((s) => [
          s.invoice_number,
          s.sale_date,
          s.cashier_name,
          s.subtotal,
          s.discount_amount,
          s.tax_amount,
          s.total_amount,
          s.total_cost,
          s.profit
        ])
      ];
    } else if (activeTab === 'products') {
      rows = [
        ['Product Name', 'SKU', 'Category', 'Units Sold', 'Revenue', 'Cost', 'Gross Profit'],
        ...topProducts.map((p) => [
          p.product_name,
          p.sku,
          p.category_name,
          p.total_quantity_sold,
          p.total_revenue,
          p.total_cost,
          p.gross_profit
        ])
      ];
    } else if (activeTab === 'valuation') {
      rows = [
        ['Product Name', 'SKU', 'Category', 'Units in Stock', 'Cost Price', 'Selling Price', 'Total Cost Valuation', 'Retail Value', 'Potential Gross Profit'],
        ...valuationData.items.map((i) => [
          i.product_name,
          i.sku,
          i.category_name,
          i.stock_quantity,
          i.cost_price,
          i.selling_price,
          i.total_cost_value,
          i.total_retail_value,
          i.potential_profit
        ])
      ];
    }

    if (rows.length === 0) return;

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = salesData.summary || {};

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Financial & Performance Reports</h2>
          <p className="text-sm text-slate-500">True SQL aggregations strictly distinguishing revenue from cost of goods and profit</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-700"
              title="Start Date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-700"
              title="End Date"
            />
          </div>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${summary.totalRevenue?.toFixed(2) || '0.00'}</div>
          <div className="text-xs text-slate-400 mt-1">{summary.count || 0} completed orders</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cost of Goods (COGS)</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${summary.totalCost?.toFixed(2) || '0.00'}</div>
          <div className="text-xs text-slate-400 mt-1">Direct product acquisition costs</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">${summary.grossProfit?.toFixed(2) || '0.00'}</div>
          <div className="text-xs text-slate-400 mt-1">Revenue minus COGS</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Profit Margin</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{summary.profitMarginPercent?.toFixed(1) || '0.0'}%</div>
          <div className="text-xs text-slate-400 mt-1">Average profitability ratio</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'sales' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Detailed Sales Ledger
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'products' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Top Selling Products
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Category Distribution
        </button>
        <button
          onClick={() => setActiveTab('valuation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'valuation' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Inventory Valuation
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('cashiers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'cashiers' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cashier Performance
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <span>Generating financial calculations...</span>
        </div>
      ) : activeTab === 'sales' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  <th className="py-3 px-4 text-right">Cost (COGS)</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
                  <th className="py-3 px-4 text-center">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesData.sales?.map((s) => {
                  const rev = parseFloat(s.total_amount);
                  const cost = parseFloat(s.total_cost);
                  const prof = rev - cost;
                  const margin = rev > 0 ? (prof / rev) * 100 : 0;
                  return (
                    <tr key={s.sale_id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-xs text-slate-900">{s.invoice_number}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(s.sale_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-slate-700">{s.cashier_name}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">${rev.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-slate-500">${cost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">${prof.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center text-xs font-mono">{margin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'products' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Units Sold</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((p) => (
                  <tr key={p.product_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {p.product_name}
                      <span className="block text-[10px] text-slate-400 font-mono">{p.sku}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">{p.category_name}</td>
                    <td className="py-3 px-4 text-center font-bold text-indigo-600">{p.total_quantity_sold}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">${parseFloat(p.total_revenue).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-500">${parseFloat(p.total_cost).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">${parseFloat(p.gross_profit).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'categories' ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySales} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category_name" tickLine={false} stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                <YAxis tickLine={false} stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  formatter={(val) => [`$${Number(val).toFixed(2)}`, 'Revenue']}
                />
                <Bar dataKey="total_revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Products Count</th>
                  <th className="py-3 px-4 text-center">Units Sold</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categorySales.map((c) => (
                  <tr key={c.category_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.category_name}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{c.total_products}</td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-900">{c.items_sold}</td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-600">${parseFloat(c.total_revenue).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'valuation' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs bg-slate-50/50">
            <div>
              Total Products: <span className="font-bold text-slate-900">{valuationData.summary?.totalProducts || 0}</span> • Total Stock: <span className="font-bold text-slate-900">{valuationData.summary?.totalUnits || 0} units</span>
            </div>
            <div className="font-bold text-slate-900">
              Total Wholesale Value: <span className="text-indigo-600">${valuationData.summary?.totalCostValue?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4 text-center">Stock Units</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Total Cost Value</th>
                  <th className="py-3 px-4 text-right">Total Retail Value</th>
                  <th className="py-3 px-4 text-right">Potential Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {valuationData.items?.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {item.product_name}
                      <span className="block text-[10px] text-slate-400 font-mono">{item.sku}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">{item.stock_quantity}</td>
                    <td className="py-3 px-4 text-right text-slate-500">${parseFloat(item.cost_price).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-medium">${parseFloat(item.selling_price).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">${parseFloat(item.total_cost_value).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-600">${parseFloat(item.total_retail_value).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">${parseFloat(item.potential_profit).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'cashiers' && isAdmin ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Cashier Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Transactions Completed</th>
                  <th className="py-3 px-4 text-right">Average Basket Size</th>
                  <th className="py-3 px-4 text-right">Total Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashierData.map((c) => (
                  <tr key={c.user_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.full_name}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs font-mono">{c.email}</td>
                    <td className="py-3 px-4 text-center font-bold text-indigo-600">{c.total_transactions}</td>
                    <td className="py-3 px-4 text-right text-slate-600">${parseFloat(c.average_basket_value).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">${parseFloat(c.total_revenue).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
