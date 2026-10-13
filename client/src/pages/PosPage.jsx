import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import PrintReceiptModal from '../components/PrintReceiptModal';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Loader2,
  Package,
  Layers,
  RotateCcw
} from 'lucide-react';

export default function PosPage() {
  const { success, error } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(5.0); // 5% default
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Completed Receipt Modal State
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchCatalog = async () => {
    try {
      const [prodsRes, catsRes] = await Promise.all([
        api.get('/products?is_active=1&limit=200'),
        api.get('/categories')
      ]);
      if (prodsRes.success) setProducts(prodsRes.data);
      if (catsRes.success) setCategories(catsRes.data);
    } catch (err) {
      error(err.message || 'Failed to load product catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Filter products by search & category
  const filteredProducts = products.filter((p) => {
    const matchesCat = !selectedCategory || String(p.category_id) === String(selectedCategory);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.product_name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  const addToCart = (product) => {
    if (product.stock_quantity <= 0) {
      error(`Cannot add "${product.product_name}": Out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.product_id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          error(`Stock limit reached for "${product.product_name}". Only ${product.stock_quantity} available.`);
          return prev;
        }
        return prev.map((item) =>
          item.product_id === product.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.product_id,
          product_name: product.product_name,
          sku: product.sku,
          selling_price: parseFloat(product.selling_price),
          stock_quantity: product.stock_quantity,
          quantity: 1
        }
      ];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock_quantity) {
              error(`Cannot exceed current available stock (${item.stock_quantity})`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setNotes('');
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  const cleanDiscount = Math.min(subtotal, Math.max(0, parseFloat(discount) || 0));
  const taxableAmount = Math.max(0, subtotal - cleanDiscount);
  const cleanTaxRate = Math.max(0, parseFloat(taxRate) || 0);
  const calculatedTax = Math.round((taxableAmount * (cleanTaxRate / 100)) * 100) / 100;
  const finalTotal = Math.round((taxableAmount + calculatedTax) * 100) / 100;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      error('Cannot checkout: Shopping cart is empty.');
      return;
    }

    setCheckoutLoading(true);
    // Generate client-side idempotency key for network safety
    const idempotencyKey = `checkout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const payload = {
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_method: paymentMethod,
        discount_amount: cleanDiscount,
        tax_rate: cleanTaxRate,
        notes,
        idempotency_key: idempotencyKey
      };

      const res = await api.post('/sales', payload);
      if (res.success && res.data) {
        success(`Sale confirmed! Invoice #${res.data.invoice_number}`);
        setCompletedReceipt(res.data);
        setShowReceiptModal(true);
        clearCart();
        // Refresh product stock levels in background
        fetchCatalog();
      }
    } catch (err) {
      error(err.message || 'Checkout failed. Please check inventory stock.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-100px)]">
      {/* Left Column: Product Catalog & Search (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header & Search */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Point of Sale Catalog</h2>
            <span className="text-xs text-slate-500 font-medium">
              {filteredProducts.length} items available
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by title, SKU, or barcode scan..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition ${
                selectedCategory === ''
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.category_id}
                onClick={() => setSelectedCategory(cat.category_id)}
                className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition ${
                  String(selectedCategory) === String(cat.category_id)
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.category_name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="p-4 flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No matching products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock_quantity <= 0;
                return (
                  <button
                    key={p.product_id}
                    onClick={() => addToCart(p)}
                    disabled={isOutOfStock}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white hover:border-indigo-300 hover:shadow-sm border-slate-200 cursor-pointer active:scale-[0.98]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono text-slate-400 truncate uppercase">{p.sku}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : p.stock_quantity <= p.reorder_level
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isOutOfStock ? '0 IN STOCK' : `${p.stock_quantity} left`}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
                        {p.product_name}
                      </h4>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-sm font-bold text-indigo-600">
                        ${parseFloat(p.selling_price).toFixed(2)}
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                        +
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Active Cart & Checkout (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Current Order</h3>
            <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} items
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="p-4 flex-1 overflow-y-auto divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-semibold text-slate-600">Cart is empty</p>
              <p className="text-xs text-slate-400 mt-1">Click products on the left or scan a barcode</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product_id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{item.product_name}</div>
                  <div className="text-xs text-slate-500 font-mono">
                    ${item.selling_price.toFixed(2)} each
                  </div>
                </div>

                {/* Quantity stepper */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
                    <button
                      onClick={() => updateQuantity(item.product_id, -1)}
                      className="p-1 hover:bg-white rounded text-slate-600 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product_id, 1)}
                      className="p-1 hover:bg-white rounded text-slate-600 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-16 text-right font-bold text-slate-900">
                    ${(item.selling_price * item.quantity).toFixed(2)}
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 transition rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Payment Section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
          {/* Discount & Tax Row */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Discount ($):</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Tax Rate (%):</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-1.5 pt-1 text-xs text-slate-600 border-t border-slate-200">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
            </div>
            {cleanDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount:</span>
                <span>-${cleanDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax ({cleanTaxRate}%):</span>
              <span className="font-semibold text-slate-900">${calculatedTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Payable Amount:</span>
              <span className="text-indigo-600 text-lg">${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4" />
                CASH
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition ${
                  paymentMethod === 'CARD'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                CARD
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition ${
                  paymentMethod === 'UPI'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-4 h-4" />
                UPI QR
              </button>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || checkoutLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Transaction...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Sale (${finalTotal.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <PrintReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={completedReceipt}
      />
    </div>
  );
}
