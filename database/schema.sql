-- =====================================================================
-- Retail Inventory and Sales Management System
-- Database Schema for MySQL 8.0+
-- Database Name: retail_management
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `retail_management`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `retail_management`;

-- Drop existing tables in reverse dependency order (if resetting)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `idempotency_keys`;
DROP TABLE IF EXISTS `returns_refunds`;
DROP TABLE IF EXISTS `stock_movements`;
DROP TABLE IF EXISTS `purchase_items`;
DROP TABLE IF EXISTS `purchases`;
DROP TABLE IF EXISTS `sale_items`;
DROP TABLE IF EXISTS `sales`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `suppliers`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. Users Table
-- ---------------------------------------------------------------------
CREATE TABLE `users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('ADMIN', 'CASHIER', 'INVENTORY_MANAGER') NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role_active` (`role`, `is_active`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. Categories Table
-- ---------------------------------------------------------------------
CREATE TABLE `categories` (
  `category_id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_categories_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. Suppliers Table
-- ---------------------------------------------------------------------
CREATE TABLE `suppliers` (
  `supplier_id` INT AUTO_INCREMENT PRIMARY KEY,
  `supplier_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(150) NULL,
  `address` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_suppliers_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. Products Table
-- ---------------------------------------------------------------------
CREATE TABLE `products` (
  `product_id` INT AUTO_INCREMENT PRIMARY KEY,
  `sku` VARCHAR(50) NOT NULL UNIQUE,
  `barcode` VARCHAR(100) UNIQUE NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `category_id` INT NOT NULL,
  `cost_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `reorder_level` INT NOT NULL DEFAULT 10,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_products_cost_price` CHECK (`cost_price` >= 0),
  CONSTRAINT `chk_products_selling_price` CHECK (`selling_price` >= 0),
  CONSTRAINT `chk_products_stock_quantity` CHECK (`stock_quantity` >= 0),
  CONSTRAINT `chk_products_reorder_level` CHECK (`reorder_level` >= 0),
  INDEX `idx_products_sku` (`sku`),
  INDEX `idx_products_barcode` (`barcode`),
  INDEX `idx_products_name` (`product_name`),
  INDEX `idx_products_category` (`category_id`),
  INDEX `idx_products_stock_alert` (`is_active`, `stock_quantity`, `reorder_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. Sales Table
-- ---------------------------------------------------------------------
CREATE TABLE `sales` (
  `sale_id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `cashier_id` INT NOT NULL,
  `sale_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('CASH', 'CARD', 'UPI') NOT NULL,
  `payment_status` ENUM('PAID', 'PENDING', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PAID',
  `status` ENUM('COMPLETED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'COMPLETED',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sales_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_sales_subtotal` CHECK (`subtotal` >= 0),
  CONSTRAINT `chk_sales_discount` CHECK (`discount_amount` >= 0),
  CONSTRAINT `chk_sales_tax` CHECK (`tax_amount` >= 0),
  CONSTRAINT `chk_sales_total` CHECK (`total_amount` >= 0),
  INDEX `idx_sales_invoice` (`invoice_number`),
  INDEX `idx_sales_date` (`sale_date`),
  INDEX `idx_sales_cashier` (`cashier_id`),
  INDEX `idx_sales_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. Sale Items Table
-- ---------------------------------------------------------------------
CREATE TABLE `sale_items` (
  `sale_item_id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `unit_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `line_total` DECIMAL(10,2) NOT NULL,
  CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_sale_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_sale_items_quantity` CHECK (`quantity` > 0),
  CONSTRAINT `chk_sale_items_unit_price` CHECK (`unit_price` >= 0),
  CONSTRAINT `chk_sale_items_unit_cost` CHECK (`unit_cost` >= 0),
  CONSTRAINT `chk_sale_items_line_total` CHECK (`line_total` >= 0),
  INDEX `idx_sale_items_sale` (`sale_id`),
  INDEX `idx_sale_items_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. Purchases Table
-- ---------------------------------------------------------------------
CREATE TABLE `purchases` (
  `purchase_id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_reference` VARCHAR(50) NOT NULL UNIQUE,
  `supplier_id` INT NOT NULL,
  `created_by` INT NOT NULL,
  `purchase_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `received_at` DATETIME NULL,
  `received_by` INT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_purchases_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_purchases_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_purchases_received_by` FOREIGN KEY (`received_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_purchases_subtotal` CHECK (`subtotal` >= 0),
  CONSTRAINT `chk_purchases_total` CHECK (`total_amount` >= 0),
  INDEX `idx_purchases_ref` (`purchase_reference`),
  INDEX `idx_purchases_status` (`status`),
  INDEX `idx_purchases_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. Purchase Items Table
-- ---------------------------------------------------------------------
CREATE TABLE `purchase_items` (
  `purchase_item_id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_cost` DECIMAL(10,2) NOT NULL,
  `line_total` DECIMAL(10,2) NOT NULL,
  CONSTRAINT `fk_purchase_items_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`purchase_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_purchase_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_purchase_items_quantity` CHECK (`quantity` > 0),
  CONSTRAINT `chk_purchase_items_unit_cost` CHECK (`unit_cost` >= 0),
  CONSTRAINT `chk_purchase_items_line_total` CHECK (`line_total` >= 0),
  INDEX `idx_purchase_items_purchase` (`purchase_id`),
  INDEX `idx_purchase_items_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. Stock Movements Table
-- ---------------------------------------------------------------------
CREATE TABLE `stock_movements` (
  `movement_id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `movement_type` ENUM('PURCHASE', 'SALE', 'RETURN', 'DAMAGE', 'EXPIRED', 'ADJUSTMENT') NOT NULL,
  `quantity_change` INT NOT NULL,
  `previous_quantity` INT NOT NULL,
  `new_quantity` INT NOT NULL,
  `reference_type` VARCHAR(50) NOT NULL,
  `reference_id` VARCHAR(50) NOT NULL,
  `reason` TEXT NULL,
  `movement_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_movements_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_movements_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_movements_previous_quantity` CHECK (`previous_quantity` >= 0),
  CONSTRAINT `chk_movements_new_quantity` CHECK (`new_quantity` >= 0),
  INDEX `idx_movements_product` (`product_id`),
  INDEX `idx_movements_date` (`movement_date`),
  INDEX `idx_movements_type` (`movement_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 10. Returns and Refunds Table
-- ---------------------------------------------------------------------
CREATE TABLE `returns_refunds` (
  `refund_id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `processed_by` INT NOT NULL,
  `refund_amount` DECIMAL(10,2) NOT NULL,
  `reason` TEXT NOT NULL,
  `refund_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_refunds_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_refunds_user` FOREIGN KEY (`processed_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_refunds_amount` CHECK (`refund_amount` >= 0),
  INDEX `idx_refunds_sale` (`sale_id`),
  INDEX `idx_refunds_date` (`refund_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 11. Audit Logs Table
-- ---------------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `log_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(50) NULL,
  `details` JSON NULL,
  `ip_address` VARCHAR(50) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_created` (`created_at`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 12. Idempotency Keys Table
-- ---------------------------------------------------------------------
CREATE TABLE `idempotency_keys` (
  `key_id` INT AUTO_INCREMENT PRIMARY KEY,
  `idempotency_key` VARCHAR(100) NOT NULL UNIQUE,
  `endpoint` VARCHAR(100) NOT NULL,
  `response_body` JSON NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_idempotency_key` (`idempotency_key`),
  INDEX `idx_idempotency_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
