// traffic_service.js — HillSafe AI
// Real live traffic for all 8 J&K danger zones using TomTom Traffic API
// Free tier: 2,500 requests/day, no credit card needed
// Get your free key: https://developer.tomtom.com/  (2-minute signup)

const TOMTOM_KEY = process.env.TOMTOM_API_KEY || '';

const ZONES = [
  { id:1, name:'Banihal Pass Curve',   lat:33.5120, lng:75.2000 },
  { id:2, name:'Zoji La Summit',       lat:34.2600, lng:75.4800 },
  { id:3, name:'Jawahar Tunnel Entry', lat:33.3200, lng:75.1500 },
  { id:4, name:'Rohtang Pass',         lat:32.3714, lng:77.2441 },
  { id:5, name:'Sinthan Top',          lat:33.6500, lng:75.5000 },
  { id:6, name:'Mughal Road Curve',    lat:33.4800, lng:74.5200 },
  { id:7, name:'Nathatop Blind Curve', lat:33.0500, lng:75.1000 },
  { id:8, name:'Patnitop Hairpin',     lat:33.1000, lng:75.2800 },
  { id:9, name:'Peer Ki Gali',         lat:33.6167, lng:74.7333 },
  { id:10,name:'Sonamarg',             lat:34.3020, lng:75.2941 },
  { id:11,name:'Delhi – ITO Chowk',    lat:28.6304, lng:77.2426 },
];

const cache = {};

// ── Simulated fallback (used if no API key, or TomTom unreachable) ──
// Keeps the demo working even with zero internet or no key configured —
// same philosophy as weather_service.js's fallback.
function simulateCongestion(z) {
  // deterministic-ish pseudo-randomness per zone so it looks stable per run
  const seed = z.id * 37 % 100;
  const congestionRatio = +(0.45 + (seed % 55) / 100).toFixed(2); // 0.45–1.0
  return buildResult(z, {
    currentSpeed: Math.round(z.id * 6 + 20),
    freeFlowSpeed: 60,
    congestionRatio,
    roadClosure: false,
    simulated: true,
  });
}

function buildResult(z, d) {
  const pctSlower = Math.round((1 - d.congestionRatio) * 100);
  let level = 'CLEAR', color = '#00e676';
  if (d.roadClosure)            { level = 'CLOSED';   color = '#ff2020'; }
  else if (d.congestionRatio < 0.4)  { level = 'SEVERE';  color = '#ff2020'; }
  else if (d.congestionRatio < 0.6)  { level = 'HEAVY';   color = '#ff8c00'; }
  else if (d.congestionRatio < 0.8)  { level = 'MODERATE';color = '#ffd700'; }

  return {
    zoneId: z.id,
    zoneName: z.name,
    currentSpeed: d.currentSpeed,
    freeFlowSpeed: d.freeFlowSpeed,
    congestionRatio: d.congestionRatio,   // 1.0 = free flow, lower = worse
    percentSlower: pctSlower,
    roadClosure: d.roadClosure,
    level, color,
    simulated: !!d.simulated,
    // reroute is worth suggesting once traffic is HEAVY/SEVERE/CLOSED
    rerouteRecommended: level === 'HEAVY' || level === 'SEVERE' || level === 'CLOSED',
    fetchedAt: new Date().toLocaleTimeString(),
  };
}

async function fetchZone(z) {
  if (!TOMTOM_KEY) return simulateCongestion(z);
  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json` +
                `?key=${TOMTOM_KEY}&point=${z.lat},${z.lng}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`TomTom HTTP ${res.status}`);
    const data = await res.json();
    const f    = data.flowSegmentData;
    if (!f) throw new Error('no flowSegmentData in response');
    const congestionRatio = f.freeFlowSpeed > 0
      ? +(f.currentSpeed / f.freeFlowSpeed).toFixed(2)
      : 1.0;
    return buildResult(z, {
      currentSpeed: f.currentSpeed,
      freeFlowSpeed: f.freeFlowSpeed,
      congestionRatio,
      roadClosure: !!f.roadClosure,
      simulated: false,
    });
  } catch (err) {
    // Network down / key invalid / rate-limited → fall back gracefully,
    // never crash the demo.
    return simulateCongestion(z);
  }
}

async function fetchAllTraffic() {
  console.log(`🚦 Fetching live traffic for 8 zones${TOMTOM_KEY ? '' : ' (simulated — no TOMTOM_API_KEY set)'}...`);
  const results = await Promise.all(ZONES.map(fetchZone));
  results.forEach(t => { cache[t.zoneId] = t; });
  const bad = results.filter(t => t.rerouteRecommended);
  if (bad.length) {
    console.log('🔀 Reroute recommended:');
    bad.forEach(t => console.log(`   ${t.level === 'CLOSED' ? '🚧' : '🐌'} ${t.zoneName} — ${t.level} (${t.percentSlower}% slower than free flow)`));
  } else {
    console.log('✅ All zones flowing normally');
  }
  return results;
}

const getTraffic     = id => cache[id] || null;
const getAllTraffic  = ()  => ({ ...cache });
const isCongested    = id  => !!(cache[id]?.rerouteRecommended);

module.exports = { fetchAllTraffic, getTraffic, getAllTraffic, isCongested, ZONES };
