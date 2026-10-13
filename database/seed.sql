-- =====================================================================
-- Retail Inventory and Sales Management System
-- Database Seed Script
-- Realistic sample data for demonstration and testing
-- =====================================================================

USE `retail_management`;

-- Temporarily disable foreign keys for clean seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `idempotency_keys`;
TRUNCATE TABLE `returns_refunds`;
TRUNCATE TABLE `audit_logs`;
TRUNCATE TABLE `stock_movements`;
TRUNCATE TABLE `purchase_items`;
TRUNCATE TABLE `purchases`;
TRUNCATE TABLE `sale_items`;
TRUNCATE TABLE `sales`;
TRUNCATE TABLE `products`;
TRUNCATE TABLE `suppliers`;
TRUNCATE TABLE `categories`;
TRUNCATE TABLE `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. Seed Users
-- Default Login Credentials (bcrypt hashed, cost=10):
-- admin@retail.com      -> admin123    (role: ADMIN)
-- cashier@retail.com    -> cashier123  (role: CASHIER)
-- manager@retail.com    -> manager123  (role: INVENTORY_MANAGER)
-- NOTE: Run fix_passwords.js in server/ to regenerate hashes after fresh seed
-- ---------------------------------------------------------------------
INSERT INTO `users` (`user_id`, `full_name`, `email`, `password_hash`, `role`, `is_active`, `created_at`) VALUES
(1, 'System Administrator', 'admin@retail.com', '$2b$10$ntqxHpccK9Kt0jGhIqGmNe7/fo6GSA.yEnoILzcFc1RgefUVXEnXu', 'ADMIN', 1, NOW()),
(2, 'Sarah Jenkins (Cashier)', 'cashier@retail.com', '$2b$10$iNDICAhWpOE1UmSw.gW67e9BTaFM8/Z3gCzztZDOjPHQHTFHYUj/G', 'CASHIER', 1, NOW()),
(3, 'Marcus Vance (Stock Lead)', 'manager@retail.com', '$2b$10$7R1IhOmzwfelSWCmcMNhGOaDPbEjU5GXYjIQwQ.MOeg4eM71Zsd.K', 'INVENTORY_MANAGER', 1, NOW());

-- ---------------------------------------------------------------------
-- 2. Seed Categories
-- ---------------------------------------------------------------------
INSERT INTO `categories` (`category_id`, `category_name`, `description`, `is_active`) VALUES
(1, 'Beverages', 'Refreshing cold and hot drinks, juices, mineral water, and soda', 1),
(2, 'Bakery & Snacks', 'Fresh bread, cookies, potato chips, and confectionery items', 1),
(3, 'Dairy & Cold', 'Milk, butter, artisanal cheese, curd, and yogurt', 1),
(4, 'Pantry Staples', 'Rice, flour, cooking oils, pasta, lentils, and spices', 1),
(5, 'Personal Care', 'Soaps, shampoos, oral hygiene, and skincare essentials', 1),
(6, 'Household & Cleaning', 'Detergents, disinfectants, wipes, and paper towels', 1);

-- ---------------------------------------------------------------------
-- 3. Seed Suppliers
-- ---------------------------------------------------------------------
INSERT INTO `suppliers` (`supplier_id`, `supplier_name`, `phone`, `email`, `address`, `is_active`) VALUES
(1, 'Apex Wholesale Distributors', '+1-800-555-0199', 'orders@apexwholesale.com', '742 Evergreen Industrial Park, Chicago, IL', 1),
(2, 'Sunrise Dairy & Beverages', '+1-800-555-0245', 'supply@sunrisedairy.com', '124 Meadow Valley Rd, Madison, WI', 1),
(3, 'Heritage Grain & Staples Ltd', '+1-800-555-0388', 'b2b@heritagegrain.com', '88 Farmbelt Boulevard, Des Moines, IA', 1),
(4, 'CleanHome Hygiene Supplies', '+1-800-555-0412', 'sales@cleanhome.com', '500 Logistics Way, Newark, NJ', 1);

-- ---------------------------------------------------------------------
-- 4. Seed Products
-- Contains normal-stock, low-stock, and out-of-stock items
-- ---------------------------------------------------------------------
INSERT INTO `products` (`product_id`, `sku`, `barcode`, `product_name`, `description`, `category_id`, `cost_price`, `selling_price`, `stock_quantity`, `reorder_level`, `is_active`) VALUES
-- Category 1: Beverages
(1, 'BEV-COL-001', '8901030100011', 'Sparkling Mineral Water 750ml', 'Naturally carbonated spring water with crisp mineral balance', 1, 1.20, 2.50, 48, 15, 1),
(2, 'BEV-JUC-002', '8901030100028', 'Fresh Squeezed Orange Juice 1L', '100% pure pulp orange juice with no added sugar', 1, 2.40, 4.25, 24, 10, 1),
(3, 'BEV-TEA-003', '8901030100035', 'Organic Green Tea (25 Bags)', 'Antioxidant rich steamed green tea leaf bags', 1, 3.10, 5.99, 5, 10, 1), -- LOW STOCK (5 <= 10)
(4, 'BEV-COL-004', '8901030100042', 'Cold Brew Nitro Coffee 330ml', 'Smooth single-origin arabica nitro infused coffee can', 1, 2.00, 3.99, 0, 12, 1), -- OUT OF STOCK (0)

-- Category 2: Bakery & Snacks
(5, 'SNK-BRD-005', '8901030100059', 'Artisanal Sourdough Bread Loaf', 'Slow fermented rustic sourdough made with stoneground wheat', 2, 2.10, 4.50, 18, 8, 1),
(6, 'SNK-CHP-006', '8901030100066', 'Sea Salt Kettle Potato Chips 150g', 'Thick cut batch cooked potato chips with sea salt', 2, 1.05, 2.25, 60, 20, 1),
(7, 'SNK-CKI-007', '8901030100073', 'Chunky Chocolate Chip Cookies 200g', 'Bakery style butter cookies with Belgian dark chocolate chunks', 2, 1.80, 3.75, 4, 10, 1), -- LOW STOCK (4 <= 10)
(8, 'SNK-BAR-008', '8901030100080', 'Almond Cranberry Granola Bar', 'Whole oats, roasted almonds, and honey chewy protein bar', 2, 0.90, 1.95, 85, 25, 1),

-- Category 3: Dairy & Cold
(9, 'DAR-MLK-009', '8901030100097', 'Whole Farm Milk 1 Gallon', 'Pasteurized homogenized whole milk enriched with Vitamin D', 3, 2.60, 4.19, 30, 15, 1),
(10, 'DAR-CHS-010', '8901030100103', 'Aged White Cheddar Block 250g', 'Sharp aged cheddar aged for 18 months in traditional caves', 3, 3.50, 6.49, 14, 8, 1),
(11, 'DAR-YOG-011', '8901030100110', 'Greek Yogurt Plain 500g', 'High protein authentic strained greek yogurt', 3, 2.15, 3.99, 3, 10, 1), -- LOW STOCK (3 <= 10)
(12, 'DAR-BUT-012', '8901030100127', 'Cultured Salted Butter 250g', 'Grade A churned cream salted table butter', 3, 1.95, 3.65, 0, 10, 1), -- OUT OF STOCK (0)

-- Category 4: Pantry Staples
(13, 'PAN-RIC-013', '8901030100134', 'Aromatic Basmati Rice 5kg', 'Extra long grain aged royal basmati rice bag', 4, 9.50, 16.99, 22, 10, 1),
(14, 'PAN-OIL-014', '8901030100141', 'Extra Virgin Olive Oil 750ml', 'Cold-pressed Mediterranean extra virgin culinary oil', 4, 7.20, 12.99, 16, 8, 1),
(15, 'PAN-PST-015', '8901030100158', 'Bronze Die Penne Rigate 500g', 'Durum wheat semolina pasta from Gragnano', 4, 1.10, 2.49, 70, 20, 1),

-- Category 5: Personal Care
(16, 'PER-SOP-016', '8901030100165', 'Botanical Shea Butter Soap Bar', 'Handmade triple milled moisturizing bar soap with lavender', 5, 1.25, 2.99, 40, 15, 1),
(17, 'PER-SHM-017', '8901030100172', 'Sulfate-Free Coconut Shampoo 400ml', 'Hydrating gentle daily shampoo with argan oil', 5, 4.10, 7.99, 12, 10, 1),
(18, 'PER-PST-018', '8901030100189', 'Complete Protection Toothpaste 120g', 'Enamel defense cavity protection fluoride paste', 5, 1.40, 2.99, 35, 15, 1),

-- Category 6: Household & Cleaning
(19, 'HOU-DET-019', '8901030100196', 'Eco Laundry Detergent Pods (30 Count)', 'Plant-based concentrated stain removing detergent pods', 6, 6.00, 11.49, 19, 10, 1),
(20, 'HOU-CLN-020', '8901030100202', 'All-Purpose Citrus Surface Cleaner 750ml', 'Streak-free antibacterial spray for kitchen and counters', 6, 1.85, 3.79, 2, 8, 1); -- LOW STOCK (2 <= 8)

-- ---------------------------------------------------------------------
-- 5. Seed Purchases & Purchase Items
-- ---------------------------------------------------------------------
-- Completed purchase PO-2026-001 (already received, goods added)
INSERT INTO `purchases` (`purchase_id`, `purchase_reference`, `supplier_id`, `created_by`, `purchase_date`, `subtotal`, `total_amount`, `status`, `received_at`, `received_by`, `notes`) VALUES
(1, 'PO-20261001-001', 1, 1, DATE_SUB(NOW(), INTERVAL 5 DAY), 312.00, 312.00, 'RECEIVED', DATE_SUB(NOW(), INTERVAL 4 DAY), 3, 'Restock of beverages and shelf-stable dry goods'),
(2, 'PO-20261012-002', 2, 3, DATE_SUB(NOW(), INTERVAL 1 DAY), 145.50, 145.50, 'ORDERED', NULL, NULL, 'Urgent dairy and butter replenishment request');

INSERT INTO `purchase_items` (`purchase_item_id`, `purchase_id`, `product_id`, `quantity`, `unit_cost`, `line_total`) VALUES
(1, 1, 1, 50, 1.20, 60.00),
(2, 1, 6, 80, 1.05, 84.00),
(3, 1, 15, 60, 1.10, 66.00),
(4, 1, 16, 40, 1.25, 50.00),
(5, 1, 19, 20, 6.00, 120.00),
(6, 2, 9, 25, 2.60, 65.00),
(7, 2, 10, 15, 3.50, 52.50),
(8, 2, 12, 14, 1.95, 27.30);

-- ---------------------------------------------------------------------
-- 6. Seed Sales & Sale Items
-- ---------------------------------------------------------------------
-- Sale 1: Cash sale
INSERT INTO `sales` (`sale_id`, `invoice_number`, `cashier_id`, `sale_date`, `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `payment_method`, `payment_status`, `status`, `notes`) VALUES
(1, 'INV-20261013-0001', 2, DATE_SUB(NOW(), INTERVAL 4 HOUR), 11.25, 0.00, 0.90, 12.15, 'CASH', 'PAID', 'COMPLETED', 'Regular counter customer'),
(2, 'INV-20261013-0002', 2, DATE_SUB(NOW(), INTERVAL 2 HOUR), 29.48, 2.00, 2.20, 29.68, 'CARD', 'PAID', 'COMPLETED', 'Visa Contactless Chip payment'),
(3, 'INV-20261013-0003', 2, DATE_SUB(NOW(), INTERVAL 30 MINUTE), 15.98, 0.00, 1.28, 17.26, 'UPI', 'PAID', 'COMPLETED', 'Instant mobile UPI QR transfer');

