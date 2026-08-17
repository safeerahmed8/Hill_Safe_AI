# 🏔 HillSafe AI — TECHNICAL NOTES (Developer Reference)

> Yeh document har feature ka **function name**, **file**, **kahan likha hai** (search anchor), aur **kya karta hai** batata hai — taaki tum khud VS Code mein dhundh ke manual changes kar sako.
>
> **Kaise use karo:** Har section mein "🔎 Search for:" diya hai — VS Code mein `Ctrl+F` se woh exact text dhundo, function mil jayega.

---

## 📁 FILE STRUCTURE — kis file mein kya hai

```
server/
├── server.js            ← 95% saara naya logic yahin hai (2300+ lines)
├── db.js                 ← MySQL connection (change nahi kiya)
├── green_corridor.js      ← Purana ambulance corridor system
├── weather_service.js    ← Open-Meteo weather + 11 zones list
├── traffic_service.js    ← TomTom traffic + 11 zones list
├── reroute.js             ← 11 alternate routes (Peer Ki Gali, Sonamarg, Delhi add kiye)
├── sms_service.js        ← Twilio (change nahi kiya)
└── report_service.js     ← PDF reports (change nahi kiya)

public/
├── dashboard.html         ← 95% naya UI yahin add hua (panels, functions)
├── index.html             ← Website (button fixes, connectivity banner)
└── launcher.html          ← Project launcher (button fix, connectivity banner)
```

---

## 1️⃣ SECURITY LAYER

**File:** `server/server.js` | 🔎 Search for: `SECURITY LAYER (added in final hardening pass)`

| Function | Kya karta hai |
|---|---|
| `securityHeaders(req,res,next)` | Har response mein security headers (X-Content-Type-Options etc.) add karta hai |
| `safeVehicleId(id)` | Vehicle ID validate karta hai — 1 se 1000 ke beech int hona chahiye |
| `safeSpeed(spd)` | Speed validate karta hai — 0-300 km/h |
| `safeZoneId(id)` | Zone ID validate karta hai — **ab 1-11** (pehle 1-8 tha, expand kiya) |
| `safeStr(str, maxLen)` | HTML characters strip karta hai (XSS se bachne ke liye) |
| `rateLimit(key, max, windowMs)` | Simple in-memory rate limiter — Map use karta hai |

**Agar tumhe zone limit badhani ho** (12th zone add karna ho): `safeZoneId` mein `n <= 11` ko `n <= 12` karo.

---

## 2️⃣ GRACEFUL ERROR HANDLING

**File:** `server/server.js` | 🔎 Search for: `Graceful port-conflict handling`

- `server.on('error', ...)` — agar port 3000 already use mein hai, crash ki jagah friendly message deta hai (exact `taskkill` command bata deta hai)
- `/api/health` endpoint — 🔎 Search for: `Health check — used by frontend`

---

## 3️⃣ DANGER ZONES (ab 11 hain, pehle 8 the)

**File:** `server/server.js` | 🔎 Search for: `const dangerZones = [`

```js
{ id: 1-8,  ...original J&K mountain zones... }
{ id: 9,    name: 'Peer Ki Gali' }      // Mughal Road route
{ id: 10,   name: 'Sonamarg' }          // Srinagar-Leh route
{ id: 11,   name: 'Delhi – ITO Chowk' } // Urban zone
```

**Har zone ke fields:** `lat, lng, radius, speedLimit, lanes, zoneType ('MOUNTAIN'|'URBAN'), roadCapacityPerHr, altitudeM`

**⚠️ IMPORTANT:** Yeh array 3 jagah aur bhi hai — agar naya zone add karo, teeno jagah add karna padega:
1. `server/server.js` → `dangerZones` array
2. `server/weather_service.js` → `ZONES` array (🔎 Search: `const ZONES = [`)
3. `server/traffic_service.js` → `ZONES` array (🔎 Search: `const ZONES = [`)
4. `server/reroute.js` → `alternateRoutes` object (🔎 Search: `const alternateRoutes = {`)

**ROUTE_GROUPS** (naya) — 🔎 Search for: `const ROUTE_GROUPS = [`
- 3 named routes: NH44-MAIN, MUGHAL-ROAD, NH1-LEH — har ek zones ka group hai

---

## 4️⃣ SMART REROUTE ENGINE (ML + weather + traffic combine)

**File:** `server/server.js` | 🔎 Search for: `SMART REROUTE ENGINE`

| Function | Kya karta hai |
|---|---|
| `computeSmartReroute(zone, mlScore)` | Severity + weather + traffic + ML score combine karke `combinedRisk` (0-1) nikalta hai. `combinedRisk >= 0.55` → reroute suggest |
| `maybeEmitSmartReroute(zone, mlScore)` | Cooldown check karke (`smartRerouteCooldown`, 60s) socket pe `smartRerouteAlert` emit karta hai |

