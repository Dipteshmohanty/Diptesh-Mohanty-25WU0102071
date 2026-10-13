import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import {
  Boxes,
  Plus,
  AlertTriangle,
  ArrowDownUp,
  PackageCheck,
  TrendingDown,
  RotateCcw,
  Loader2,
  Filter
} from 'lucide-react';

export default function InventoryPage() {
  const { success, error } = useToast();
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  // Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [productId, setProductId] = useState('');
  const [movementType, setMovementType] = useState('DAMAGE');
  const [quantityChange, setQuantityChange] = useState(-1);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let movQuery = '/inventory/movements?limit=100';
      if (typeFilter) movQuery += `&movement_type=${typeFilter}`;

      const [sumRes, movRes, prodRes] = await Promise.all([
        api.get('/inventory/summary'),
        api.get(movQuery),
        api.get('/products?is_active=1&limit=200')
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (movRes.success) setMovements(movRes.data);
      if (prodRes.success) setProducts(prodRes.data);
    } catch (err) {
      error(err.message || 'Failed to fetch inventory records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [typeFilter]);

  const handleOpenAdjust = () => {
    setProductId(products[0]?.product_id || '');
    setMovementType('DAMAGE');
    setQuantityChange(-1);
    setReason('');
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      error('A mandatory detailed reason of at least 5 characters is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/inventory/adjustments', {
        product_id: parseInt(productId, 10),
        movement_type: movementType,
        quantity_change: parseInt(quantityChange, 10),
        reason: reason.trim()
      });

      if (res.success) {
        success('Stock adjustment and movement record logged');
        setShowAdjustModal(false);
        fetchInventory();
      }
    } catch (err) {
      error(err.message || 'Stock adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Movements & Auditing</h2>
          <p className="text-sm text-slate-500">Record manual inventory shrinkages, returns, and track transaction ledgers</p>
        </div>
        <button
          onClick={handleOpenAdjust}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center gap-2 transition"
        >
          <ArrowDownUp className="w-4 h-4" />
          Record Stock Adjustment
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Units</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{summary?.total_units || 0}</div>
          <div className="text-xs text-slate-400 mt-0.5">{summary?.total_products || 0} unique items</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Low Stock Items</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{summary?.low_stock_count || 0}</div>
          <div className="text-xs text-slate-400 mt-0.5">Below reorder trigger</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Out of Stock</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{summary?.out_of_stock_count || 0}</div>
          <div className="text-xs text-slate-400 mt-0.5">Critical zero stock items</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cost Valuation</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ${parseFloat(summary?.total_inventory_cost_value || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Wholesale cost basis</div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-900">Stock Movement Audit Trail</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="">All Movement Types</option>
              <option value="PURCHASE">PURCHASE</option>
              <option value="SALE">SALE</option>
              <option value="DAMAGE">DAMAGE</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="RETURN">RETURN</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-center">Type</th>
                <th className="py-3 px-4 text-right">Change</th>
                <th className="py-3 px-4 text-center">Balance</th>
                <th className="py-3 px-4">Reason / Reference</th>
                <th className="py-3 px-4">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading movements ledger...</span>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No movements recorded matching the filter.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.movement_id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                      {new Date(m.movement_date).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {m.product_name}
                      <span className="block text-[10px] text-slate-400 font-mono">{m.sku}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        m.movement_type === 'PURCHASE' ? 'bg-emerald-100 text-emerald-800' :
                        m.movement_type === 'SALE' ? 'bg-indigo-100 text-indigo-800' :
                        m.movement_type === 'RETURN' ? 'bg-purple-100 text-purple-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {m.movement_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={m.quantity_change > 0 ? 'text-emerald-600' : 'text-slate-900'}>
                        {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-mono text-slate-500">
                      {m.previous_quantity} → <span className="font-bold text-slate-900">{m.new_quantity}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {m.reason || m.reference_id}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {m.user_name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjustment Modal */}
      <Modal isOpen={showAdjustModal} onClose={() => setShowAdjustModal(false)} title="Record Stock Adjustment" maxWidth="max-w-lg">
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product *</label>
            <select
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700"
            >
              {products.map(p => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name} (Current Stock: {p.stock_quantity})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Movement Type *</label>
              <select
                required
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700"
              >
                <option value="DAMAGE">DAMAGE (Broken / Defective)</option>
                <option value="EXPIRED">EXPIRED (Past Date)</option>
                <option value="RETURN">RETURN (Restocked)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (Audit Correction)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity Change (+ or -) *</label>
              <input
                type="number"
                required
                value={quantityChange}
                onChange={(e) => setQuantityChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
              <span className="text-[10px] text-slate-400">Use negative for loss (e.g. -2)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mandatory Audit Reason (min 5 characters) *
            </label>
            <textarea
              required
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Dropped during stock replenishment, seal was broken..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdjustModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Commit Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
