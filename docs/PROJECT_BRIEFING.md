# 🏔 HILLSAFE AI — COMPLETE PROJECT BRIEFING FOR CLAUDE FABLE

> **Paste this entire document as your first message to Claude Fable 5** when you start a new conversation there. It gives Fable full context so it can continue building without you re-explaining anything.

---

## 1. WHO I AM & WHAT THIS PROJECT IS

I'm **Safeer Ahmed**, a B.Tech CSE student (J&K, India) building **HillSafe AI** — a full-stack AI-powered mountain road safety system for J&K highways (NH-44, Banihal Pass, Zoji La, Jawahar Tunnel, Leh–Ladakh, Udhampur–Kishtwar).

**Why I built it:** I grew up watching accidents happen on J&K mountain roads with no ambulance arriving in time. This project is my answer — reducing emergency response time and clearing ambulance routes automatically using AI.

**Solo developer** — I build and own this project end to end.

- **GitHub:** `safeerahmed8/Hill_Safe_AI`
- **Local path:** `C:\Users\User\Desktop\hill_safe_ai\`
- **Targets:** University submission, competition entries, internship applications (Bosch India, ISRO, MapmyIndia, BMW Germany, Mobileye)

---

## 2. TECH STACK

| Layer | Technology |
|---|---|
| Backend | Node.js + Express + Socket.io |
| AI/ML | Python + XGBoost + FastAPI |
| Database | MySQL via XAMPP (8 relational tables) |
| Frontend | HTML + CSS + Vanilla JS |
| Live Map | Leaflet.js |
| 3D Simulation | Three.js (r128) |
| Weather | Open-Meteo API (free, no key) |
| SMS | Twilio |
| PDF Reports | PDFKit |
| Hardware | ESP32 + ELM327 (OBD-II) + NEO-6M GPS + MPU6050 |
| Ports | Node.js → `3000` · Python/FastAPI → `5000` |

---

## 3. COMPLETE FILE STRUCTURE (current, final state)

```
hill_safe_ai/
├── server.js              ← Main backend — secured, rate-limited, 100 vehicles, alerts
├── green_corridor.js      ← Ambulance corridor — Haversine routing, pullover instructions
├── weather_service.js     ← Open-Meteo integration, 8 zones, danger multipliers
├── reroute.js              ← 8 alternate J&K routes for zone blocking
├── sms_service.js         ← Twilio SMS (accident/challan/corridor alerts)
├── report_service.js      ← PDFKit government report generator
├── db.js                  ← MySQL connection pool (uses 127.0.0.1, NOT localhost)
├── hillsafe_ml.py         ← XGBoost ML model + FastAPI server (25 features, ~87% accuracy)
├── hillsafe_ml_v2.py      ← ML v2 — real data pipeline (NCRB + iRAD + IMD)
├── obd2_firmware.ino      ← ESP32 C++ firmware — OBD-II, GPS, G-force crash detect, ECU lock
├── .gitignore              ← Excludes .env, node_modules, *.pkl, *.webm, __pycache__
├── README.md               ← Professional GitHub docs with badges, setup guide
├── env_example.txt        ← Safe .env template (no real secrets)
└── public/
    ├── index.html              ← ⭐ MAIN WEBSITE (single consolidated file — see §5)
    ├── dashboard.html          ← Live Leaflet dashboard (renamed from old index.html)
    ├── launcher.html           ← Project launcher — loading sequence + iframe tabs
    ├── simulation.html         ← 17-phase 2D Canvas accident simulation
    ├── driver_app.html         ← Android PWA driver app
    ├── hillsafe_realroad.html ← Real YouTube road footage + AI overlay
    ├── hillsafe_portfolio.html ← Standalone project portfolio/summary page
    └── manifest.json           ← PWA manifest