**Formula (agar weights badalne hon):**
```js
combinedRisk = severityFactor*0.25 + weatherFactor*0.20 + trafficFactor*0.25 + mlScore*0.30
```

**API:** `GET /api/smart-route`, `GET /api/smart-route/:zoneId`

---

## 5️⃣ JAM CLEARANCE PREDICTOR

**File:** `server/server.js` | 🔎 Search for: `JAM CLEARANCE TIME PREDICTOR`

| Function | Kya karta hai |
|---|---|
| `recordZoneSnapshot()` | Har tick (2s) mein har zone ke vehicles ka avg speed + count record karta hai `zoneSpeedHistory` mein (last 15 samples) |
| `simulateCameraQueueCount(zone, sensorCount)` | Camera queue count simulate karta hai (real camera na hone par) |
| `computeJamClearance(zoneId)` | Speed ratio + trend dekh ke ETA minutes nikalta hai. Status: FLOWING/LIGHT_JAM/MODERATE_JAM/SEVERE_JAM |

**Formula:** `etaMinutes = cameraCount * congestion * trendFactor * 0.9`

**API:** `GET /api/jam-clearance`, `GET /api/jam-clearance/:zoneId`
**Socket:** `jamClearanceUpdate` (har 10 sec broadcast)

---

## 6️⃣ AI LANE MARSHAL (virtual traffic policeman)

**File:** `server/server.js` | 🔎 Search for: `AI LANE MARSHAL — virtual traffic policeman`

| Function | Kya karta hai |
|---|---|
| `computeLaneMarshalPlan(zoneId)` | Zone ke vehicles ko direction (A/B) mein baant ke lane assign karta hai. Agar accident hai → `PILOT_SINGLE_LANE` mode (45s alternating) |
| `maybeEmitLaneMarshal(zone)` | Cooldown check (`laneMarshalCooldown`, 15s), plan broadcast karta hai |

**Key constant:** `PILOT_CYCLE_MS = 45000` (accident hone par kitni der ek direction move kare)

**API:** `GET /api/lane-marshal`, `GET /api/lane-marshal/:zoneId`
**Socket:** `laneMarshalPlan`

---

## 7️⃣ V2V COOPERATIVE SAFETY (cascade + wrong-turn prevention)

**File:** `server/server.js` | 🔎 Search for: `V2V COOPERATIVE SAFETY LAYER`

| Function | Kya karta hai |
|---|---|
| `dirOfVehicle(id)` | Vehicle ID even/odd se direction A/B decide karta hai (simulated heading) |
| `detectSuddenDeceleration(id, v, priorSpeed)` | Agar speed 35+ km/h drop ho → same-direction nearby vehicles ka ECU auto-slow karta hai |
| `detectWrongTurnAndPrevent(id, v, priorLat, priorLng)` | Bina indicator ke sharp swerve detect → **turant** us vehicle ka ECU 20km/h pe cap (accident prevention) |

**Key constants:** `SUDDEN_DROP_KMH=35`, `SWERVE_THRESHOLD_DEG=0.006`, `V2V_PROXIMITY_DEG=0.05`

**Vehicle object mein naye fields** (🔎 Search: `v2vOnline`):
```js
prevSpeed, prevLat, prevLng   // pichle tick ki values (comparison ke liye)
indicator                     // 'LEFT'|'RIGHT'|'NONE'
v2vOnline                     // true/false (~8% vehicles "offline" simulate)
ecuLockedAt                   // kab lock hua (auto-release ke liye, 25s baad)
```

**Auto-release:** Main tick loop mein (🔎 Search: `V2V-triggered locks release automatically`) — 25 sec baad ECU lock khud hat jaata hai.

**API:** `GET /api/v2v-safety-stats`
**Socket:** `suddenDecelerationCascade`, `wrongTurnPrevented`

---

## 8️⃣ V2V FALLBACK / NETWORK HEALTH (agar V2V kaam na kare)

**File:** `server/server.js` | 🔎 Search for: `V2V NETWORK HEALTH + FAULT-TOLERANCE`

- `detectSuddenDeceleration` mein: agar `v.v2vOnline === false` → cascade nahi hota, sirf `v2vFallbackEvent` emit hota hai (honest limitation)
- `detectWrongTurnAndPrevent` mein: self-protection **hamesha** chalta hai (V2V ki zaroorat nahi), sirf "warn nearby" V2V pe depend karta hai

**API:**
- `GET /api/v2v-network-health` — kitne % vehicles online hain + fallback layers ki list
- `POST /api/v2v-toggle/:vehicleId` — **demo ke liye** kisi vehicle ka V2V manually on/off karo

