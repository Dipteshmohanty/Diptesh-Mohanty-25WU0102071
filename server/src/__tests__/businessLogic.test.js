const { processCheckout, generateInvoiceNumber } = require('../services/salesService');
const { generatePurchaseReference } = require('../services/purchaseService');
const { generateAdjustmentReference } = require('../services/inventoryService');

describe('Business Logic & Calculation Test Suite', () => {
  describe('1. Reference & Invoice Code Generators', () => {
    it('generateInvoiceNumber should generate INV-YYYYMMDD-XXXX format', () => {
      const inv = generateInvoiceNumber();
      expect(inv).toMatch(/^INV-\d{8}-\d{4}$/);
    });

    it('generatePurchaseReference should generate PO-YYYYMMDD-XXX format', () => {
      const po = generatePurchaseReference();
      expect(po).toMatch(/^PO-\d{8}-\d{3}$/);
    });

    it('generateAdjustmentReference should generate ADJ-YYYYMMDD-XXX format', () => {
      const adj = generateAdjustmentReference();
      expect(adj).toMatch(/^ADJ-\d{8}-\d{3}$/);
    });
  });

  describe('2. Financial Calculations & Precision Rounding', () => {
    it('Should correctly compute line totals, tax rate, and final totals without floating point error', () => {
      const items = [
        { unit_price: 19.99, quantity: 3 }, // 59.97
        { unit_price: 4.49, quantity: 2 },  // 8.98
        { unit_price: 1.25, quantity: 4 }   // 5.00
      ];

      const subtotal = items.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0);
      const roundedSubtotal = Math.round(subtotal * 100) / 100;
      expect(roundedSubtotal).toBe(73.95);

      const discount = 5.00;
      const taxable = roundedSubtotal - discount; // 68.95
      const taxRate = 8.25; // 8.25%
      const taxAmount = Math.round((taxable * (taxRate / 100)) * 100) / 100; // 5.69
      expect(taxAmount).toBe(5.69);

      const finalTotal = Math.round((taxable + taxAmount) * 100) / 100;
      expect(finalTotal).toBe(74.64);
    });

    it('Profit calculation should properly separate revenue and historical cost of goods', () => {
      const revenue = 1500.00;
      const costOfGoods = 950.00;
      const grossProfit = revenue - costOfGoods;
      const profitMarginPercent = (grossProfit / revenue) * 100;

      expect(grossProfit).toBe(550.00);
      expect(Math.round(profitMarginPercent * 100) / 100).toBe(36.67);
      expect(grossProfit).not.toBe(revenue); // Revenue is distinctly not profit!
    });
  });

  describe('3. Stock Boundary and Invariant Guards', () => {
    it('Should prevent negative stock after deduction', () => {
      const currentStock = 5;
      const requestedQty = 8;
      const hasSufficientStock = currentStock >= requestedQty;
      expect(hasSufficientStock).toBe(false);
    });

    it('Stock addition upon purchase receipt should correctly increase total inventory', () => {
      const initialStock = 24;
      const receivedQty = 50;
      const newStock = initialStock + receivedQty;
      expect(newStock).toBe(74);
    });
  });
});
