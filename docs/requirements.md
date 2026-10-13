# Retail Inventory and Sales Management System - Software Requirements Specification (SRS)

## 1. Introduction

The **Retail Inventory and Sales Management System** is a full-stack, database-backed enterprise software solution tailored for retail storefronts, supermarkets, and convenience businesses. It replaces manual ledgers and fragmented billing systems with a centralized relational database architecture, real-time stock telemetry, point-of-sale (POS) automation, and financial performance analytics.

## 2. Problem Statement

Traditional small-to-medium retail outlets face operational inefficiencies:
1. **Stock Inaccuracies & Stock-outs**: Lack of automated decrementing during checkout leads to overselling or sudden out-of-stock scenarios.
2. **Billing Delays**: Slow manual calculations of discounts, taxes, and multi-mode payments (Cash, Card, UPI) frustrate customers at peak checkout hours.
3. **Loss from Breakage and Expiry**: Damaged or expired goods disappear from shelves without logged justifications or accountable personnel trails.
4. **Distorted Financial Insights**: Revenue is frequently confused with profit because systems fail to track the historical cost basis (COGS) of products.
5. **Unauthorized Actions**: Cashiers modifying stock or overwriting completed transactions without supervisory approvals.

## 3. Project Objectives

- **Digitization of Store Inventory**: Maintain real-time quantity ledgers with automated reorder threshold detection.
- **Transaction Safety & Concurrency Control**: Execute point-of-sale checkouts within ACID-compliant database transactions using row-level locking to prevent overselling.
- **Accurate Financial Separation**: Reliably distinguish Gross Revenue from Cost of Goods Sold (COGS) and Gross Profit using historical product purchase unit costs.
- **Strict Role-Based Access Control (RBAC)**: Partition operational boundaries between Administrators, Cashiers, and Inventory Managers enforced in backend middleware.
- **Auditability**: Maintain tamper-resistant audit logs for security, restocks, adjustments, and refunds.

## 4. User Roles and Permission Matrix

| Feature / Operation | Admin / Store Owner | Cashier / Sales Staff | Inventory / Stock Lead |
| :--- | :---: | :---: | :---: |
| **System Dashboard & KPIs** | Full Store Telemetry | POS Only | Stock Telemetry |
| **User & Staff Account Governance** | Read / Write / Toggle | No Access | No Access |
| **Prevent Last Admin Deactivation** | Enforced | N/A | N/A |
| **Product Catalog (Read)** | Full Access | Full Access | Full Access |
| **Product Catalog (Create/Edit)** | Full Access | No Access | Full Access |
| **Category Management** | Full Access | Read Only | Full Access |
| **Supplier Directory** | Full Access | No Access | Full Access |
| **Point of Sale (POS) Billing** | Full Access | Full Access | No Access |
| **Completed Sales History** | View All Invoices | View Own Invoices | No Access |
| **Print / Reprint Receipts** | Yes | Yes | No Access |
| **Authorize Returns & Refunds** | Yes | No Access | No Access |
| **Create Purchase Orders (POs)** | Yes | No Access | Yes |
| **Receive Shipments (Restock)** | Yes | No Access | Yes |
| **Manual Adjustments (Damage/Expiry)** | Yes (with reason) | No Access | Yes (with reason) |
| **Stock Movement Audit Trail** | Full Access | No Access | Full Access |
| **Financial & Profit Reports** | Full Access | No Access | Valuation Only |
| **System Audit Logs** | Full Access | No Access | No Access |

## 5. Non-Functional Requirements

- **Security**: Password hashing using bcrypt (cost factor 10), signed JSON Web Tokens (JWT) for stateless authenticated sessions, parametrized SQL statements for 100% SQL injection prevention, rate limiting against brute-force attacks, and CORS restriction.
- **Data Integrity**: Enforce foreign key constraints with `ON DELETE RESTRICT` to preserve historical transaction audit trails even if referenced categories or suppliers are deactivated.
- **Performance**: Sub-50ms query latency for indexed lookups (SKU, barcode, invoice number). Connection pooling via `mysql2` supporting up to 15 concurrent pooled connections.
- **Reliability & Idempotency**: Support idempotency keys on checkout endpoints to eliminate double-billing risks caused by network drops or rapid double-clicks.
