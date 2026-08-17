// ================================================================
//  sms_service.js — HillSafe AI
//  Twilio SMS Alerts: family + hospital notification on accident
//
//  Setup:
//  1. npm install twilio
//  2. Add to .env:
//     TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxx
//     TWILIO_TOKEN=your_auth_token
//     TWILIO_PHONE=+1234567890   (your Twilio number)
//  3. Sign up free: https://www.twilio.com/try-twilio
//     Free trial gives $15 credit = ~300 SMS
//
//  Usage in server.js:
//  const smsService = require('./sms_service');
//  await smsService.sendAccidentAlert(vehicle, location);
// ================================================================

require('dotenv').config();

// Check if Twilio is configured
const TWILIO_ENABLED = !!(
  process.env.TWILIO_SID &&
  process.env.TWILIO_TOKEN &&
  process.env.TWILIO_PHONE
);

let client = null;
if (TWILIO_ENABLED) {
  const twilio = require('twilio');
  client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  console.log('✅ Twilio SMS service enabled');
} else {
  console.log('⚠️  Twilio not configured — SMS disabled (add TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE to .env)');
}

// ── Emergency contacts (in production: fetch from MySQL drivers table) ──
const EMERGENCY_CONTACTS = {
  '1':  { name:'Mohammad Rafi',   phone:'+919876543210', relation:'Wife' },
  '2':  { name:'Rahul Sharma',    phone:'+919876543211', relation:'Father' },
  '3':  { name:'Priya Singh',     phone:'+919876543212', relation:'Husband' },
  '4':  { name:'Abdul Rashid',    phone:'+919876543213', relation:'Son' },
  '5':  { name:'Vikram Dogra',    phone:'+919876543214', relation:'Brother' },
};

// Hospital contacts
const HOSPITALS = {
  'SMHS':     '+1917806060603', // Srinagar
  'BANIHAL':  '+1917906260027', // Banihal
  'GMC_JAMMU':'+1917912549327', // Jammu
};

// ── SEND ACCIDENT ALERT ─────────────────────────────────────────
async function sendAccidentAlert(vehicle, vehicleId, location) {
  if (!TWILIO_ENABLED) {
    console.log(`📵 SMS not sent (Twilio not configured): Accident — ${vehicle.plate}`);
    return { sent: false, reason: 'Twilio not configured' };
  }

  const contact = EMERGENCY_CONTACTS[vehicleId];
  const results = [];

  // 1. SMS to family
  if (contact) {
    const familyMsg =
      `🚨 HillSafe AI EMERGENCY ALERT!\n` +
      `\n` +
      `Accident detected on J&K mountain road.\n` +
      `\n` +
      `Driver: ${vehicle.name}\n` +
      `Vehicle: ${vehicle.plate}\n` +
      `Blood Group: ${vehicle.blood}\n` +
      `Location: ${vehicle.lat.toFixed(4)}°N, ${vehicle.lng.toFixed(4)}°E\n` +
      `\n` +
      `Ambulance has been dispatched.\n` +
      `\n` +
      `GPS Link:\n` +
      `https://maps.google.com/?q=${vehicle.lat},${vehicle.lng}\n` +
      `\n` +
      `— HillSafe AI · J&K Road Safety`;

    try {
      const msg = await client.messages.create({
        body: familyMsg,
        from: process.env.TWILIO_PHONE,
        to:   contact.phone,
      });
      results.push({ type: 'family', to: contact.phone, sid: msg.sid, status: 'sent' });
      console.log(`✅ SMS sent to family (${contact.relation}): ${contact.phone}`);
    } catch (err) {
      results.push({ type: 'family', to: contact.phone, error: err.message });
      console.log(`❌ SMS to family failed: ${err.message}`);
    }
  }

  // 2. SMS to nearest hospital
  const nearestHospital = getNearestHospital(vehicle.lat, vehicle.lng);
  const hospPhone = HOSPITALS[nearestHospital.code];

  if (hospPhone) {
    const hospMsg =
      `🏥 HillSafe AI — PRE-ALERT\n` +
      `\n` +
      `Accident patient incoming.\n` +
      `\n` +
      `Patient: ${vehicle.name}\n` +
      `Blood Group: ${vehicle.blood}\n` +
      `Vehicle: ${vehicle.plate} (${vehicle.type})\n` +
      `Accident Location: ${vehicle.lat.toFixed(4)}°N\n` +
      `ETA: Approx 15 minutes\n` +
      `\n` +
      `Please prepare trauma bay.\n` +
      `— HillSafe AI Emergency Response`;

    try {
      const msg = await client.messages.create({
        body: hospMsg,
        from: process.env.TWILIO_PHONE,
        to:   hospPhone,
      });
      results.push({ type: 'hospital', hospital: nearestHospital.name, sid: msg.sid, status: 'sent' });
      console.log(`✅ SMS sent to ${nearestHospital.name}`);
    } catch (err) {
      results.push({ type: 'hospital', hospital: nearestHospital.name, error: err.message });
    }
  }

  return { sent: true, results };
}