---

## 9️⃣ BLACK BOX FORENSIC RECONSTRUCTION

**File:** `server/server.js` | 🔎 Search for: `BLACK BOX + FORENSIC RECONSTRUCTION`

| Function | Kya karta hai |
|---|---|
| `recordBlackBox(id, v)` | Har tick vehicle ki state (speed/lat/lng/indicator) `v.blackBox` array mein push karta hai (max 30 samples = ~60s) |
| `captureForensicPackage(vehicleId, vehicle, zone)` | Accident hone par: vehicle ka black box + nearby "witness" vehicles + weather/traffic conditions freeze karta hai |
| `generateForensicReport(pkg)` | Timeline banata hai: "T-12s: 19km/h... T-4s: SUDDEN DECELERATION... T-0s: accident" |

**Kahan call hota hai:** `app.post('/simulate-accident/:id', ...)` ke andar — 🔎 Search: `Black box + witness data frozen`

**API:** `GET /api/forensics`, `GET /api/forensics/:incidentKey`, `GET /api/forensics/vehicle/:vehicleId`
**Socket:** `forensicCaptured`

---

## 🔟 OVERTAKE DETECTION + SAFETY ASSIST

**File:** `server/server.js` | 🔎 Search for: `OVERTAKE DETECTION + SAFETY ASSIST`

| Function | Kya karta hai |
|---|---|
| `detectOvertakes()` | Sab vehicle pairs check karta hai (same direction, close, 10+ km/h speed diff) → overtake detect karke dono ki speed adjust karta hai |

**Kaise adjust hoti hai speed:**
- Overtake karne wali vehicle → zone speed limit pe cap
- Overtake ho rahi vehicle → 90% speed pe "yield" (gap banane ke liye)

**Key constants:** `OVERTAKE_PROXIMITY_DEG=0.06`, `OVERTAKE_SPEED_DELTA=10`

**Kahan call hota hai:** `simulateVehicles()` function ke end mein — 🔎 Search: `detectOvertakes();`

**API:** `GET /api/overtakes`
**Socket:** `overtakeDetected`

---

## 1️⃣1️⃣ JAM ROOT-CAUSE CLASSIFIER (Infrastructure vs Behavioural)

**File:** `server/server.js` | 🔎 Search for: `JAM ROOT-CAUSE CLASSIFIER`

| Function | Kya karta hai |
|---|---|
| `isPeakHour()` | Current hour check karta hai (8-11am, 5-8pm = peak) |
| `computeJamRootCause(zoneId)` | Vehicle count vs road capacity (`occupancyRatio`) + violations per vehicle dekh ke classify karta hai: `INFRASTRUCTURE` / `BEHAVIOURAL` / `MIXED` / `UNCLEAR` / `NO_JAM` |
| `generateAuthorityReport(zoneId)` | NHAI (highway) ya Traffic Dept (urban) ko bhejne layak formatted report banata hai |

**Classification logic:**
```
occupancyRatio > 1.3           → INFRASTRUCTURE (flyover/widening chahiye)
violationsPerVehicle > 0.15    → BEHAVIOURAL (enforcement chahiye)
dono                           → MIXED
```

**API:** `GET /api/jam-root-cause`, `GET /api/jam-root-cause/:zoneId`, `GET /api/authority-report/:zoneId`

---

## 1️⃣2️⃣ DAILY ACTIVITY LOG (evening consolidated challan)

**File:** `server/server.js` | 🔎 Search for: `DAILY ACTIVITY LOG + END-OF-DAY`

| Function | Kya karta hai |
|---|---|
| `resetDailyLogIfNewDay()` | Naya din shuru hote hi purana log clear karta hai |
| `logDailyActivity(vehicleId, entry)` | Kisi bhi violation/challan ko us vehicle ke daily log mein add karta hai |
| `computeDailySummary(vehicleId)` | Poore din ka total (entries count, total fine, type breakdown) nikalta hai |

**LANE_VIOLATION** (naya alert type, 🔎 Search: `type    : 'LANE_VIOLATION'`) — turant challan NAHI deta, sirf log karta hai (`isMinor: true` flag)

**API:** `GET /api/daily-report`, `GET /api/daily-report/:vehicleId`, `POST /api/daily-report/:vehicleId/send`
**Socket:** `dailyChallanSummary`

---

## 1️⃣3️⃣ LIVE TRAFFIC (TomTom)

**File:** `server/traffic_service.js` (poori file naya)

| Function | Kya karta hai |
|---|---|
| `fetchZone(z)` | TomTom API se ek zone ka traffic fetch karta hai (key na ho toh simulate) |
| `fetchAllTraffic()` | Sab 11 zones ka traffic fetch karta hai |
| `getTraffic(id)`, `getAllTraffic()` | Cache se data return karta hai |

