// server.js — HillSafe AI v7.0 — Accident Rerouting System
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db   = require('./db');
const {
  blockZone,
  clearZone,
  getAlternateRoute,
  getBlockedZones,
  isNearBlockedZone
} = require('./reroute');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================
// DANGER ZONES — J&K Mountain Roads (8 zones)
// ============================================
const dangerZones = [
  { id: 1, name: 'Banihal Pass Curve',   lat: 33.5120, lng: 75.2000, radius: 0.12, speedLimit: 30 },
  { id: 2, name: 'Zoji La Summit',       lat: 34.2600, lng: 75.4800, radius: 0.15, speedLimit: 20 },
  { id: 3, name: 'Jawahar Tunnel Entry', lat: 33.3200, lng: 75.1500, radius: 0.10, speedLimit: 40 },
  { id: 4, name: 'Rohtang Pass',         lat: 32.3714, lng: 77.2441, radius: 0.12, speedLimit: 25 },
  { id: 5, name: 'Sinthan Top',          lat: 33.6500, lng: 75.5000, radius: 0.10, speedLimit: 30 },
  { id: 6, name: 'Mughal Road Curve',    lat: 33.4800, lng: 74.5200, radius: 0.10, speedLimit: 35 },
  { id: 7, name: 'Nathatop Blind Curve', lat: 33.0500, lng: 75.1000, radius: 0.08, speedLimit: 30 },
  { id: 8, name: 'Patnitop Hairpin',     lat: 33.1000, lng: 75.2800, radius: 0.09, speedLimit: 25 }
];

// ============================================
// VEHICLE DATA POOLS
// ============================================
const VEHICLE_TYPES  = ['Car', 'Truck', 'Bus', 'Bike'];
const BLOOD_GROUPS   = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const DISTRICT_CODES = ['01', '02', '05', '06', '09', '10', '14', '16', '18', '22'];
const DRIVER_NAMES   = [
  'Mohammad Rafi',   'Rahul Sharma',    'Priya Singh',    'Abdul Rashid',
  'Vikram Dogra',    'Sajad Ahmad',     'Sunita Devi',    'Farooq Khan',
  'Ritu Gupta',      'Imtiyaz Ahmed',   'Karan Mehta',    'Nazia Begum',
  'Deepak Kumar',    'Bashir Ahmad',    'Meena Devi',     'Zahoor Ahmad',
  'Pawan Kumar',     'Ruqaya Bano',     'Ashok Singh',    'Mushtaq Ahmad',
  'Sanjay Verma',    'Gulshan Nabi',    'Rekha Devi',     'Tariq Mir',
  'Anita Sharma',    'Shabir Lone',     'Ramesh Gupta',   'Hina Bashir',
  'Suresh Dogra',    'Fayaz Malik',     'Kavita Rani',    'Irfan Dar',
  'Manoj Pandita',   'Sadia Qureshi',   'Bharat Bhushan', 'Reyaz Ahmad',
  'Pooja Sharma',    'Bilal Sofi',      'Rakesh Kumar',   'Asifa Jan',
  'Vinod Kumar',     'Waseem Raja',     'Seema Devi',     'Nazir Wani',
  'Anil Sharma',     'Zahida Begum',    'Rajesh Gupta',   'Owais Khan',
  'Usha Rani',       'Javed Iqbal',     'Harish Kumar',   'Shazia Mufti',
  'Dinesh Kumar',    'Arshad Lone',     'Geeta Devi',     'Umer Farooq',
  'Ramzan Bhat',     'Lalita Devi',     'Younis Khan',    'Madhu Bala',
  'Akbar Khan',      'Tara Devi',       'Riaz Ahmad',     'Kamla Devi',
  'Sikander Ali',    'Veena Gupta',     'Noor Mohammad',  'Padma Devi',
  'Altaf Hussain',   'Sarla Rani',      'Ghulam Nabi',    'Pushpa Devi',
  'Tanvir Ahmad',    'Bimla Devi',      'Mukhtar Ahmad',  'Savita Sharma',
  'Aijaz Ahmad',     'Sunita Rani',     'Hilal Ahmad',    'Rita Devi',
  'Showkat Ali',     'Urmila Devi',     'Nisar Ahmad',    'Shanta Devi',
  'Manzoor Ahmad',   'Kusum Lata',      'Javaid Bhat',    'Sudha Rani',
  'Iqbal Hussain',   'Parveen Devi',    'Feroz Ahmad',    'Manjula Devi',
  'Abid Hussain',    'Laxmi Devi',      'Zubair Ahmad',   'Champa Devi',
  'Rafiq Ahmad',     'Sneh Lata',       'Dilshad Ahmad',  'Bani Devi'
];

