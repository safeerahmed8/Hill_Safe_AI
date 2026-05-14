// db.js — HillSafe AI v6.0 — Database Connection Pool
const mysql = require('mysql2');
require('dotenv').config();

// ============================================
// CONNECTION POOL — handles 100 vehicles
// ============================================
const pool = mysql.createPool({
  host              : process.env.DB_HOST     || 'localhost',
  user              : process.env.DB_USER     || 'root',
  password          : process.env.DB_PASSWORD || '',
  database          : process.env.DB_NAME     || 'hill_safe_ai',
  waitForConnections: true,   // queue queries when pool is full
  connectionLimit   : 10,     // max 10 concurrent DB connections
  queueLimit        : 0       // unlimited queue
});

// ============================================
// TEST CONNECTION ON STARTUP
// ============================================
pool.getConnection((err, connection) => {
  if (err) {
    console.log('❌ Database connection failed:', err.message);
    return;
  }
  console.log('✅ HillSafe AI connected to database successfully! (Pool ready)');
  connection.release(); // always release back to pool
});

module.exports = pool;