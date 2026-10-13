const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { checkDatabaseConnection, poolConfig } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('====================================================');
  console.log(' Retail Inventory and Sales Management System');
  console.log(' Backend API Server starting up...');
  console.log('====================================================');

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.connected) {
    console.log(`[DB] Connected to MySQL database "${dbStatus.database}" at ${dbStatus.host}:${poolConfig.port}`);
  } else {
    console.warn(`[DB WARNING] MySQL connection failed: ${dbStatus.error}`);
    console.warn(`[DB TIP] If your MySQL password differs from '${poolConfig.password}', update DB_PASSWORD in server/.env and run: npm run db:init`);
  }

  const server = app.listen(PORT, () => {
    console.log(`[SERVER] API listening on http://localhost:${PORT}`);
    console.log(`[HEALTH] http://localhost:${PORT}/api/health`);
    console.log(`[ENV]    Mode: ${process.env.NODE_ENV || 'development'}`);
  });

  const shutdown = async () => {
    console.log('\nGracefully shutting down server...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