```

**IMPORTANT:** `public/index.html` is now the ONLY landing page — there is no separate `hillsafe_website.html` anymore. Everything is consolidated into `index.html`. The old live-map dashboard was renamed to `public/dashboard.html`.

---

## 4. WHAT'S FULLY BUILT — FEATURE BY FEATURE

### Backend (`server.js`)
- 100 simulated J&K vehicles (real plates, driver names, blood groups)
- 8 danger zones: Banihal Pass, Zoji La, Jawahar Tunnel, Rohtang Pass, Sinthan Top, Mughal Road, Nathatop, Patnitop
- Auto challan ₹500–₹3000 with MySQL logging
- 5 alert types: BRAKE_FAILURE, OVERSPEED, MECHANICAL_FAULT, DRIVER_FATIGUE, TYRE_BURST
- ECU remote speed lock (gradual 8 km/h reduction per tick, via OBD-II)
- Proximity detection (120m radius, checked every 10 ticks)
- Brake failure cascade — alerts ALL vehicles within 500m in **<0.5 seconds**
- Zone block + rerouting (8 alternate routes)
- **Green Corridor** — clears ambulance route BEFORE ambulance departs (claimed world-first)
- Python ML integration (calls localhost:5000 every 10s)
- Weather integration (Open-Meteo, every 15 min, 8 zones)
- **Security hardening:** security headers (X-Content-Type-Options, X-XSS-Protection, X-Frame-Options, removed X-Powered-By), rate limiting (5 accident-sim requests/min per IP), input validation (`safeVehicleId`, `safeSpeed`, `safeStr`)
- Parameterized SQL queries throughout (no injection risk)

### Python ML (`hillsafe_ml.py` / `v2`)
- XGBoost, 25 features, ~87% accuracy
- FastAPI on port 5000: `/predict`, `/predict-batch`, `/retrain`, `/model-info`
- Real data pipeline: MySQL → NCRB CSV → iRAD Excel → Open-Meteo historical weather

### Frontend — `public/index.html` (the main website)
Single-file, particle-animated dark UI with sections:
- Hero (animated canvas particle network, glowing gradient title, live-counting stats)
- Problem (accident statistics, developer quote)
- Solution overview
- Features grid (9 feature cards — Green Corridor, Brake Cascade, XGBoost ML, 100 vehicles, weather, ECU lock, voice alerts, PWA app, Twilio+PDF)
- Demos grid (6 cards linking to all live demo pages)
- Tech stack grid (12 cards)
- Metrics + before/after comparison table
- **Developer section** — solo Safeer Ahmed card with caption quote (see §6)
- Launch section — quick-access buttons + big "🚀 LAUNCH FULL PROJECT" button → opens `/launcher.html`
- Footer with all links
- All navigation uses proper `href="#section"` anchors (NOT onclick — this caused bugs before, see §7)
- Security meta tags added (X-Content-Type-Options, X-XSS-Protection, referrer=no-referrer)

### `public/dashboard.html` (old index.html, live map)
- Leaflet.js live map, 100 vehicles, 8 danger zone circles
- Heatmap toggle, Hindi voice alerts (19 types)
- Boot connection gate, reconnect overlay
- Socket.io events: dangerZoneAlert, accidentAlert, challanIssued, brakeFailureCascade, proximityWarning, ecuSlowing, trafficControlAlert, weatherUpdate, greenCorridorAlert
- **Security: `esc()`, `escNum()`, `escInt()` sanitization functions added** — all socket data (plate numbers, names, zone names, detour text) is escaped before `innerHTML` insertion to prevent XSS
- `debounce()` added for vehicle list rendering (max once per 500ms) — performance fix
- All `console.log` debug statements removed for production

### `public/launcher.html` (Project Launcher)
- Animated boot/loading sequence (5-step checklist: connecting to server, loading vehicles, danger zones, ML model, ready)
- After loading: tabbed interface with iframe loading all 7 demo pages in-place
- Top bar with tab buttons (Dashboard, 17-Phase Sim, Driver App, Real Road, Portfolio)
- Status bar at bottom (server status, vehicle count, danger zones, live clock)
- "↗ Open Full" button to pop current tab into new window
- "← Website" button to return to main index.html

### Simulations
- **`simulation.html`** — 17-phase 2D Canvas: fog, AI prediction, ECU lock, proximity, brake cascade, Green Corridor, ambulance racing. This was the ORIGINAL primary demo.
- **`simulation_4d.html`** — *(Removed in a later session — decided to drop the 4D/3D Three.js simulation and keep the 2D Canvas simulation as the primary cinematic demo.)*

### `public/hillsafe_realroad.html` (Real Road AI Overlay)
- Real YouTube footage (NH-44/Banihal Pass/Zoji La/Jammu-Srinagar) embedded as background via iframe
- Canvas overlay on top draws: moving vehicle dots with AI tracking labels, red danger zone pulsing circle, AI danger score bars, weather panel, alert log
- 4 selectable road video feeds (bottom-right selector)
- Full incident simulation sequence plays over the real footage (overspeed → brake failure → crash → green corridor → ambulance → complete)
- Built because **real live CCTV access is not possible** (J&K Traffic Police cameras are private, no public API) — this real-YouTube-footage-plus-AI-overlay was the practical alternative

### `public/video_generator.html` — *(Removed in a later session — decided this was redundant with the 17-phase simulation; screen recording (OBS/Win+G) is used for backup videos instead.)*

### `GEMINI_PROMPTS.txt`
- 6 ready-to-paste cinematic video generation prompts (for Gemini Videos, Kling AI, RunwayML, etc.): normal monitoring, brake failure at 220 km/h, helicopter air support, mechanical failure alert, Green Corridor ambulance racing, full system overview
- Also lists free AI video tools: Google Veo 3, Kling AI 3.0, Seedance 2.0, Hailuo AI (MiniMax), Luma Dream Machine — with links and daily free-credit info

### `public/hillsafe_portfolio.html` (Portfolio Page)
- Standalone one-page project summary: hero, problem stats, feature cards, dev timeline, tech stack, files table, metrics, competition/internship targets, "The Developer" section (solo Safeer, caption quote), how-to-run steps

### Hardware (`obd2_firmware.ino`)
- ESP32 + ELM327 (OBD-II) reads real speed/RPM/engine temp
- NEO-6M GPS module for location
- MPU6050 accelerometer for G-force crash detection
- Sends JSON telemetry to server via WiFi
- Receives remote ECU-lock command from server
- **Cost: ~₹1,400 per vehicle** (ESP32 ₹350 + ELM327 ₹200 + GPS ₹300 + MPU6050 ₹150, approx.)

---

## 5. WHY `index.html` IS SINGLE-FILE NOW (important context)

Earlier I had two separate files — a live-map dashboard (`index.html`) and a separate marketing/presentation website (`hillsafe_website.html`). This caused confusion about which file to update. **I asked for these to be consolidated: `hillsafe_website.html` was deleted, and all of its code was merged directly into `public/index.html`.** The old dashboard was renamed to `public/dashboard.html` and `server.js` got an explicit `/dashboard` route. If Fable ever proposes creating a second landing page file again — **don't**. Keep everything in `index.html`.

---

## 6. TEAM SECTION — IMPORTANT CORRECTION

The project originally credited a second collaborator, **Nihal MB (IIT Jammu)**, as technical advisor. **I removed him entirely from all files** — the project is now credited to me alone. If Fable sees "Nihal" anywhere, or generates content implying a second team member, **remove/don't add it**. Current team section everywhere (website, portfolio, README) shows only:

> **SAFEER AHMED** — Solo Developer · AI Engineer · System Architect
> B.Tech Computer Science Engineering · J&K India
>
> *"I grew up watching accidents on J&K mountain roads with no ambulance arriving in time. HillSafe AI is my answer — making sure the next life is saved."*

---

## 7. BUGS ALREADY FIXED (don't reintroduce these)

1. **Buttons not working on website** — root cause was `onclick="scrollTo('section')"` conflicting with the browser's native `window.scrollTo`. Fixed by converting every navigation control to plain `href="#section"` anchors. **Always use `href` anchors for in-page navigation, never a custom function literally named `scrollTo`.**
2. **"Run the Project" button just scrolled instead of loading the app** — fixed by building `launcher.html`, a real project launcher with a loading sequence and iframe-based tab system. The button now does `window.open('/launcher.html')`.
3. **XSS risk in dashboard** — raw `${data.plate}` etc. inserted via `innerHTML` from Socket.io payloads. Fixed with `esc()`/`escNum()`/`escInt()` sanitizers on every dynamic insertion.
4. **Self-referencing broken link** — after the index.html/website merge, some "Open Dashboard" links still pointed to `/index.html` (itself) instead of `/dashboard.html`. Fixed — verify this stays correct if files are touched again.
5. **MySQL `ETIMEDOUT`** — fixed by using `127.0.0.1` instead of `localhost` in `db.js`, plus a `connectTimeout` setting.

---

## 8. KEY TECHNICAL CONSTANTS (don't lose these)

- `ACC_T = 0.44` — the position along the road curve (0–1) where the simulated accident happens, used consistently across `simulation.html`
- Hardware cost: **~₹1,400/vehicle**
- MySQL: connect via `127.0.0.1`, NOT `localhost`
- `parseInt(req.params.id)` required for vehicle ID type conversion in API routes
- Foreign key checks must be disabled in phpMyAdmin UI (not just SQL) before TRUNCATE
- Fetch URLs in frontend should be relative paths, not hardcoded `localhost` URLs
- PowerShell npm fix: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

---

## 9. HOW TO RUN (current)

```bash
# Terminal 1 — start MySQL via XAMPP first, then:
python hillsafe_ml.py

