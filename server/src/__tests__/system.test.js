const request = require('supertest');
const app = require('../app');
const { generateToken } = require('../utils/jwt');

describe('Retail Management System - Automated Test Suite', () => {
  const adminToken = generateToken({ user_id: 1, email: 'admin@retail.com', role: 'ADMIN' });
  const cashierToken = generateToken({ user_id: 2, email: 'cashier@retail.com', role: 'CASHIER' });
  const managerToken = generateToken({ user_id: 3, email: 'manager@retail.com', role: 'INVENTORY_MANAGER' });

  describe('1. System Health & Infrastructure', () => {
    it('GET /api/health should respond with status information', async () => {
      const res = await request(app).get('/api/health');
      expect([200, 503]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('database');
    });
  });

  describe('2. Authentication & Authorization (RBAC)', () => {
    it('POST /api/auth/login should reject empty credentials with 422', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('POST /api/auth/login should reject invalid email format with 422', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'password123' });
      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/users should reject requests without a token with 401', async () => {
      const res = await request(app).get('/api/users');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/users should reject CASHIER with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('GET /api/users should reject INVENTORY_MANAGER with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });
  });

  describe('3. Validation Rules & Constraint Safeguards', () => {
    it('POST /api/products should reject negative cost and selling prices with 422', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sku: 'TEST-NEG-01',
          product_name: 'Negative Price Item',
          category_id: 1,
          cost_price: -5.00,
          selling_price: -10.00,
          stock_quantity: -20
        });
      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      const errors = res.body.errors.map(e => e.field);
      expect(errors).toContain('cost_price');
      expect(errors).toContain('selling_price');
      expect(errors).toContain('stock_quantity');
    });

    it('POST /api/sales should reject an empty cart with 422', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [],
          payment_method: 'CASH'
        });
      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/sales should reject invalid payment methods with 422', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ product_id: 1, quantity: 1 }],
          payment_method: 'BITCOIN'
        });
      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/inventory/adjustments should reject adjustments without a mandatory reason with 422', async () => {
      const res = await request(app)
        .post('/api/inventory/adjustments')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          product_id: 1,
          movement_type: 'DAMAGE',
          quantity_change: -2,
          reason: ''
        });
      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Token Security and Tampering Prevention', () => {
    it('Should reject malformed JWT tokens with 401', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', 'Bearer invalid.bogus.token');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
