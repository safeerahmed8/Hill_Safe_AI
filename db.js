// db.js — Database Connection File
const mysql = require('mysql2');
require('dotenv').config();

// Create connection to MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Test the connection
db.connect((err) => {
  if (err) {
    console.log('❌ Database connection failed:', err.message);
    return;
  }
  console.log('✅ HillSafe AI connected to database successfully!');
});

module.exports = db;