// ============================================
// GENERATE 100 VEHICLES ACROSS J&K
// ============================================
function generateVehicles(count = 100) {
  const vehicles = {};
  for (let i = 1; i <= count; i++) {
    const type     = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
    const district = DISTRICT_CODES[Math.floor(Math.random() * DISTRICT_CODES.length)];
    const l1       = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const l2       = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const plate    = `JK-${district}-${l1}${l2}-${String(i).padStart(4, '0')}`;
    const name     = DRIVER_NAMES[(i - 1) % DRIVER_NAMES.length];
    const blood    = BLOOD_GROUPS[Math.floor(Math.random() * BLOOD_GROUPS.length)];
    const lat      = 32.5 + Math.random() * 4.0;
    const lng      = 73.5 + Math.random() * 5.0;

    vehicles[i] = { lat, lng, speed: Math.floor(Math.random() * 60) + 20, name, plate, type, blood, status: 'normal', currentZone: null, rerouted: false };
  }
  return vehicles;
}

let vehiclePositions = generateVehicles(100);
console.log(`✅ Generated ${Object.keys(vehiclePositions).length} vehicles across J&K`);

// ============================================
// CHECK DANGER ZONE
// ============================================
function checkDangerZone(lat, lng) {
  for (const zone of dangerZones) {
    const dist = Math.sqrt(Math.pow(lat - zone.lat, 2) + Math.pow(lng - zone.lng, 2));
    if (dist < zone.radius) return zone;
  }
  return null;
}

// ============================================
// AUTO CHALLAN SYSTEM — Day 6
// ============================================
const challanCooldown     = {};
const CHALLAN_COOLDOWN_MS = 30000;

function calculateFine(speed, limit) {
  const excess = speed - limit;
  if (excess <= 10) return 500;
  if (excess <= 20) return 1000;
  if (excess <= 30) return 2000;
  return 3000;
}

function tryIssueChallan(id, v, zone) {
  if (v.speed <= zone.speedLimit) return;
  const now = Date.now();
  if (now - (challanCooldown[id] || 0) < CHALLAN_COOLDOWN_MS) return;

  // Check if vehicle exists in DB before inserting challan
  db.query('SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?', [id], (err, rows) => {
    if (err || rows.length === 0) return; // skip if not in DB

    challanCooldown[id] = now;
    const fine   = calculateFine(v.speed, zone.speedLimit);
    const excess = v.speed - zone.speedLimit;

    db.query(
      `INSERT INTO challans
        (vehicle_id, violation_type, speed_recorded, speed_limit, zone_name, latitude, longitude, fine_amount, status)
       VALUES (?, 'speeding', ?, ?, ?, ?, ?, ?, 'unpaid')`,
      [id, v.speed, zone.speedLimit, zone.name, v.lat, v.lng, fine],
      (err2) => {
        if (err2) return console.log('⚠️  Challan DB error:', err2.message);
        io.emit('challanIssued', {
          vehicleId : id,
          plate     : v.plate,
          driver    : v.name,
          type      : v.type,
          zone      : zone.name,
          speed     : v.speed,
          limit     : zone.speedLimit,
          excess,
          fine,
          fineLabel : `₹${fine}`,
          lat       : v.lat.toFixed(4),
          lng       : v.lng.toFixed(4),
          time      : new Date().toLocaleTimeString()
        });
        console.log(`💸 Challan: ${v.plate} | ${v.speed}km/h | Fine: ₹${fine}`);
      }
    );
  });
}

