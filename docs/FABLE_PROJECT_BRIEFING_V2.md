# 🏔 HILLSAFE AI — COMPLETE PROJECT BRIEFING FOR CLAUDE FABLE (v2 — Updated)

> **Paste this entire document as your first message to Claude Fable** when you start a new
> conversation there. It gives Fable full context so it can continue building and fixing bugs
> without me re-explaining anything. This replaces any earlier briefing — this is current.

---

## 1. WHO I AM & WHAT THIS PROJECT IS

I'm **Safeer Ahmed**, a B.Tech CSE student (J&K, India) building **HillSafe AI** — a full-stack
AI-powered mountain road safety system, now covering three named highway corridors plus a
Delhi urban traffic zone:

- **Jammu → Srinagar via NH-44** (main highway)
- **Jammu → Srinagar via Mughal Road / Peer Ki Gali** (alternate route)
- **Srinagar → Leh via Sonamarg & Zoji La** (NH-1)
- **Delhi — ITO Chowk** (urban zone, used for infrastructure-vs-behaviour jam analysis)

**Why I built it:** I grew up watching accidents happen on J&K mountain roads with no ambulance
arriving in time. This project is my answer.

**Solo developer.**
- **GitHub:** `safeerahmed8/Hill_Safe_AI`
- **Local path:** `C:\Users\User\Desktop\hill_safe_ai\`
- **Targets:** University submission, competition entries, internship applications (Bosch India, ISRO, MapmyIndia, BMW Germany, Mobileye)

---

## 2. TECH STACK

| Layer | Technology |
|---|---|
| Backend | Node.js + Express + Socket.io |
| AI/ML | Python + XGBoost + FastAPI |
| Database | MySQL (12 tables: 8 static reference + 4 dynamic transactional) |
| Frontend | HTML + CSS + Vanilla JS |
| Live Map | Leaflet.js |
| Weather | Open-Meteo API (free, no key) |
| Traffic | TomTom API (free tier, simulated fallback if no key) |
| SMS | Twilio |
| PDF Reports | PDFKit |
| Hardware | ESP32 + ELM327 (OBD-II) + NEO-6M GPS + MPU6050 |
| Voice | Web Speech API — **English (en-US) only**, natural voice preferred |
| Ports | Node.js → `3000` · Python/FastAPI → `5000` |

---

## 3. COMPLETE CURRENT FILE STRUCTURE

```
Hill_Safe_AI/
├── package.json / env_example.txt / .gitignore / README.md / QUICK_START.txt
│
├── server/                     Node.js backend
│   ├── server.js                   Main entry point (~2400 lines — everything wires in here)
│   ├── db.js                       MySQL pool (loads .env from project root explicitly)
│   ├── green_corridor.js           Ambulance corridor system
│   ├── weather_service.js          Open-Meteo, 11 zones
│   ├── traffic_service.js          TomTom traffic, 11 zones
│   ├── reroute.js                  11 alternate routes
│   ├── sms_service.js              Twilio SMS
│   └── report_service.js           PDFKit reports
│
├── ml/
│   ├── hillsafe_ml.py              ★ ACTIVE — synthetic-data XGBoost + FastAPI (port 5000)
│   └── hillsafe_ml_v2.py           Future — real NCRB/iRAD/MySQL data pipeline (cascading fallback to synthetic if no real data found)
│
├── hardware/obd2_firmware.ino      ESP32 firmware (untested on physical hardware)
├── database/hill_safe_ai.sql       12 tables + seed data for all 11 zones
│
├── public/                         (8 files — NOT 10, two were removed, see §6)
│   ├── index.html                  Main website — SINGLE FILE, includes new "Global Comparison" section
│   ├── dashboard.html              Live map dashboard — auto-activates on load (see §7 bug #7)
│   ├── launcher.html               Project launcher — boot sequence + iframe tabs (5 tabs now, not 7)
│   ├── simulation.html             17-phase 2D Canvas simulation
│   ├── driver_app.html             Android PWA driver app
│   ├── hillsafe_realroad.html      Real NH-44 footage + AI overlay — 4 VERIFIED real YouTube IDs
│   ├── hillsafe_portfolio.html     Standalone project portfolio page
│   └── manifest.json               PWA manifest
│
└── docs/
    ├── HillSafe_AI_Presentation.pptx   14-slide deck with speaker notes
    ├── DEMO_SCRIPT.md                  Step-by-step demo runbook
    ├── PROJECT_BRIEFING.md             Earlier handoff doc (superseded by this one)
    ├── TECHNICAL_NOTES.md              ★ Full function-by-function developer reference — READ THIS for exact code locations
    ├── PROBLEM_STATEMENT_AND_IMPACT.md Real-world problems solved + developed-nations comparison
    └── GEMINI_PROMPTS.txt              AI video generation prompts
```

**IMPORTANT — files that used to exist but are now REMOVED (don't recreate unless asked):**
- `public/simulation_4d.html` (Three.js 4D sim) — removed per explicit request
- `public/video_generator.html` (Canvas MediaRecorder video tool) — removed per explicit request
- All references to both were cleaned from launcher.html, index.html, portfolio, README, QUICK_START, and docs. Launcher tabs are now indexed 0–4 (Dashboard, 17-Phase Sim, Driver App, Real Road, Portfolio) — **do not reintroduce 6- or 7-tab indexing.**

---

## 4. EVERY FEATURE BUILT — CURRENT STATE

### Core simulation (server.js)
100 simulated vehicles, 11 danger zones (up from 8 — added Peer Ki Gali, Sonamarg, Delhi ITO
Chowk), Green Corridor, ECU speed lock, auto challan, brake failure cascade.

### Live external data
- **Weather** (Open-Meteo) — real, all 11 zones, 15-min refresh
- **Traffic** (TomTom) — real if `TOMTOM_API_KEY` set in `.env`, else realistic simulated fallback. `/api/traffic-config` tells the frontend whether a real key is present.

### AI decision layers
- **Smart Reroute Engine** — `computeSmartReroute()` combines zone severity + weather + traffic + ML score into `combinedRisk` (0–1); ≥0.55 triggers a reroute suggestion.
- **Jam Clearance Predictor** — `computeJamClearance()` uses rolling per-zone vehicle speed history (`zoneSpeedHistory`, 15 samples) + simulated camera queue count to estimate ETA-to-clear.
- **AI Lane Marshal** — `computeLaneMarshalPlan()` assigns every vehicle in a jammed zone a lane; switches to `PILOT_SINGLE_LANE` alternating mode automatically if an accident is present in that zone.
- **Jam Root-Cause Classifier** — `computeJamRootCause()` distinguishes INFRASTRUCTURE (demand exceeds road capacity → recommend flyover) vs BEHAVIOURAL (adequate capacity, high violation rate → recommend enforcement) vs MIXED vs NO_JAM. `generateAuthorityReport()` produces a submission-ready report addressed to NHAI (highways) or Dept. of Traffic & Road Transportation (urban zones like Delhi).

### V2V Cooperative Safety (the newest major system)
- Every vehicle has `indicator` ('LEFT'/'RIGHT'/'NONE'), `v2vOnline` (~8% randomly offline, simulates real hardware faults), `blackBox` (rolling 30-sample/~60s telemetry history).
- **`detectSuddenDeceleration()`** — 35+ km/h speed drop in one tick cascades a safe-speed ECU cap to nearby same-direction vehicles, **only if the braking vehicle's `v2vOnline` is true**. If false, emits `v2vFallbackEvent` instead — an honest "couldn't broadcast" message.
- **`detectWrongTurnAndPrevent()`** — unsignalled sharp swerve → **self-protection ECU cap ALWAYS applies regardless of v2vOnline** (this is the vehicle's own IMU/GPS, doesn't need external comms); only the "warn nearby vehicles" part depends on `v2vOnline`.
- **`detectOvertakes()`** — pairwise same-direction proximity + 10+ km/h speed delta = overtake; overtaking vehicle capped to zone speed limit, overtaken vehicle eased to 90% speed for a safety gap.
- **V2V Network Health** — `/api/v2v-network-health` shows % online, and `/api/v2v-toggle/:vehicleId` lets you manually flip a vehicle's V2V status live for demo purposes (judges can watch self-protection work even when V2V is "off").
- ECU locks from V2V events auto-release after 25 seconds (`ecuLockedAt` timestamp checked each tick) so vehicles aren't stuck forever.

### Black Box Forensic Reconstruction
- `recordBlackBox()` — every vehicle keeps last ~60s of its own telemetry.
- `captureForensicPackage()` — on accident, freezes that vehicle's black box + nearby "witness" vehicles (V2V proximity) + weather/traffic conditions at that moment.
- `generateForensicReport()` — builds a plain-English timeline ("T-12s: 19 km/h... T-4s: SUDDEN DECELERATION... T-0s: accident").
- Endpoints: `/api/forensics`, `/api/forensics/:incidentKey`, `/api/forensics/vehicle/:vehicleId`.

### Daily Activity Log (evening consolidated notification)
- `LANE_VIOLATION` alert type (V2V-detected, no camera) does **not** trigger an instant challan — it's logged via `logDailyActivity()` into `dailyActivityLog[vehicleId]`.
- `computeDailySummary()` + `/api/daily-report/:vehicleId/send` simulates "it's evening" — bundles the whole day's violations into ONE notification instead of spamming instant challans.

### MySQL Dynamic Persistence (NEW — added late in the build)
Everything above used to be in-memory only (lost on restart). Now it's **also** written to MySQL,
fire-and-forget (`.catch(()=>{})` so a down DB never breaks the live demo):
- `daily_activity_log`, `forensic_incidents`, `jam_root_cause_log`, `v2v_events` — 4 new tables.
- Read-back endpoints: `/api/history/daily-activity`, `/api/history/forensics`, `/api/history/jam-root-cause`, `/api/history/v2v-events` — return **503 with a clear message** if MySQL is unreachable (never crash).
- **Static vs dynamic data principle**: `zones`/`vehicles`/`drivers`/`road_segments` = static seed data (set once). The 4 new tables = dynamic, grow continuously as the sim runs.

### Frontend — `public/index.html` (single-file website)
- Hero, Problem, Features, Demos, Tech, Metrics, **Global Comparison (NEW — real-world problems solved + developed-nations-vs-India comparison table + future use cases)**, Developer, Launch, Footer.
- All navigation is `href="#section"` anchors — **never `onclick` scroll functions**, that caused a bug before (see §7).
- All "Run/Launch" buttons are real `<a href target="_blank">` anchors — **never `window.open()`**, that gets popup-blocked (see §7).

### `public/dashboard.html` (live map)
- Leaflet map, 100 vehicles, all 11 zones, heatmap toggle, Live Traffic toggle (TomTom tile overlay if key present).
- Panels (right sidebar, top to bottom): Alert Log → Smart Reroute → Jam Clearance → AI Lane Marshal → V2V Cooperative Safety (with network-health %) → Overtake Assist → Infrastructure Assessment (root-cause).
- Vehicle popup has two links: "📋 Today's Activity Report" (always) and "🔍 Black Box Reconstruction" (only if vehicle status === 'accident').
- **Voice: English only** (`en-US`), natural-voice preference logic, all alert text rewritten in clear English sentences (not literal Hindi translations).
- **Auto-activates on load** — critical, see bug §7.7.

### `public/launcher.html`
- Boot sequence (5-step checklist animation) → tabbed iframe interface.
- **5 tabs now** (Dashboard, 17-Phase Sim, Driver App, Real Road, Portfolio) — indices 0–4, PAGES array and button `onclick="switchTab(N,this)"` must always stay in sync.
- Status bar shows **real, dynamic** ML connection status (`checkMLStatus()` polls `/api/ml-status` every 8s) — used to be a hardcoded fake-green dot, now genuinely reflects whether Python is reachable.

### `public/hillsafe_realroad.html`
- Real YouTube footage + Canvas AI tracking overlay.
- **4 verified real video IDs** (fixed "Error 153" bug — see §7.9): `5QLM9a7MpOs` (NH-44 Banihal), `8-VziMykIPs` (Zoji La), `SaWdx20Cw5A` (Leh–Srinagar), `w7nxKXvokJU` (Kashmir Valley).
- Small "↗ If video doesn't load, open on YouTube" fallback link, href updates dynamically per selected feed.

---

## 5. NAMED ROUTES + 11 ZONES (server.js `dangerZones` + `ROUTE_GROUPS`)

```
Zones 1-8:  original J&K mountain zones (Banihal, Zoji La, Jawahar Tunnel, Rohtang,
            Sinthan, Mughal Road, Nathatop, Patnitop)
Zone 9:     Peer Ki Gali (Mughal Road alternate route) — CRITICAL, 3490m altitude
Zone 10:    Sonamarg (Srinagar-Leh corridor, approach before Zoji La)
Zone 11:    Delhi – ITO Chowk — zoneType:'URBAN', 6 lanes, 5400 veh/hr capacity
            (used specifically for the Infrastructure-vs-Behaviour classifier demo)
```

**IMPORTANT:** Each zone now has extra fields: `zoneType` ('MOUNTAIN'|'URBAN'), `roadCapacityPerHr`,
`lanes`. If you add a 12th zone, update it in **4 places**: `server.js dangerZones`,
`weather_service.js ZONES`, `traffic_service.js ZONES`, `reroute.js alternateRoutes`. Also note:
100 simulated vehicles are mostly J&K-coordinate-bound EXCEPT the last ~18% which spawn with
`DL-` plates specifically bounded around Delhi's coordinates (28.55-28.71 lat) — this was needed
because the Jam Root-Cause Classifier had no traffic to analyze at Delhi otherwise. If you touch
vehicle generation or the tick-loop lat/lng clamping logic, **preserve the Delhi-vehicle special
case** or the Delhi zone analytics will go empty again.

---

## 6. FILES THAT WERE REMOVED (do not recreate without being asked)

| File | Why removed |
|---|---|
| `public/simulation_4d.html` | Explicit request — dropped the Three.js 4D simulation, kept the 2D Canvas one as primary |
| `public/video_generator.html` | Explicit request — considered redundant; OBS/Win+G screen recording used for backup videos instead |

Both required reindexing `launcher.html`'s tab buttons + `PAGES` array, and removing links from
`index.html` (demo card, quick-launch, footer), `hillsafe_portfolio.html`, `README.md`,
`QUICK_START.txt`, `docs/DEMO_SCRIPT.md`, `docs/PROJECT_BRIEFING.md`.

---

## 7. BUGS ALREADY FIXED — DO NOT REINTRODUCE

1. **`server.js` syntax error** (orphaned catch block from an old patch) — fixed, verified with `node --check`.
2. **File:// vs http:// confusion** — opening HTML files directly (double-click) instead of through `http://localhost:3000` broke Socket.io and relative links. Fixed with a connectivity-detection banner (`#hs-conn-banner`, checks `location.protocol==='file:'` and pings `/api/health`) on index.html, dashboard.html, launcher.html.
3. **`EADDRINUSE` crash** — starting the server when port 3000 was already in use used to crash with a raw stack trace. Fixed with a `server.on('error', ...)` handler that prints exact `taskkill`/`lsof` fix commands instead.
4. **Popup-blocked buttons** — `onclick="window.open(...)"` on the nav "LAUNCH PROJECT" button got silently blocked by browsers. Fixed by converting to a real `<a href target="_blank" rel="noopener">` anchor — **never use `window.open()` for primary navigation, always use real anchor tags.**
5. **`dashboard.html` content contamination** — at some point ~450 lines of the marketing WEBSITE's navbar/hero/features/demos/tech/impact/developer/launch sections got merged into the TOP of `dashboard.html`, ahead of the real map/dashboard content (which still worked, just was invisible below the fold). Symptom: opening the Dashboard tab showed the website's hero screen instead of the live map. Fixed by removing the entire contaminating block, keeping only `<body>` → connectivity banner → siren/voice widget → actual dashboard markup.
6. **Windows Python UnicodeEncodeError** — `hillsafe_ml.py` and `hillsafe_ml_v2.py` both print emoji (🔄 ✅ 🚀 etc.); Windows cmd/PowerShell's default codepage crashes on these. Fixed by adding `sys.stdout.reconfigure(encoding='utf-8', errors='replace')` (and stderr) at the very top of both files, before any other imports/prints.
7. **`#view-dash` never activates (blank black screen)** — `dashboard.html`'s entire dashboard content lives inside `<div id="view-dash">` which is `display:none` by default and was originally only shown via a `toggleDash()` function triggered by a button on a DIFFERENT page (an older design where dashboard was an overlay opened from elsewhere). After dashboard.html became a standalone page (loaded directly via iframe/URL), nothing ever called `toggleDash()`, so the page rendered as a pure black blank screen forever. **Fixed with one line: `toggleDash();` called automatically at the very end of the main script.** This is a **structural pattern to watch for** — any `display:none` container gated behind a function that used to be triggered by a since-removed button is a latent "blank screen" bug.
8. **Launcher tab index mismatches** — whenever a tab is removed from `PAGES` array and the button list, ALL subsequent `switchTab(N,this)` indices must be renumbered too, or clicking a later tab loads the wrong page. Always grep both the button list and the `PAGES` array together when adding/removing a launcher tab.
9. **YouTube "Error 153" (video player configuration error)** — the 4 hardcoded YouTube video IDs in `hillsafe_realroad.html` were either invalid or had embedding disabled by the uploader. Fixed by web-searching for real, currently-existing, personal-vlog-style YouTube videos (channels that allow embedding far more often than news/corporate channels), verifying they appear in live search results, and replacing all 4 IDs. Also added a small "open on YouTube directly" fallback link as defense-in-depth, since embed-restriction status can't be reliably detected client-side via JS (cross-origin iframe restriction).
10. **Hindi voice → English voice** — the whole voice-alert system (`speak()`, `getDA()`, `getAA()`, `getCA()` in dashboard.html, plus two `voiceHindi` fields server-side for proximity-warning and brake-cascade events) used `hi-IN` and Hindi text. Fully converted to `en-US` with natural English sentences; server-side field renamed `voiceHindi` → `voiceText` for accuracy. All marketing-copy mentions of "Hindi voice" across index.html, portfolio, README also updated to say "English voice."
11. **`safeZoneId` range too narrow** — was hardcoded to accept only zones 1–8; after adding zones 9–11 this silently rejected valid requests for the new zones. Fixed to accept 1–11.
12. **Duplicate `checkDangerZone()` call** in the accident endpoint — minor optimization, reused the already-computed zone instead of calling twice.

---

## 8. KEY TECHNICAL CONSTANTS

- `ACC_T = 0.44` — accident position along road curve, used in `simulation.html`
- Hardware cost: **~₹1,400/vehicle**
- MySQL: connect via `127.0.0.1`, NOT `localhost`; **db.js loads `.env` from the project root explicitly** via `path.join(__dirname, '..', '.env')` — works regardless of which folder you run `node` from
- `SUDDEN_DROP_KMH = 35`, `SWERVE_THRESHOLD_DEG = 0.006`, `V2V_PROXIMITY_DEG = 0.05`, `OVERTAKE_PROXIMITY_DEG = 0.06`, `OVERTAKE_SPEED_DELTA = 10`, `PILOT_CYCLE_MS = 45000`
- ECU lock auto-release: 25 seconds for V2V-triggered locks (checked via `ecuLockedAt`)
- Rate limit: 5 requests/min/IP on `/simulate-accident/:id`
- `PORT` for Node = 3000, ML_API_URL = `http://localhost:5000`

---

## 9. HOW TO RUN

```bash
# Terminal 1 (from project root):
npm run ml        # = python ml/hillsafe_ml.py — needs: pip install fastapi uvicorn xgboost scikit-learn pandas numpy joblib requests openpyxl

# Terminal 2 (from project root):
npm start          # = node server/server.js

# Browser:
http://localhost:3000                     → Website
http://localhost:3000/dashboard.html      → Live dashboard
http://localhost:3000/launcher.html       → Project launcher (5 tabs)
http://localhost:3000/api/health          → Quick status check
http://localhost:5000/docs                → FastAPI ML docs
```

**Never run `python hillsafe_ml.py` directly from the project root** — the file lives in `ml/`,
always use `npm run ml`. Both `hillsafe_ml.py` and `hillsafe_ml_v2.py` bind to the SAME port
5000 — never run both at once.

---

## 10. PENDING / NOT YET DONE

- [ ] Twilio real credentials still not in `.env`
- [ ] Real NCRB/iRAD training data not pulled (synthetic data still powers the active model; `hillsafe_ml_v2.py`'s real-data pipeline is coded and gracefully falls back to synthetic if MySQL/NCRB data is absent)
- [ ] Physical ESP32/OBD-II hardware never built/tested
- [ ] GitHub push not yet done — verify `.env` isn't tracked (`git rm --cached .env` if it was committed before `.gitignore` existed)
- [ ] No cloud deployment — everything runs locally
- [ ] Satellite radio fallback (for zero-signal zones) — conceptually documented, not implemented

---

## 11. HOW I LIKE TO WORK

- **Simple English explanations** — I'm a student, not a senior engineer
- **Working code only** — never mockups or pseudo-code
- **Test before delivering** — I expect claims like "this is fixed" to be backed by actually running the code (`node --check`, live curl tests, socket.io test scripts), not just code review
- **Hinglish communication** is fine and expected
- I work in **long sessions**, picking up exactly where I left off — when I say "HillSafe AI" in a new chat, give a full recap immediately, don't ask me to re-explain
- When something breaks, I'll usually paste a **screenshot** — read it carefully, it usually shows the exact error/state
- I prefer **all reasonable options** shown when there's a choice to make, not just one
- Tools: VS Code, XAMPP or standalone MySQL + MySQL Workbench (both are valid — Workbench needs a REAL password in `.env`, unlike XAMPP's blank default), GitHub

---

## 12. WHAT I NEED FROM FABLE RIGHT NOW

*(Fill this in before sending)*

- [ ] ___________________________________________
- [ ] ___________________________________________
- [ ] ___________________________________________

---

*End of briefing v2. This supersedes the earlier `docs/PROJECT_BRIEFING.md` — that file is kept
for historical reference but this document is current.*
