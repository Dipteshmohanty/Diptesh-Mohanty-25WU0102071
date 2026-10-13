# Retail Inventory and Sales Management System - REST API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication & Headers
All protected routes require an HTTP Authorization header containing a valid signed JWT:
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

## Standard Response Structure
```json
// Success Response
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 50 }
}

// Error Response
{
  "success": false,
  "message": "Validation failed: Please check input fields",
  "errors": [
    { "field": "selling_price", "message": "Selling price must be a non-negative number" }
  ]
}
```

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
- **Access**: Public (Protected by rate limiter)
- **Body**:
  ```json
  {
    "email": "admin@retail.com",
    "password": "Admin@123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Authentication successful",
    "data": {
      "user": {
        "user_id": 1,
        "full_name": "System Administrator",
        "email": "admin@retail.com",
        "role": "ADMIN"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

### `GET /api/auth/me`
- **Access**: Authenticated (Any role)
- **Response**: Current authenticated user profile with active status.

### `POST /api/auth/logout`
- **Access**: Authenticated (Any role)
- **Action**: Invalidates client session and records logout audit log.

---

## 2. Product Endpoints

### `GET /api/products`
- **Access**: Authenticated (`ADMIN`, `CASHIER`, `INVENTORY_MANAGER`)
- **Query Parameters**:
  - `search`: Filter by name, SKU, or barcode
  - `category_id`: Integer
  - `stock_status`: `'low'`, `'out'`, `'in'`
  - `is_active`: `1` or `0`
  - `page`, `limit`: Integer pagination
- **Response**: List of products with category titles and stock status badges.

### `POST /api/products`
- **Access**: `ADMIN`, `INVENTORY_MANAGER`
- **Body**:
  ```json
  {
    "sku": "BEV-COL-001",
    "barcode": "8901030100011",
    "product_name": "Sparkling Mineral Water 750ml",
    "description": "Naturally carbonated spring water",
    "category_id": 1,
    "cost_price": 1.20,
    "selling_price": 2.50,
    "stock_quantity": 48,
    "reorder_level": 15
  }
  ```

### `PUT /api/products/:id`
- **Access**: `ADMIN`, `INVENTORY_MANAGER`
- **Action**: Updates SKU, prices, name, and reorder threshold with uniqueness checks.

### `PATCH /api/products/:id/status`
- **Access**: `ADMIN`, `INVENTORY_MANAGER`
- **Body**: `{ "is_active": false }`
- **Action**: Soft deactivates product without violating historical transaction foreign keys.

---

## 3. Point of Sale & Sales Endpoints

### `POST /api/sales`
- **Access**: `ADMIN`, `CASHIER`
- **Body**:
  ```json
  {
    "items": [
      { "product_id": 1, "quantity": 2 },
      { "product_id": 6, "quantity": 1 }
    ],
    "payment_method": "CASH",
    "discount_amount": 0.00,
    "tax_rate": 5.0,
    "notes": "Counter sale",
    "idempotency_key": "checkout_17600000_abc123"
  }
  ```
- **Transaction Safety**:
  1. Row locks product items (`FOR UPDATE`).
  2. Verifies stock availability on server.
  3. Inserts `sales` and `sale_items`.
  4. Deducts `products.stock_quantity`.
  5. Inserts audit records into `stock_movements`.
  6. Commits transaction and returns receipt payload.

### `GET /api/sales`
- **Access**: `ADMIN`, `CASHIER` (Cashiers restricted to their own transactions).
- **Query Parameters**: `invoice`, `start_date`, `end_date`, `payment_method`, `status`.

### `GET /api/sales/:id/receipt`
- **Access**: Authenticated
- **Response**: Printable invoice data formatted for thermal receipt printing.

### `POST /api/sales/:id/refund`
- **Access**: `ADMIN`
- **Body**: `{ "reason": "Customer returned unopened items with invoice" }`
- **Action**: Reverses financial impact, restocks products, logs `RETURN` movement.

---

## 4. Purchases & Restocking Endpoints

### `POST /api/purchases`
- **Access**: `ADMIN`, `INVENTORY_MANAGER`
- **Body**:
  ```json
  {
    "supplier_id": 1,
    "items": [
      { "product_id": 1, "quantity": 50, "unit_cost": 1.20 }
    ],
    "notes": "Emergency restock order"
  }
  ```

### `POST /api/purchases/:id/receive`
- **Access**: `ADMIN`, `INVENTORY_MANAGER`
- **Action**: Atomic stock increment, logs `PURCHASE` movement, sets status to `RECEIVED`. Prevents duplicate receiving.

---

## 5. Inventory & Adjustments Endpoints

### `GET /api/inventory/summary`
- **Access**: `ADMIN`, `INVENTORY_MANAGER`
- **Response**: Aggregated counts, total stock units, low-stock count, wholesale valuation.

### `POST /api/inventory/adjustments`
- **Access**: `ADMIN`, `INVENTORY_MANAGER`
- **Body**:
  ```json
  {
    "product_id": 4,
    "movement_type": "DAMAGE",
    "quantity_change": -3,
    "reason": "Dropped during shelf restocking; broken seals"
  }
  ```

---

## 6. Financial Reporting Endpoints

### `GET /api/reports/dashboard`
- **Access**: `ADMIN`
- **Response**: Live KPIs, 7-day revenue/profit trend, urgent stock alerts.

### `GET /api/reports/sales`
- **Access**: `ADMIN`
- **Response**: Filtered sales ledger with revenue, historical cost (COGS), and gross profit.

### `GET /api/reports/inventory-valuation`
- **Access**: `ADMIN`, `INVENTORY_MANAGER`
- **Response**: SKU-by-SKU cost valuation, retail potential, and unrealized profit.