// ============================================
// REROUTING SYSTEM — Day 7
// ============================================
const rerouteCooldown     = {};
const REROUTE_COOLDOWN_MS = 60000; // 60 seconds per vehicle

function tryRerouteVehicle(id, v) {
  const now = Date.now();
  if (now - (rerouteCooldown[id] || 0) < REROUTE_COOLDOWN_MS) return;

  const nearBlock = isNearBlockedZone(v.lat, v.lng, 5); // 5km radius
  if (!nearBlock) return;

  rerouteCooldown[id] = now;
  v.rerouted = true;

  const rerouteAlert = {
    vehicleId   : id,
    plate       : v.plate,
    driver      : v.name,
    blockedZone : nearBlock.zoneName,
    reason      : nearBlock.reason,
    detour      : nearBlock.route.detour,
    waypoints   : nearBlock.route.waypoints,
    extraDelay  : nearBlock.route.estimatedDelay,
    vehicleLat  : v.lat.toFixed(4),
    vehicleLng  : v.lng.toFixed(4),
    time        : new Date().toLocaleTimeString()
  };

  io.emit('rerouteAlert', rerouteAlert);
  console.log(`🔀 Reroute: ${v.plate} → bypass ${nearBlock.zoneName} | ${nearBlock.route.estimatedDelay}`);
}

// ============================================
// SIMULATE 100 VEHICLES — every 2 seconds
// ============================================
let tickCount = 0;

function simulateVehicles() {
  tickCount++;
  const dangerAlerts = [];

  Object.keys(vehiclePositions).forEach(id => {
    const v = vehiclePositions[id];
    if (v.status === 'accident') return;

    // Realistic mountain movement
    v.lat += (Math.random() - 0.5) * 0.004;
    v.lng += (Math.random() - 0.5) * 0.004;

    // Keep within J&K bounds
    v.lat = Math.max(32.5, Math.min(36.5, v.lat));
    v.lng = Math.max(73.5, Math.min(78.5, v.lng));
    v.speed = Math.floor(Math.random() * 80) + 15;

    const zone = checkDangerZone(v.lat, v.lng);
    if (zone) {
      v.status      = 'danger';
      v.currentZone = zone.name;
      v.speedLimit  = zone.speedLimit;
      dangerAlerts.push({ vehicleId: id, vehicle: v, zone });
      tryIssueChallan(id, v, zone); // Day 6
    } else {
      v.status      = 'normal';
      v.currentZone = null;
      v.rerouted    = false;
    }

    tryRerouteVehicle(id, v); // Day 7

    // DB log every 5th tick
    if (tickCount % 5 === 0) {
      db.query(
        'INSERT INTO telemetry_logs (vehicle_id, latitude, longitude, speed, is_on_road) VALUES (?, ?, ?, ?, true)',
        [id, v.lat, v.lng, v.speed],
        (err) => { if (err && tickCount <= 2) console.log('Log error:', err.message); }
      );
    }
  });

  // Emit max 3 danger alerts per tick
  dangerAlerts.slice(0, 3).forEach(alert => {
    io.emit('dangerZoneAlert', {
      vehicleId: alert.vehicleId,
      vehicle  : alert.vehicle,
      zone     : alert.zone,
      message  : `Vehicle ${alert.vehicle.plate} entered ${alert.zone.name}`
    });
  });

  io.emit('vehicleUpdate', vehiclePositions);
}

setInterval(simulateVehicles, 2000);