# Terminal 2:
node server.js

# Browser:
http://localhost:3000                    → Main website (index.html)
http://localhost:3000/dashboard.html      → Live vehicle dashboard
http://localhost:3000/launcher.html       → Project launcher (loads all demos)
http://localhost:3000/simulation.html     → 17-phase 2D sim
http://localhost:3000/driver_app.html     → Android PWA
http://localhost:5000/docs                → FastAPI ML docs
```

---

## 10. PENDING / NOT YET DONE

- [ ] Twilio setup — need real account SID/token/phone in `.env` (currently just the safe template exists)
- [ ] `npm install pdfkit` never actually run in a real environment yet
- [ ] Real ML training data from NCRB (ncrb.gov.in) and iRAD (irad.nic.in) not yet pulled in — model still uses synthetic data
- [ ] Real ESP32/OBD-II hardware never physically built/tested — firmware code exists but is untested on real hardware
- [ ] GitHub push not yet done — need to confirm `.env` isn't tracked (`git rm --cached .env` if it was committed before `.gitignore` existed)
- [ ] No cloud deployment yet — everything runs locally via XAMPP + Node

---

## 11. HOW I LIKE TO WORK (please follow this style)

- **Simple English explanations**, every important line of code should be understandable — I'm a student, not a senior engineer
- **Working code only** — I explicitly reject UI mockups or pseudo-code; always give me functional, runnable code
- **Don't rewrite completed/working features** — ask me to share current file state before making changes, or work incrementally with clear diffs
- I prefer **Hindi/Hinglish voice alerts** inside the simulations themselves (the UI chrome/code comments can stay in English)
- I work in **long, focused sessions**, picking up exactly where I left off — when I say "continue HillSafe AI," I expect a full recap without re-asking me for context
- When given multiple options, I usually want **all of them**, not just one
- I communicate concisely/informally — please match that, don't be overly verbose
- Tools I use: **VS Code, XAMPP (MySQL+Apache), phpMyAdmin, GitHub**

---

## 12. WHAT I NEED FROM FABLE RIGHT NOW

*(Fill this in before sending — tell Fable specifically what you want built or changed next, e.g.:)*

- [ ] ___________________________________________
- [ ] ___________________________________________
- [ ] ___________________________________________

---

*End of briefing. Fable should now have full context to continue HillSafe AI without me re-explaining the project.*