INSERT INTO `sale_items` (`sale_item_id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `unit_cost`, `discount_amount`, `line_total`) VALUES
-- Items for Sale 1
(1, 1, 1, 2, 2.50, 1.20, 0.00, 5.00),
(2, 1, 6, 2, 2.25, 1.05, 0.00, 4.50),
(3, 1, 8, 1, 1.95, 0.90, 0.00, 1.75),

-- Items for Sale 2
(4, 2, 13, 1, 16.99, 9.50, 1.00, 15.99),
(5, 2, 10, 1, 6.49, 3.50, 0.00, 6.49),
(6, 2, 2, 1, 4.25, 2.40, 0.00, 4.25),
(7, 2, 15, 1, 2.49, 1.10, 0.00, 2.49),

-- Items for Sale 3
(8, 3, 17, 1, 7.99, 4.10, 0.00, 7.99),
(9, 3, 18, 1, 2.99, 1.40, 0.00, 2.99),
(10, 3, 1, 2, 2.50, 1.20, 0.00, 5.00);

-- ---------------------------------------------------------------------
-- 7. Seed Stock Movements
-- ---------------------------------------------------------------------
INSERT INTO `stock_movements` (`movement_id`, `product_id`, `user_id`, `movement_type`, `quantity_change`, `previous_quantity`, `new_quantity`, `reference_type`, `reference_id`, `reason`, `movement_date`) VALUES
(1, 1, 3, 'PURCHASE', 50, 0, 50, 'PURCHASE', 'PO-20261001-001', 'Initial receipt from Apex Wholesale', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(2, 6, 3, 'PURCHASE', 80, 0, 80, 'PURCHASE', 'PO-20261001-001', 'Initial receipt from Apex Wholesale', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3, 1, 2, 'SALE', -2, 50, 48, 'SALE', 'INV-20261013-0001', 'Counter sale transaction', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(4, 6, 2, 'SALE', -2, 80, 78, 'SALE', 'INV-20261013-0001', 'Counter sale transaction', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(5, 4, 3, 'DAMAGE', -3, 3, 0, 'MANUAL_ADJUSTMENT', 'ADJ-20261012-01', 'Dropped during shelving transit - broken nitro seals', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(6, 12, 3, 'EXPIRED', -5, 5, 0, 'MANUAL_ADJUSTMENT', 'ADJ-20261011-02', 'Past best-before date during routine stock sweep', DATE_SUB(NOW(), INTERVAL 2 DAY));

-- ---------------------------------------------------------------------
-- 8. Seed Audit Logs
-- ---------------------------------------------------------------------
INSERT INTO `audit_logs` (`log_id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `created_at`) VALUES
(1, 1, 'SYSTEM_INIT', 'DATABASE', 'SCHEMA', '{"description": "Database schema created and seeded successfully"}', '127.0.0.1', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 3, 'RECEIVE_PURCHASE', 'PURCHASES', '1', '{"purchase_reference": "PO-20261001-001", "items_count": 5}', '127.0.0.1', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3, 3, 'STOCK_ADJUSTMENT', 'PRODUCTS', '4', '{"type": "DAMAGE", "qty": -3, "reason": "Broken nitro seals"}', '127.0.0.1', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 2, 'CREATE_SALE', 'SALES', '1', '{"invoice_number": "INV-20261013-0001", "total_amount": 12.15}', '127.0.0.1', DATE_SUB(NOW(), INTERVAL 4 HOUR));
