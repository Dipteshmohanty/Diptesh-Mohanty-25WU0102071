import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import PrintReceiptModal from '../components/PrintReceiptModal';
import Modal from '../components/Modal';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Printer,
  RotateCcw,
  Loader2,
  Calendar,
  CreditCard
} from 'lucide-react';

export default function SalesPage() {
  const { success, error } = useToast();
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetails, setSaleDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [receiptToPrint, setReceiptToPrint] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Refund Modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    try {
      let q = '/sales?limit=100';
      if (invoiceSearch) q += `&invoice=${encodeURIComponent(invoiceSearch)}`;
      if (paymentFilter) q += `&payment_method=${paymentFilter}`;
      if (statusFilter) q += `&status=${statusFilter}`;
      if (startDate) q += `&start_date=${startDate}`;
      if (endDate) q += `&end_date=${endDate}`;

      const res = await api.get(q);
      if (res.success) setSales(res.data);
    } catch (err) {
      error(err.message || 'Failed to fetch sales history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [invoiceSearch, paymentFilter, statusFilter, startDate, endDate]);

  const handleOpenDetails = async (sale) => {
    setSelectedSale(sale);
    setShowDetailsModal(true);
    try {
      const res = await api.get(`/sales/${sale.sale_id}`);
      if (res.success) setSaleDetails(res.data);
    } catch (err) {
      error('Failed to load transaction line items');
    }
  };

  const handleReprint = async (sale) => {
    try {
      const res = await api.get(`/sales/${sale.sale_id}/receipt`);
      if (res.success) {
        setReceiptToPrint(res.data);
        setShowReceiptModal(true);
      }
    } catch (err) {
      error('Failed to load printable receipt');
    }
  };

  const handleOpenRefund = (sale) => {
    setSelectedSale(sale);
    setRefundReason('');
    setShowRefundModal(true);
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundReason || refundReason.trim().length < 5) {
      error('Please provide an authorized refund reason (min 5 characters)');
      return;
    }
    setRefunding(true);
    try {
      const res = await api.post(`/sales/${selectedSale.sale_id}/refund`, {
        reason: refundReason.trim()
      });
      if (res.success) {
        success('Transaction refunded and products returned to inventory');
        setShowRefundModal(false);
        fetchSales();
      }
    } catch (err) {
      error(err.message || 'Refund processing failed');
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sales & Billing Records</h2>
          <p className="text-sm text-slate-500">Comprehensive immutable sales ledger, invoices, and authorized refunds</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            placeholder="Search invoice number..."
            className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
          >
            <option value="">All Payment Modes</option>
            <option value="CASH">CASH</option>
            <option value="CARD">CARD</option>
            <option value="UPI">UPI</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>

        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
            title="Start Date"
          />
        </div>

        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
            title="End Date"
          />
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading sales ledger...</span>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No sales transactions found matching filters.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.sale_id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs">
                      {s.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                      {new Date(s.sale_date).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {s.cashier_name}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-slate-600 font-medium">
                      {s.total_items_count} items
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                        {s.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${parseFloat(s.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          s.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenDetails(s)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="View Line Items"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReprint(s)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Print / Reprint Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {isAdmin && s.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleOpenRefund(s)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Authorize Return / Refund"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Details Modal */}
      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Invoice Details" maxWidth="max-w-xl">
        {selectedSale && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-mono font-bold text-slate-900">{selectedSale.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span>{new Date(selectedSale.sale_date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span className="font-medium text-slate-900">{selectedSale.cashier_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold">{selectedSale.payment_method}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Purchased Products</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left">
                    <th className="pb-1 font-semibold">Item</th>
                    <th className="pb-1 text-center font-semibold">Qty</th>
                    <th className="pb-1 text-right font-semibold">Price</th>
                    <th className="pb-1 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {saleDetails?.items?.map((item) => (
                    <tr key={item.sale_item_id} className="py-2">
                      <td className="py-2 font-medium text-slate-900">
                        {item.product_name}
                        <span className="block text-[10px] text-slate-400 font-mono">{item.sku}</span>
                      </td>
                      <td className="py-2 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-2 text-right text-slate-600">${parseFloat(item.unit_price).toFixed(2)}</td>
                      <td className="py-2 text-right font-bold text-slate-900">${parseFloat(item.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-200 text-xs space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${parseFloat(selectedSale.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(selectedSale.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-${parseFloat(selectedSale.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${parseFloat(selectedSale.tax_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Amount:</span>
                <span>${parseFloat(selectedSale.total_amount).toFixed(2)}</span>
              </div>
            </div>

            {saleDetails?.refund && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <div className="font-bold">Refunded On {new Date(saleDetails.refund.refund_date).toLocaleString()}</div>
                <div>Reason: {saleDetails.refund.reason}</div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleReprint(selectedSale)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Authorized Refund Modal */}
      <Modal isOpen={showRefundModal} onClose={() => setShowRefundModal(false)} title="Authorize Transaction Refund" maxWidth="max-w-md">
        <form onSubmit={handleRefundSubmit} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <strong>Audit Warning:</strong> Processing this refund will automatically return all line items back into product inventory stock and log a RETURN stock movement.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Refund Reason (Mandatory Audit Trail) *
            </label>
            <textarea
              required
              rows="3"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Customer returned unopened items within 24 hours with receipt..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowRefundModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={refunding}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs transition disabled:opacity-50"
            >
              {refunding ? 'Processing...' : 'Confirm Refund & Restock'}
            </button>
          </div>
        </form>
      </Modal>

      <PrintReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={receiptToPrint}
      />
    </div>
  );
}