// ── SEND CHALLAN SMS ─────────────────────────────────────────────
async function sendChallanSMS(vehicle, vehicleId, zone, speed, limit, fine) {
  if (!TWILIO_ENABLED) return { sent: false };

  const msg =
    `💸 HillSafe AI — DIGITAL CHALLAN\n` +
    `\n` +
    `Vehicle: ${vehicle.plate}\n` +
    `Driver: ${vehicle.name}\n` +
    `Zone: ${zone}\n` +
    `Recorded Speed: ${speed} km/h\n` +
    `Speed Limit: ${limit} km/h\n` +
    `Fine Amount: ₹${fine}\n` +
    `\n` +
    `Pay online: https://hillsafe.jk.gov.in/challan\n` +
    `— J&K Traffic Police · HillSafe AI`;

  const contact = EMERGENCY_CONTACTS[vehicleId];
  if (!contact) return { sent: false, reason: 'No contact' };

  try {
    const result = await client.messages.create({
      body: msg, from: process.env.TWILIO_PHONE, to: contact.phone
    });
    console.log(`💸 Challan SMS sent: ${vehicle.plate} → ${contact.phone}`);
    return { sent: true, sid: result.sid };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

// ── SEND GREEN CORRIDOR SMS ───────────────────────────────────────
async function sendCorridorSMS(vehicle, vehicleId, hospitalName, etaMinutes, instruction) {
  if (!TWILIO_ENABLED) return { sent: false };

  const msg =
    `🚑 HillSafe AI — AMBULANCE ALERT\n` +
    `\n` +
    `An ambulance from ${hospitalName} is approaching.\n` +
    `ETA: ~${etaMinutes} minutes\n` +
    `\n` +
    `YOUR ACTION REQUIRED:\n` +
    `${instruction}\n` +
    `\n` +
    `This is an emergency. Please comply immediately.\n` +
    `— HillSafe AI Green Corridor`;

  const contact = EMERGENCY_CONTACTS[vehicleId];
  if (!contact) return { sent: false };

  try {
    const result = await client.messages.create({
      body: msg, from: process.env.TWILIO_PHONE, to: contact.phone
    });
    return { sent: true, sid: result.sid };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

// ── UTILITY ──────────────────────────────────────────────────────
function getNearestHospital(lat, lng) {
  const hospitals = [
    { name:'SMHS Hospital Srinagar', code:'SMHS',     lat:34.089, lng:74.800 },
    { name:'Govt Hospital Banihal',  code:'BANIHAL',  lat:33.490, lng:75.183 },
    { name:'GMC Hospital Jammu',     code:'GMC_JAMMU',lat:32.722, lng:74.855 },
  ];
  let nearest = hospitals[0], minDist = Infinity;
  hospitals.forEach(h => {
    const d = Math.hypot(lat - h.lat, lng - h.lng);
    if (d < minDist) { minDist = d; nearest = h; }
  });
  return nearest;
}

module.exports = { sendAccidentAlert, sendChallanSMS, sendCorridorSMS, TWILIO_ENABLED };
