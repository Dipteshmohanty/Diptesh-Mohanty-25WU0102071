import React from 'react';
import Modal from './Modal';
import { Printer, CheckCircle, Store } from 'lucide-react';

export default function PrintReceiptModal({ isOpen, onClose, receipt }) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = receipt.saleDate || receipt.sale_date
    ? new Date(receipt.saleDate || receipt.sale_date).toLocaleString()
    : new Date().toLocaleString();

  const invoiceNo = receipt.invoiceNumber || receipt.invoice_number;
  const cashier = receipt.cashierName || receipt.cashier_name || 'Counter Staff';
  const subtotal = Number(receipt.subtotal || 0).toFixed(2);
  const discount = Number(receipt.discountAmount || receipt.discount_amount || 0).toFixed(2);
  const tax = Number(receipt.taxAmount || receipt.tax_amount || 0).toFixed(2);
  const total = Number(receipt.totalAmount || receipt.total_amount || 0).toFixed(2);
  const payment = receipt.paymentMethod || receipt.payment_method || 'CASH';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Receipt" maxWidth="max-w-md">
      <div>
        {/* Printable Section */}
        <div id="printable-receipt" className="bg-white p-6 border border-dashed border-slate-300 rounded-xl font-mono text-sm text-slate-800">
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <div className="flex justify-center mb-1">
              <Store className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-base font-bold tracking-wider uppercase text-slate-900">FreshMart Retail Store</h2>
            <p className="text-xs text-slate-500">100 Central Boulevard, Commerce City</p>
            <p className="text-xs text-slate-500">Tel: +1 (800) 555-7382 • GSTIN: 27AABCF1234F1Z5</p>
          </div>

          <div className="py-3 border-b border-dashed border-slate-300 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice:</span>
              <span className="font-semibold text-slate-900">{invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{cashier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment:</span>
              <span className="font-bold text-slate-900">{payment}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-left border-b border-slate-200">
                  <th className="pb-1 font-semibold">Item</th>
                  <th className="pb-1 font-semibold text-center">Qty</th>
                  <th className="pb-1 font-semibold text-right">Price</th>
                  <th className="pb-1 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipt.items?.map((item, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="py-1.5 font-medium text-slate-800 truncate max-w-[140px]">
                      {item.productName || item.product_name}
                    </td>
                    <td className="py-1.5 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-1.5 text-right text-slate-600">${Number(item.unitPrice || item.unit_price).toFixed(2)}</td>
                    <td className="py-1.5 text-right font-semibold text-slate-900">${Number(item.lineTotal || item.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Totals */}
          <div className="py-3 border-b border-dashed border-slate-300 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>${subtotal}</span>
            </div>
            {Number(discount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-${discount}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Tax / VAT:</span>
              <span>${tax}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Net Total:</span>
              <span>${total}</span>
            </div>
          </div>

          {/* Footer Barcode */}
          <div className="text-center pt-4">
            <div className="inline-block tracking-widest text-slate-400 font-mono text-[10px] uppercase">
              ||| | ||||| | |||| || ||| |||| |
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">{invoiceNo}</p>
            <p className="text-[10px] text-slate-400 mt-2">Thank you for your business! Please visit again.</p>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="mt-6 flex justify-end gap-3 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-medium transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </Modal>
  );
}
