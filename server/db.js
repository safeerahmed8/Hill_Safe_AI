// db.js — HillSafe AI
// MySQL connection pool using mysql2
const path = require('path');
// Always load .env from the PROJECT ROOT (one level above /server),
// regardless of which folder the terminal is currently in when you run node.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host           : process.env.DB_HOST     || '127.0.0.1',
  user           : process.env.DB_USER     || 'root',
  password       : process.env.DB_PASSWORD || '',
  database       : process.env.DB_NAME     || 'hill_safe_ai',
  port           : parseInt(process.env.DB_PORT || '3306'),
  waitForConnections : true,
  connectionLimit    : 10,
  connectTimeout     : 10000,
  queueLimit         : 0,
});

module.exports = pool;
