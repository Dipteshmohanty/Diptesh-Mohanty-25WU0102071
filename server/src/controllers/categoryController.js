const { pool } = require('../config/db');
const { success, error } = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');

async function getCategories(req, res, next) {
  try {
    const [categories] = await pool.execute(`
      SELECT 
        c.category_id,
        c.category_name,
        c.description,
        c.is_active,
        c.created_at,
        c.updated_at,
        COUNT(p.product_id) AS product_count
      FROM categories c
      LEFT JOIN products p ON c.category_id = p.category_id
      GROUP BY c.category_id
      ORDER BY c.category_name ASC
    `);

    return success(res, categories, 'Categories retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { category_name, description } = req.body;

    const [existing] = await pool.execute(
      'SELECT category_id FROM categories WHERE category_name = ?',
      [category_name.trim()]
    );
    if (existing.length > 0) {
      return error(res, `A category named "${category_name}" already exists.`, 409);
    }

    const [result] = await pool.execute(
      'INSERT INTO categories (category_name, description, is_active, created_at) VALUES (?, ?, 1, NOW())',
      [category_name.trim(), description || null]
    );

    const newId = result.insertId;

    await logAudit({
      userId: req.user.user_id,
      action: 'CATEGORY_CREATED',
      entityType: 'CATEGORIES',
      entityId: newId,
      details: { category_name },
      ipAddress: req.ip
    });

    return success(res, { category_id: newId, category_name, description }, 'Category created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { category_name, description, is_active } = req.body;

    const [existing] = await pool.execute('SELECT * FROM categories WHERE category_id = ?', [id]);
    if (existing.length === 0) {
      return error(res, 'Category not found', 404);
    }

    if (category_name && category_name.trim() !== existing[0].category_name) {
      const [dup] = await pool.execute(
        'SELECT category_id FROM categories WHERE category_name = ? AND category_id != ?',
        [category_name.trim(), id]
      );
      if (dup.length > 0) {
        return error(res, `Category name "${category_name}" is already taken.`, 409);
      }
    }

    await pool.execute(`
      UPDATE categories
      SET 
        category_name = ?,
        description = ?,
        is_active = ?
      WHERE category_id = ?
    `, [
      category_name ? category_name.trim() : existing[0].category_name,
      description !== undefined ? description : existing[0].description,
      is_active !== undefined ? (is_active ? 1 : 0) : existing[0].is_active,
      id
    ]);

    await logAudit({
      userId: req.user.user_id,
      action: 'CATEGORY_UPDATED',
      entityType: 'CATEGORIES',
      entityId: id,
      details: { category_name: category_name || existing[0].category_name },
      ipAddress: req.ip
    });

    return success(res, { category_id: id }, 'Category updated successfully');
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    const [products] = await pool.execute(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );

    if (products[0].count > 0) {
      return error(
        res,
        `Cannot delete this category: It contains ${products[0].count} product(s). Please reassign or deactivate the products first.`,
        400
      );
    }

    await pool.execute('DELETE FROM categories WHERE category_id = ?', [id]);

    await logAudit({
      userId: req.user.user_id,
      action: 'CATEGORY_DELETED',
      entityType: 'CATEGORIES',
      entityId: id,
      ipAddress: req.ip
    });

    return success(res, null, 'Category deleted successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
