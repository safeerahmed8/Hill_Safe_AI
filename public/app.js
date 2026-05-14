const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let vehiclePositions = {};
let cachedZones = [];

// ============================================
// HELPERS
// ============================================
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapVehicleType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('truck')) return 'Truck';
  if (t.includes('bus')) return 'Bus';
  if (t.includes('bike')) return 'Bike';
  return 'Car';
}

function getFunnyHindiVoice(type, payload = {}) {
  const plate = payload.plate || 'gaadi';
  const name = payload.name || 'driver sahab';
  const zone = payload.zoneName || 'danger zone';

  const messages = {
    overspeed: `Arre ${name} ji, ${plate} ko hawai jahaz mat banao. ${zone} mein speed kam rakho.`,
    blind_turn: `Blind turn hai bhai! Dheere chalo.`,
    single_lane: `Single lane road hai, araam se chalo.`,
    truck_priority: `Heavy truck aa raha hai, side le lo.`,
    accident: `Emergency! ${plate} ka accident detect ho gaya.`,
    danger_zone: `Warning! ${plate} danger zone mein hai.`,
    reset: `${plate} normal mode mein aa gayi.`,
    auth_underage: `Driver 18 se chhota hai. Gaadi roko.`,
    auth_license: `License valid nahi hai.`,
    auth_unauthorized: `Driver authorized nahi hai.`,
    ecu: `System ne speed control kar di hai.`,
    stop: `${plate} ruk jao. Saamne vehicle aa rahi hai.`,
    default: `Safe driving karo.`
  };

  return messages[type] || messages.default;
}

function emitAnimation(type, vehicle, extra = {}) {
  io.emit('animationTrigger', { type, vehicle, extra });
}

function emitResponseSteps(type, vehicle, extra = {}) {
  io.emit('responseSteps', {
    type,
    vehicle,
    steps: [`Processing ${type}`, 'System responding', 'Safety action executed']
  });
}

function findZoneForVehicle(lat, lng) {
  for (const z of cachedZones) {
    const d = getDistanceKm(lat, lng, z.latitude, z.longitude);
    if (d <= (z.radius_meters / 1000)) return z;
  }
  return null;
}

async function checkDriverAuth(vehicleId, v) {
  return new Promise((resolve) => {
    db.query('SELECT * FROM drivers WHERE vehicle_id=?', [vehicleId], (err, res) => {
      if (err || !res.length) return resolve(true);

      const d = res[0];

      if (d.age < 18) {
        v.status = 'blocked';
        io.emit('authAlert', {
          vehicle: v,
          message: `Underage driver (${v.plate})`,
          voice: getFunnyHindiVoice('auth_underage')
        });
        return resolve(false);
      }

      if (d.license_valid === 0) {
        v.status = 'blocked';
        io.emit('authAlert', {
          vehicle: v,
          message: `Invalid license (${v.plate})`,
          voice: getFunnyHindiVoice('auth_license')
        });
        return resolve(false);
      }

      return resolve(true);
    });
  });
}

function decideStopVehicle(v1, v2) {
  if (v1.type === 'Truck') return v2;
  if (v2.type === 'Truck') return v1;
  return v1.speed > v2.speed ? v1 : v2;
}

// ============================================
// LOAD DATA
// ============================================
function loadZones() {
  db.query('SELECT * FROM zones', (err, res) => {
    cachedZones = res || [];
  });
}

function loadVehicles() {
  db.query('SELECT * FROM vehicles LIMIT 5', (err, res) => {
    res.forEach((v, i) => {
      vehiclePositions[v.vehicle_id] = {
        lat: 33.5 + i * 0.01,
        lng: 75.1 + i * 0.01,
        speed: 40,
        name: v.owner_name,
        plate: v.registration_number,
        type: mapVehicleType(v.vehicle_type),
        status: 'normal'
      };
    });
  });
}

// ============================================
// SIMULATION
// ============================================
async function simulateVehicles() {
  for (const id of Object.keys(vehiclePositions)) {
    const v = vehiclePositions[id];

    const allowed = await checkDriverAuth(id, v);
    if (!allowed) continue;

    v.lat += (Math.random() - 0.5) * 0.002;
    v.lng += (Math.random() - 0.5) * 0.002;
    v.speed = Math.floor(Math.random() * 80);

    const zone = findZoneForVehicle(v.lat, v.lng);

    if (zone) {
      if (v.speed > zone.speed_limit) {
        v.speed = zone.speed_limit;

        io.emit('ecuControl', {
          vehicle: v,
          message: `${v.plate} speed reduced`,
          voice: getFunnyHindiVoice('ecu')
        });

        emitAnimation('overspeed', v);
      }
    }
  }

  io.emit('vehicleUpdate', vehiclePositions);
}

setInterval(simulateVehicles, 2000);

// ============================================
// ACCIDENT
// ============================================
app.post('/simulate-accident/:id', (req, res) => {
  const id = req.params.id;
  const v = vehiclePositions[id];

  v.status = 'accident';

  db.query(
    `INSERT INTO incidents 
    (vehicle_id, incident_type, latitude, longitude, location, severity, status, incident_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      id,
      'accident',
      v.lat,
      v.lng,
      `${v.lat},${v.lng}`,
      'critical',
      'active'
    ]
  );

  io.emit('accidentAlert', {
    vehicle: v,
    message: `Accident ${v.plate}`,
    voice: getFunnyHindiVoice('accident')
  });

  emitAnimation('accident', v);

  res.json({ success: true });
});

// ============================================
// SOCKET
// ============================================
io.on('connection', (socket) => {
  console.log('Connected:', socket.id);
});

// ============================================
// START
// ============================================
loadZones();
loadVehicles();

server.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});