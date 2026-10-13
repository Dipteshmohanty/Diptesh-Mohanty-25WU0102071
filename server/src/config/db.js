const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'root',
  database: process.env.DB_NAME || 'retail_management',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  dateStrings: true, // Preserve ISO formatted dates without timezone distortion
  multipleStatements: true
};

const pool = mysql.createPool(poolConfig);

/**
 * Execute parameterized query
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Array>} [rows, fields]
 */
async function query(sql, params = []) {
  return pool.execute(sql, params);
}

/**
 * Run a transaction safely with automatic commit or rollback
 * @param {Function} callback (connection) => Promise<any>
 * @returns {Promise<any>}
 */
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rbErr) {
      console.error('Error rolling back transaction:', rbErr.message);
    }
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Verify DB connectivity
 */
async function checkDatabaseConnection() {
  try {
    const [result] = await pool.query('SELECT 1 + 1 AS connected, DATABASE() as db');
    return {
      connected: true,
      database: result[0]?.db || poolConfig.database,
      host: poolConfig.host
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
      code: err.code
    };
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
  checkDatabaseConnection,
  poolConfig
};
