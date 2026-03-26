// server.js — Main HillSafe AI Server
const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

// Create server
const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// ROUTE 1 — Test if server is working
// ============================================
app.get('/', (req, res) => {
  res.json({
    message: '🚀 HillSafe AI Server is Running!',
    status: 'active',
    version: '1.0'
  });
});

// ============================================
// ROUTE 2 — Get all vehicles
// ============================================
app.get('/vehicles', (req, res) => {
  const sql = 'SELECT * FROM vehicles';
  
  db.query(sql, (err, results) => {
    if (err) {
      res.json({ error: err.message });
      return;
    }
    res.json({
      message: '✅ Vehicles retrieved successfully',
      total: results.length,
      vehicles: results
    });
  });
});

// ============================================
// ROUTE 3 — Get single vehicle by ID
// ============================================
app.get('/vehicles/id/:id', (req, res) => {
  const vehicle_id = parseInt(req.params.id);
  const sql = 'SELECT * FROM vehicles WHERE vehicle_id = ?';

  db.query(sql, [vehicle_id], (err, results) => {
    if (err) {
      res.json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.json({ message: '❌ Vehicle not found' });
      return;
    }
    res.json({
      message: '✅ Vehicle found',
      vehicle: results[0]
    });
  });
});

// ============================================
// ROUTE 4 — Get vehicle by number plate
// ============================================
app.get('/vehicles/plate/:plate', (req, res) => {
  const plate = req.params.plate;
  const sql = 'SELECT * FROM vehicles WHERE registration_number = ?';

  db.query(sql, [plate], (err, results) => {
    if (err) {
      res.json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.json({ message: '❌ Vehicle not found' });
      return;
    }
    res.json({
      message: '✅ Vehicle found',
      vehicle: results[0]
    });
  });
});

// ============================================
// ROUTE 5 — Get all danger zones
// ============================================
app.get('/zones', (req, res) => {
  const sql = 'SELECT * FROM zones';

  db.query(sql, (err, results) => {
    if (err) {
      res.json({ error: err.message });
      return;
    }
    res.json({
      message: '✅ Danger zones retrieved',
      total: results.length,
      zones: results
    });
  });
});

// ============================================
// ROUTE 6 — Get all drivers
// ============================================
app.get('/drivers', (req, res) => {
  const sql = `
    SELECT 
      drivers.*,
      vehicles.registration_number,
      vehicles.vehicle_type,
      vehicles.blood_group,
      vehicles.emergency_contact
    FROM drivers
    JOIN vehicles ON drivers.vehicle_id = vehicles.vehicle_id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      res.json({ error: err.message });
      return;
    }
    res.json({
      message: '✅ Drivers retrieved successfully',
      total: results.length,
      drivers: results
    });
  });
});

// ============================================
// ROUTE 7 — Get all challans
// ============================================
app.get('/challans', (req, res) => {
  const sql = `
    SELECT 
      challans.*,
      vehicles.registration_number,
      vehicles.owner_name
    FROM challans
    JOIN vehicles ON challans.vehicle_id = vehicles.vehicle_id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      res.json({ error: err.message });
      return;
    }
    res.json({
      message: '✅ Challans retrieved',
      total: results.length,
      challans: results
    });
  });
});

// ============================================
// ROUTE 8 — Get all incidents
// ============================================
app.get('/incidents', (req, res) => {
  const sql = `
    SELECT 
      incidents.*,
      vehicles.registration_number,
      vehicles.owner_name,
      vehicles.blood_group,
      vehicles.emergency_contact
    FROM incidents
    JOIN vehicles ON incidents.vehicle_id = vehicles.vehicle_id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      res.json({ error: err.message });
      return;
    }
    res.json({
      message: '✅ Incidents retrieved',
      total: results.length,
      incidents: results
    });
  });
});

// ============================================
// Start server
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 HillSafe AI Server running on port ${PORT}`);
  console.log(`🌍 Open browser:    http://localhost:${PORT}`);
  console.log(`🚗 All Vehicles:    http://localhost:${PORT}/vehicles`);
  console.log(`🚗 Vehicle by ID:   http://localhost:${PORT}/vehicles/id/1`);
  console.log(`🚗 Vehicle by Plate:http://localhost:${PORT}/vehicles/plate/JK-01-AB-1234`);
  console.log(`🔴 Zones API:       http://localhost:${PORT}/zones`);
  console.log(`👤 Drivers API:     http://localhost:${PORT}/drivers`);
  console.log(`💸 Challans API:    http://localhost:${PORT}/challans`);
  console.log(`🚨 Incidents API:   http://localhost:${PORT}/incidents`);
});