// ============================================
// ACCIDENT — single vehicle + AUTO BLOCK ZONE
// ============================================
app.post('/simulate-accident/:id', (req, res) => {
  const id = req.params.id;
  if (!vehiclePositions[id]) return res.json({ error: 'Vehicle not found' });

  const v  = vehiclePositions[id];
  v.status = 'accident';
  v.speed  = 0;

  const alert = {
    vehicleId : id, vehicle: v,
    timestamp : new Date().toLocaleTimeString(),
    message   : `🚨 ACCIDENT — ${v.plate} — ${v.name} — ${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`
  };

  db.query(
    'INSERT INTO incidents (vehicle_id, incident_type, latitude, longitude, severity, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, 'accident', v.lat, v.lng, 'critical', alert.message, 'active'],
    (err) => { if (err) console.log('Incident error:', err.message); }
  );

  io.emit('accidentAlert', alert);

  // AUTO-BLOCK zone if accident is inside a danger zone
  const zone = checkDangerZone(v.lat, v.lng);
  if (zone) {
    const blocked = blockZone(zone.id, `Accident: ${v.plate} at ${zone.name}`);
    if (blocked) {
      io.emit('zoneBlocked', {
        zoneId   : zone.id,
        zoneName : zone.name,
        reason   : blocked.reason,
        detour   : blocked.route.detour,
        waypoints: blocked.route.waypoints,
        delay    : blocked.route.estimatedDelay,
        time     : new Date().toLocaleTimeString()
      });
      console.log(`🚧 Auto-blocked Zone ${zone.id}: ${zone.name}`);
    }
  }

  res.json({ success: true, alert, zoneBlocked: zone ? zone.name : null });
});

