import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  Boxes,
  ArrowRight,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function AdminDashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/dashboard');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading live retail analytics...</span>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const trend = data?.salesTrend || [];
  const recentSales = data?.recentSales || [];
  const lowStock = data?.urgentLowStock || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Store Dashboard</h2>
          <p className="text-sm text-slate-500">Real-time telemetry, transaction flows, and stock thresholds</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('pos')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center gap-2 transition"
          >
            <ShoppingBag className="w-4 h-4" />
            Open POS Register
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">${kpis.todayRevenue?.toFixed(2) || '0.00'}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-emerald-600">{kpis.todayOrders || 0}</span> orders completed today
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Profit</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">${kpis.totalProfit?.toFixed(2) || '0.00'}</div>
          <div className="text-xs text-slate-500 mt-1">
            Revenue: <span className="font-medium text-slate-700">${kpis.totalRevenue?.toFixed(2) || '0.00'}</span>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Low Stock Alerts</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpis.lowStockCount || 0}</div>
          <div className="text-xs text-slate-500 mt-1">
            <span className="font-semibold text-rose-600">{kpis.outOfStockCount || 0}</span> items out of stock
          </div>
        </div>

        {/* Active Products & Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inventory Valuation</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">${kpis.inventoryValuation?.toFixed(2) || '0.00'}</div>
          <div className="text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">{kpis.totalStockUnits || 0}</span> total units in stock
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">7-Day Sales & Profit Trajectory</h3>
            <p className="text-xs text-slate-500">Revenue versus calculated historical cost</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-600" />
              <span className="text-slate-600">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Profit</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tickLine={false} stroke="#94a3b8" fontSize={11} />
              <YAxis tickLine={false} stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `$${val}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(val) => [`$${Number(val).toFixed(2)}`]}
              />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Section: Recent Transactions & Urgent Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
              <button
                onClick={() => onNavigate('sales')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentSales.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No recent transactions recorded</p>
              ) : (
                recentSales.map((sale) => (
                  <div key={sale.sale_id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold text-slate-900">{sale.invoice_number}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {sale.cashier_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">${parseFloat(sale.total_amount).toFixed(2)}</div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
                        {sale.payment_method}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Urgent Low Stock Alert List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Urgent Stock Replenishment</h3>
              <button
                onClick={() => onNavigate('purchases')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
              >
                Create PO <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {lowStock.length === 0 ? (
                <p className="text-sm text-emerald-600 py-6 text-center">All product stocks are currently healthy!</p>
              ) : (
                lowStock.map((prod) => (
                  <div key={prod.product_id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold text-slate-900">{prod.product_name}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {prod.sku} • {prod.category_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        prod.stock_quantity === 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {prod.stock_quantity === 0 ? 'OUT OF STOCK' : `${prod.stock_quantity} units left`}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-0.5">Threshold: {prod.reorder_level}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
