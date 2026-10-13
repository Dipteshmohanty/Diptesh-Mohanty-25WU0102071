const { pool } = require('../config/db');
const { success, error } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

async function getProducts(req, res, next) {
  try {
    const { search, category_id, stock_status, is_active, page = 1, limit = 100 } = req.query;

    let whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(p.product_name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (category_id) {
      whereClauses.push('p.category_id = ?');
      params.push(category_id);
    }

    if (is_active !== undefined) {
      whereClauses.push('p.is_active = ?');
      params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    if (stock_status === 'low') {
      whereClauses.push('p.stock_quantity <= p.reorder_level AND p.stock_quantity > 0');
    } else if (stock_status === 'out') {
      whereClauses.push('p.stock_quantity = 0');
    } else if (stock_status === 'in') {
      whereClauses.push('p.stock_quantity > p.reorder_level');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM products p
      ${whereSql}
    `, params);

    const total = countResult[0].total;

    const queryParams = [...params, parseInt(limit, 10), offset];
    const [products] = await pool.query(`
      SELECT 
        p.product_id,
        p.sku,
        p.barcode,
        p.product_name,
        p.description,
        p.category_id,
        c.category_name,
        p.cost_price,
        p.selling_price,
        p.stock_quantity,
        p.reorder_level,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      ${whereSql}
      ORDER BY p.product_name ASC
      LIMIT ? OFFSET ?
    `, queryParams);

    return success(res, products, 'Products retrieved successfully', 200, {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (err) {
    next(err);
  }
}

async function getProductById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const [products] = await pool.execute(`
      SELECT 
        p.*,
        c.category_name
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      WHERE p.product_id = ?
    `, [id]);

    if (products.length === 0) {
      return error(res, 'Product not found', 404);
    }

    // Recent stock movements for this product
    const [movements] = await pool.execute(`
      SELECT sm.*, u.full_name as user_name
      FROM stock_movements sm
      JOIN users u ON sm.user_id = u.user_id
      WHERE sm.product_id = ?
      ORDER BY sm.movement_date DESC
      LIMIT 10
    `, [id]);

    return success(res, {
      product: products[0],
      recentMovements: movements
    }, 'Product details retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const {
      sku,
      barcode,
      product_name,
      description,
      category_id,
      cost_price,
      selling_price,
      stock_quantity = 0,
      reorder_level = 10
    } = req.body;

    // Check SKU uniqueness
    const [existingSku] = await pool.execute(
      'SELECT product_id FROM products WHERE sku = ?',
      [sku.trim()]
    );
    if (existingSku.length > 0) {
      return error(res, `A product with SKU "${sku}" already exists.`, 409);
    }

    if (barcode) {
      const [existingBarcode] = await pool.execute(
        'SELECT product_id FROM products WHERE barcode = ?',
        [barcode.trim()]
      );
      if (existingBarcode.length > 0) {
        return error(res, `A product with Barcode "${barcode}" already exists.`, 409);
      }
    }

    const [result] = await pool.execute(`
      INSERT INTO products 
        (sku, barcode, product_name, description, category_id, cost_price, selling_price, stock_quantity, reorder_level, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
    `, [
      sku.trim(),
      barcode ? barcode.trim() : null,
      product_name.trim(),
      description || null,
      category_id,
      cost_price,
      selling_price,
      stock_quantity,
      reorder_level
    ]);

    const newProductId = result.insertId;

    // If initial stock is greater than zero, log an initial stock movement
    if (stock_quantity > 0) {
      await pool.execute(`
        INSERT INTO stock_movements
          (product_id, user_id, movement_type, quantity_change, previous_quantity, new_quantity, reference_type, reference_id, reason, movement_date)
        VALUES (?, ?, 'ADJUSTMENT', ?, 0, ?, 'INITIAL_STOCK', 'INIT', 'Initial product stock upon creation', NOW())
      `, [newProductId, req.user.user_id, stock_quantity, stock_quantity]);
    }

    await logAudit({
      userId: req.user.user_id,
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCTS',
      entityId: newProductId,
      details: { sku, product_name, stock: stock_quantity },
      ipAddress: req.ip
    });

    return success(res, {
      product_id: newProductId,
      sku,
      product_name,
      stock_quantity,
      selling_price
    }, 'Product created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      sku,
      barcode,
      product_name,
      description,
      category_id,
      cost_price,
      selling_price,
      reorder_level
    } = req.body;

    const [existing] = await pool.execute('SELECT * FROM products WHERE product_id = ?', [id]);
    if (existing.length === 0) {
      return error(res, 'Product not found', 404);
    }
    const current = existing[0];

    if (sku && sku !== current.sku) {
      const [skuCheck] = await pool.execute('SELECT product_id FROM products WHERE sku = ? AND product_id != ?', [sku.trim(), id]);
      if (skuCheck.length > 0) {
        return error(res, `Another product with SKU "${sku}" already exists.`, 409);
      }
    }

    if (barcode && barcode !== current.barcode) {
      const [bcCheck] = await pool.execute('SELECT product_id FROM products WHERE barcode = ? AND product_id != ?', [barcode.trim(), id]);
      if (bcCheck.length > 0) {
        return error(res, `Another product with Barcode "${barcode}" already exists.`, 409);
      }
    }

    await pool.execute(`
      UPDATE products
      SET 
        sku = ?,
        barcode = ?,
        product_name = ?,
        description = ?,
        category_id = ?,
        cost_price = ?,
        selling_price = ?,
        reorder_level = ?
      WHERE product_id = ?
    `, [
      sku ? sku.trim() : current.sku,
      barcode !== undefined ? (barcode ? barcode.trim() : null) : current.barcode,
      product_name ? product_name.trim() : current.product_name,
      description !== undefined ? description : current.description,
      category_id || current.category_id,
      cost_price !== undefined ? cost_price : current.cost_price,
      selling_price !== undefined ? selling_price : current.selling_price,
      reorder_level !== undefined ? reorder_level : current.reorder_level,
      id
    ]);

    await logAudit({
      userId: req.user.user_id,
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCTS',
      entityId: id,
      details: { product_name: product_name || current.product_name },
      ipAddress: req.ip
    });

    return success(res, { product_id: id }, 'Product updated successfully');
  } catch (err) {
    next(err);
  }
}

async function updateProductStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    const [existing] = await pool.execute('SELECT product_id, product_name FROM products WHERE product_id = ?', [id]);
    if (existing.length === 0) {
      return error(res, 'Product not found', 404);
    }

    const flag = is_active ? 1 : 0;
    await pool.execute('UPDATE products SET is_active = ? WHERE product_id = ?', [flag, id]);

    await logAudit({
      userId: req.user.user_id,
      action: flag ? 'PRODUCT_ACTIVATED' : 'PRODUCT_DEACTIVATED',
      entityType: 'PRODUCTS',
      entityId: id,
      details: { is_active: flag },
      ipAddress: req.ip
    });

    return success(res, { product_id: id, is_active: flag }, `Product status updated to ${flag ? 'active' : 'inactive'}`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus
};