// ============================================
// MASS ACCIDENT — 5 random vehicles
// ============================================
app.post('/simulate-mass-accident', (req, res) => {
  const ids    = Object.keys(vehiclePositions);
  const chosen = [];
  let attempts = 0;
  while (chosen.length < 5 && attempts < 200) {
    const rid = ids[Math.floor(Math.random() * ids.length)];
    if (!chosen.includes(rid) && vehiclePositions[rid].status !== 'accident') chosen.push(rid);
    attempts++;
  }

  const alerts      = [];
  const blockedInfo = [];

  chosen.forEach(id => {
    const v  = vehiclePositions[id];
    v.status = 'accident';
    v.speed  = 0;
    const alert = { vehicleId: id, vehicle: v, timestamp: new Date().toLocaleTimeString(), message: `🚨 MASS ACCIDENT — ${v.plate} — ${v.name}` };

    db.query('INSERT INTO incidents (vehicle_id, incident_type, latitude, longitude, severity, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, 'accident', v.lat, v.lng, 'critical', alert.message, 'active'], () => {});

    io.emit('accidentAlert', alert);
    alerts.push(alert);

    const zone = checkDangerZone(v.lat, v.lng);
    if (zone) {
      const blocked = blockZone(zone.id, `Mass Accident: ${v.plate} at ${zone.name}`);
      if (blocked) {
        io.emit('zoneBlocked', {
          zoneId   : zone.id,
          zoneName : zone.name,
          reason   : blocked.reason,
          detour   : blocked.route.detour,
          waypoints: blocked.route.waypoints,
          delay    : blocked.route.estimatedDelay,
          time     : new Date().toLocaleTimeString()
        });
        blockedInfo.push(zone.name);
      }
    }
  });

  res.json({ success: true, count: chosen.length, alerts, zonesBlocked: blockedInfo });
});

// ============================================
// RESET — single vehicle
// ============================================
app.post('/reset-vehicle/:id', (req, res) => {
  const id = req.params.id;
  if (!vehiclePositions[id]) return res.json({ error: 'Vehicle not found' });
  vehiclePositions[id].status      = 'normal';
  vehiclePositions[id].speed       = 40;
  vehiclePositions[id].currentZone = null;
  vehiclePositions[id].rerouted    = false;
  io.emit('vehicleUpdate', vehiclePositions);
  res.json({ success: true });
});

// ============================================
// RESET ALL
// ============================================
app.post('/reset-all', (req, res) => {
  Object.keys(vehiclePositions).forEach(id => {
    vehiclePositions[id].status      = 'normal';
    vehiclePositions[id].speed       = 40;
    vehiclePositions[id].currentZone = null;
    vehiclePositions[id].rerouted    = false;
  });
  io.emit('vehicleUpdate', vehiclePositions);
  res.json({ success: true, message: 'All 100 vehicles reset' });
});

// ============================================
// FLEET STATS
// ============================================
app.get('/fleet-stats', (req, res) => {
  const stats = { total: 0, normal: 0, danger: 0, accident: 0, rerouted: 0 };
  Object.values(vehiclePositions).forEach(v => {
    stats.total++;
    stats[v.status]++;
    if (v.rerouted) stats.rerouted++;
  });
  res.json(stats);
});

// ============================================
// CHALLAN STATS — Day 6
// ============================================
app.get('/challan-stats', (req, res) => {
  db.query(
    `SELECT
       COUNT(*)                                            AS total_challans,
       COALESCE(SUM(fine_amount), 0)                      AS total_fines,
       SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) AS unpaid,
       SUM(CASE WHEN status = 'paid'   THEN 1 ELSE 0 END) AS paid,
       COALESCE(MAX(speed_recorded), 0)                   AS max_speed_recorded,
       COALESCE(AVG(speed_recorded), 0)                   AS avg_speed_recorded
     FROM challans`,
    (err, results) => {
      if (err) return res.json({ error: err.message });
      res.json(results[0]);
    }
  );
});

// ============================================
// PAY CHALLAN
// ============================================
app.post('/challans/:id/pay', (req, res) => {
  db.query(
    `UPDATE challans SET status = 'paid' WHERE challan_id = ?`,
    [req.params.id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      if (result.affectedRows === 0) return res.json({ error: 'Challan not found' });
      res.json({ success: true, message: `Challan #${req.params.id} marked as paid` });
    }
  );
});

// ============================================
// REROUTING ROUTES — Day 7
// ============================================

app.get('/blocked-zones', (req, res) => {
  const blocked = getBlockedZones();
  res.json({ message: '✅ Blocked zones retrieved', total: Object.keys(blocked).length, zones: blocked });
});

app.post('/block-zone/:zoneId', (req, res) => {
  const zoneId  = parseInt(req.params.zoneId);
  const { reason } = req.body;
  const blocked = blockZone(zoneId, reason);
  if (!blocked) return res.json({ error: `Zone ${zoneId} not found` });

  io.emit('zoneBlocked', {
    zoneId   : zoneId,
    zoneName : blocked.zoneName,
    reason   : blocked.reason,
    detour   : blocked.route.detour,
    waypoints: blocked.route.waypoints,
    delay    : blocked.route.estimatedDelay,
    time     : new Date().toLocaleTimeString()
  });

  res.json({ success: true, blocked });
});

app.post('/clear-zone/:zoneId', (req, res) => {
  const zoneId  = parseInt(req.params.zoneId);
  const cleared = clearZone(zoneId);
  if (!cleared) return res.json({ error: `Zone ${zoneId} is not blocked` });

  io.emit('zoneCleared', {
    zoneId   : cleared.zoneId,
    zoneName : cleared.zoneName,
    message  : `✅ ${cleared.zoneName} is now clear — normal traffic resumed`,
    time     : new Date().toLocaleTimeString()
  });

  res.json({ success: true, cleared });
});

app.get('/alternate-route/:zoneId', (req, res) => {
  const route = getAlternateRoute(parseInt(req.params.zoneId));
  if (!route) return res.json({ error: 'Zone not found' });
  res.json({ success: true, route });
});

// ============================================
// STANDARD ROUTES
// ============================================
app.get('/', (req, res) => res.json({
  message    : '🚀 HillSafe AI v7.0',
  vehicles   : 100,
  dangerZones: dangerZones.length,
  features   : ['Auto Challan System', 'Accident Rerouting']
}));
app.get('/positions', (req, res) => res.json({ positions: vehiclePositions }));
app.get('/vehicles', (req, res) => {
  db.query('SELECT * FROM vehicles', (err, results) => {
    if (err) return res.json({ error: err.message });
    res.json({ message: '✅ Vehicles retrieved', total: results.length, vehicles: results });
  });
});
app.get('/vehicles/id/:id', (req, res) => {
  db.query('SELECT * FROM vehicles WHERE vehicle_id = ?', [parseInt(req.params.id)], (err, results) => {
    if (err) return res.json({ error: err.message });
    res.json(results.length === 0 ? { message: '❌ Not found' } : { vehicle: results[0] });
  });
});
app.get('/vehicles/plate/:plate', (req, res) => {
  db.query('SELECT * FROM vehicles WHERE registration_number = ?', [req.params.plate], (err, results) => {
    if (err) return res.json({ error: err.message });
    res.json(results.length === 0 ? { message: '❌ Not found' } : { vehicle: results[0] });
  });
});
app.get('/zones', (req, res) => {
  db.query('SELECT * FROM zones', (err, results) => {
    if (err) return res.json({ error: err.message });
    res.json({ message: '✅ Zones retrieved', total: results.length, zones: results });
  });
});
app.get('/drivers', (req, res) => {
  db.query(`SELECT drivers.*, vehicles.registration_number, vehicles.vehicle_type, vehicles.blood_group, vehicles.emergency_contact FROM drivers JOIN vehicles ON drivers.vehicle_id = vehicles.vehicle_id`, (err, results) => {
    if (err) return res.json({ error: err.message });
    res.json({ message: '✅ Drivers retrieved', total: results.length, drivers: results });
  });
});
app.get('/challans', (req, res) => {
  db.query(`SELECT challans.*, vehicles.registration_number, vehicles.owner_name FROM challans JOIN vehicles ON challans.vehicle_id = vehicles.vehicle_id ORDER BY challans.created_at DESC`, (err, results) => {
    if (err) return res.json({ error: err.message });
    res.json({ message: '✅ Challans retrieved', total: results.length, challans: results });
  });
});
app.get('/incidents', (req, res) => {
  db.query(`SELECT incidents.*, vehicles.registration_number, vehicles.owner_name, vehicles.blood_group, vehicles.emergency_contact FROM incidents JOIN vehicles ON incidents.vehicle_id = vehicles.vehicle_id`, (err, results) => {
    if (err) return res.json({ error: err.message });
    res.json({ message: '✅ Incidents retrieved', total: results.length, incidents: results });
  });
});

// ============================================
// SOCKET.IO
// ============================================
io.on('connection', (socket) => {
  console.log('📡 Dashboard connected:', socket.id);
  socket.emit('vehicleUpdate', vehiclePositions);

  // Send current blocked zones on connect
  const blocked = getBlockedZones();
  if (Object.keys(blocked).length > 0) socket.emit('currentBlockedZones', blocked);

  socket.on('disconnect', () => console.log('📡 Disconnected:', socket.id));
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 HillSafe AI v7.0 — Accident Rerouting System`);
  console.log(`🌍 Dashboard:         http://localhost:${PORT}`);
  console.log(`📍 Live Positions:    http://localhost:${PORT}/positions`);
  console.log(`📊 Fleet Stats:       http://localhost:${PORT}/fleet-stats`);
  console.log(`🔴 Zones:             http://localhost:${PORT}/zones`);
  console.log(`🚗 Vehicles (DB):     http://localhost:${PORT}/vehicles`);
  console.log(`👤 Drivers:           http://localhost:${PORT}/drivers`);
  console.log(`💸 Challans:          http://localhost:${PORT}/challans`);
  console.log(`📈 Challan Stats:     http://localhost:${PORT}/challan-stats`);
  console.log(`🚨 Incidents:         http://localhost:${PORT}/incidents`);
  console.log(`🚧 Blocked Zones:     http://localhost:${PORT}/blocked-zones`);
  console.log(`🔀 Alternate Routes:  http://localhost:${PORT}/alternate-route/:zoneId`);
  console.log(`📡 Socket.io:         100 vehicles live\n`);
});