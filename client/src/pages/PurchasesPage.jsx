import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Truck, Plus, CheckCircle, Eye, Trash2, Loader2, ArrowRight } from 'lucide-react';

export default function PurchasesPage() {
  const { success, error } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState([
    { product_id: '', quantity: 10, unit_cost: 0.00 }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const [purchRes, suppRes, prodRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/suppliers'),
        api.get('/products?is_active=1&limit=200')
      ]);
      if (purchRes.success) setPurchases(purchRes.data);
      if (suppRes.success) setSuppliers(suppRes.data);
      if (prodRes.success) setProducts(prodRes.data);
    } catch (err) {
      error(err.message || 'Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleOpenCreate = () => {
    setSupplierId(suppliers[0]?.supplier_id || '');
    setNotes('');
    setPoItems([
      { product_id: products[0]?.product_id || '', quantity: 10, unit_cost: parseFloat(products[0]?.cost_price || 0) }
    ]);
    setShowCreateModal(true);
  };

  const handleProductChange = (index, prodId) => {
    const prod = products.find(p => String(p.product_id) === String(prodId));
    setPoItems(prev => {
      const updated = [...prev];
      updated[index].product_id = prodId;
      if (prod) {
        updated[index].unit_cost = parseFloat(prod.cost_price || 0);
      }
      return updated;
    });
  };

  const handleAddItem = () => {
    setPoItems(prev => [
      ...prev,
      { product_id: products[0]?.product_id || '', quantity: 10, unit_cost: parseFloat(products[0]?.cost_price || 0) }
    ]);
  };

  const handleRemoveItem = (index) => {
    setPoItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (poItems.length === 0) {
      error('Please add at least one product item');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        supplier_id: parseInt(supplierId, 10),
        items: poItems.map(i => ({
          product_id: parseInt(i.product_id, 10),
          quantity: parseInt(i.quantity, 10),
          unit_cost: parseFloat(i.unit_cost)
        })),
        notes
      };
      const res = await api.post('/purchases', payload);
      if (res.success) {
        success(`Purchase Order #${res.data.purchase_reference} created`);
        setShowCreateModal(false);
        fetchPurchases();
      }
    } catch (err) {
      error(err.message || 'Failed to create PO');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceivePurchase = async (purchase) => {
    if (!window.confirm(`Confirm receipt of Purchase Order #${purchase.purchase_reference}? This will automatically increase product inventory stock.`)) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/purchases/${purchase.purchase_id}/receive`);
      if (res.success) {
        success(`Shipment received! Stock levels updated.`);
        fetchPurchases();
      }
    } catch (err) {
      error(err.message || 'Failed to receive purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetails = async (p) => {
    try {
      const res = await api.get(`/purchases/${p.purchase_id}`);
      if (res.success) {
        setSelectedPurchase(res.data);
        setShowDetailsModal(true);
      }
    } catch (err) {
      error('Failed to load purchase order details');
    }
  };

  const computedPoTotal = poItems.reduce((acc, i) => acc + (parseFloat(i.unit_cost || 0) * (parseInt(i.quantity, 10) || 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Restocking & POs</h2>
          <p className="text-sm text-slate-500">Procure inventory from suppliers and record receiving dock deliveries</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Create Purchase Order
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">PO Reference</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Date Ordered</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading purchase orders...</span>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => {
                  const isReceived = p.status === 'RECEIVED';
                  return (
                    <tr key={p.purchase_id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                        {p.purchase_reference}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {p.supplier_name}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(p.purchase_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-slate-600 font-medium">
                        {p.item_count} items
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${parseFloat(p.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            isReceived
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenDetails(p)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          title="View PO Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isReceived && (
                          <button
                            onClick={() => handleReceivePurchase(p)}
                            disabled={actionLoading}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                          >
                            Receive Goods
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Order Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Purchase Order" maxWidth="max-w-2xl">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Supplier *</label>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              {suppliers.map(s => (
                <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">Order Product Line Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-60 overflow-y-auto">
              {poItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.product_id}
                    onChange={(e) => handleProductChange(idx, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    required
                  >
                    {products.map(p => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.product_name} ({p.sku})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setPoItems(prev => {
                        const copy = [...prev];
                        copy[idx].quantity = val;
                        return copy;
                      });
                    }}
                    className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center"
                    required
                  />

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Cost"
                    value={item.unit_cost}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setPoItems(prev => {
                        const copy = [...prev];
                        copy[idx].unit_cost = val;
                        return copy;
                      });
                    }}
                    className="w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={poItems.length === 1}
                    className="p-1.5 text-slate-300 hover:text-rose-600 disabled:opacity-20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2 text-sm">
            <span className="font-semibold text-slate-600">Calculated PO Total:</span>
            <span className="text-base font-bold text-slate-900">${computedPoTotal.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Standard 7-day payment terms, urgent delivery"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition disabled:opacity-50"
            >
              {submitting ? 'Submitting PO...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Purchase Details Modal */}
      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Purchase Order Details" maxWidth="max-w-xl">
        {selectedPurchase && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">PO Reference:</span>
                <span className="font-mono font-bold text-slate-900">{selectedPurchase.purchase?.purchase_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier:</span>
                <span className="font-bold text-slate-900">{selectedPurchase.purchase?.supplier_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                  selectedPurchase.purchase?.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedPurchase.purchase?.status}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Ordered Items</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left">
                    <th className="pb-1 font-semibold">Product</th>
                    <th className="pb-1 text-center font-semibold">Qty</th>
                    <th className="pb-1 text-right font-semibold">Unit Cost</th>
                    <th className="pb-1 text-right font-semibold">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPurchase.items?.map((item) => (
                    <tr key={item.purchase_item_id} className="py-2">
                      <td className="py-2 font-medium text-slate-900">{item.product_name}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">${parseFloat(item.unit_cost).toFixed(2)}</td>
                      <td className="py-2 text-right font-bold">${parseFloat(item.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