**server.js mein wiring:** 🔎 Search: `Fetch live traffic every 5 minutes`

**API:** `GET /api/traffic`, `GET /api/traffic/:zoneId`, `GET /api/traffic-config`

---

## 📊 DASHBOARD.HTML — UI Panels (right sidebar, top se neeche)

| Panel | HTML ID | Render Function | Socket Listener |
|---|---|---|---|
| Alert Log | `#alog` | `addLog()` | `dangerZoneAlert` etc. |
| Smart Reroute | `#rerouteLog` | `addRerouteLogEntry()` | `smartRerouteAlert` |
| Jam Clearance | `#jamLog` | `renderJamClearance()` | `jamClearanceUpdate` |
| AI Lane Marshal | `#marshalLog` | `renderLaneMarshal()` | `laneMarshalPlan` |
| V2V Cooperative Safety | `#v2vLog` + `#v2vStats` | `addV2VLogEntry()` | `suddenDecelerationCascade`, `wrongTurnPrevented`, `v2vFallbackEvent` |
| Overtake Assist | `#overtakeLog` | `addOvertakeLogEntry()` | `overtakeDetected` |
| Infrastructure Assessment | `#rootCauseLog` | `loadRootCause()` (polls every 20s) | — (fetch based) |

**Vehicle popup buttons** (🔎 Search: `function mkPop`):
- "📋 Today's Activity Report" → `showDailyReport(id)`
- "🔍 Black Box Reconstruction" → `showForensicReport(id)` (sirf accident status vehicles pe dikhta hai)

**Live Traffic toggle** (map overlay): 🔎 Search: `function toggleTraffic`

---

## 🔧 COMMON PATTERNS (agar khud naya feature add karna ho)

**1. Cooldown pattern** (spam se bachne ke liye):
```js
const xyzCooldown = {};
const XYZ_COOLDOWN_MS = 20000;
function detectXyz(id) {
  const now = Date.now();
  if (now - (xyzCooldown[id] || 0) < XYZ_COOLDOWN_MS) return;
  xyzCooldown[id] = now;
  // ... logic
}
```

**2. Naya API endpoint add karna:**
```js
app.get('/api/my-feature/:zoneId', (req, res) => {
  const zoneId = safeZoneId(req.params.zoneId);
  if (!zoneId) return res.status(400).json({ error: 'Invalid zone ID' });
  res.json({ success: true, /* data */ });
});
```

**3. Naya socket event dashboard tak bhejna:**
```js
// server.js mein:
io.emit('myNewEvent', { data: '...' });

// dashboard.html mein:
sock.on('myNewEvent', d => { /* render karo */ });
```

**4. Naya zone add karna** — 4 files edit karo (Section 3️⃣ dekho upar)

---

## ⚠️ TESTING — changes karne ke baad hamesha yeh chalao

```bash
node --check server/server.js     # syntax check
npm start                          # actually chalao
curl http://localhost:3000/api/health   # verify
```

Agar dashboard.html mein JS change kiya:
```bash
python3 -c "
import re, subprocess
with open('public/dashboard.html') as f: s=f.read()
for i,sc in enumerate(re.findall(r'<script[^>]*>(.*?)</script>', s, re.DOTALL)):
    open('/tmp/check.js','w').write(sc)
    r = subprocess.run(['node','--check','/tmp/check.js'], capture_output=True, text=True)
    print(f'script {i}:', 'OK' if r.returncode==0 else r.stderr[:200])
"
```

---

## 📌 QUICK REFERENCE — sab API endpoints (14 total)

```
GET  /api/health
GET  /api/weather              GET /api/weather/:zoneId
GET  /api/traffic              GET /api/traffic/:zoneId       GET /api/traffic-config
GET  /api/smart-route          GET /api/smart-route/:zoneId
GET  /api/jam-clearance        GET /api/jam-clearance/:zoneId
GET  /api/lane-marshal         GET /api/lane-marshal/:zoneId
GET  /api/v2v-safety-stats
GET  /api/v2v-network-health   POST /api/v2v-toggle/:vehicleId
GET  /api/forensics            GET /api/forensics/:incidentKey   GET /api/forensics/vehicle/:vehicleId
GET  /api/overtakes
GET  /api/routes
GET  /api/jam-root-cause       GET /api/jam-root-cause/:zoneId   GET /api/authority-report/:zoneId
GET  /api/daily-report         GET /api/daily-report/:vehicleId  POST /api/daily-report/:vehicleId/send
POST /simulate-accident/:id
```

---

*Yeh notes har baar update karwa sakte ho — bas kaho "notes update karo naye feature ke saath".*
