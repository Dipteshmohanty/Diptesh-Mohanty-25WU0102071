const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'root',
  multipleStatements: true
};

async function initDatabase() {
  console.log('----------------------------------------------------');
  console.log('Initializing Retail Management MySQL Database...');
  console.log(`Connecting to MySQL host: ${config.host}:${config.port} as user: ${config.user}`);
  console.log('----------------------------------------------------');

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('MySQL Server connection successful.');

    const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
    const seedPath = path.resolve(__dirname, '../../../database/seed.sql');

    console.log('Reading database/schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('Schema tables and constraints created successfully.');

    console.log('Reading database/seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await connection.query(seedSql);
    console.log('Sample data seeded successfully.');

    // Quick verification
    await connection.changeUser({ database: 'retail_management' });
    const [users] = await connection.query('SELECT COUNT(*) as cnt FROM users');
    const [products] = await connection.query('SELECT COUNT(*) as cnt FROM products');
    const [categories] = await connection.query('SELECT COUNT(*) as cnt FROM categories');
    const [sales] = await connection.query('SELECT COUNT(*) as cnt FROM sales');
    const [purchases] = await connection.query('SELECT COUNT(*) as cnt FROM purchases');

    console.log('\nVerification Summary:');
    console.log(`- Users:      ${users[0].cnt}`);
    console.log(`- Categories: ${categories[0].cnt}`);
    console.log(`- Products:   ${products[0].cnt}`);
    console.log(`- Sales:      ${sales[0].cnt}`);
    console.log(`- Purchases:  ${purchases[0].cnt}`);
    console.log('\nDatabase initialization COMPLETE!');
    process.exit(0);
  } catch (err) {
    console.error('\nDatabase initialization failed:');
    console.error(err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nTip: Please update DB_PASSWORD in .env with your current MySQL root password.');
    }
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
