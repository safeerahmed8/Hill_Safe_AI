
# 🏔️ Smart Mountain Road Safety System
### with SetBack AI Algorithm — Real-Time Vehicle Telemetry & Accident Prevention Platform

![Version](https://img.shields.io/badge/version-7.0-blue)
![Status](https://img.shields.io/badge/status-active-green)
![Node](https://img.shields.io/badge/backend-Node.js-339933)
![MySQL](https://img.shields.io/badge/database-MySQL-4479A1)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## 🎯 Mission

> *"Prevent bloodshed on mountain roads through intelligent, automated, real-time safety management"*

**Smart Mountain Road Safety System with SetBack AI Algorithm** was born from witnessing road accidents and loss of lives on mountain roads in Jammu & Kashmir. This system is designed to **prevent accidents before they happen**, detect emergencies automatically, and save lives through intelligent real-time response — with zero human intervention required.

---

## 🌍 The Problem

Every year hundreds of people die on mountain roads in J&K, Himachal Pradesh, and Uttarakhand — not just from accidents, but from **delayed rescue**. When a vehicle falls off a mountain road at 3am with no witnesses, no phone signal, and no nearby population — the driver dies waiting for help that never comes in time.

**HillSafe AI solves this.**

---

## ⚡ What Makes HillSafe AI Unique

| Feature | USA | China | Germany | HillSafe AI |
|---|---|---|---|---|
| GPS Live Tracking | ✅ | ✅ | ✅ | ✅ |
| Forced Speed Lock in Danger Zones | ❌ | ❌ | ❌ | ✅ **World First** |
| Single Road AI Coordinator | ❌ | ❌ | ❌ | ✅ **World First** |
| Vehicle Off-Road Fall Detection | ❌ | ❌ | ❌ | ✅ **World First** |
| Non-HillSafe Vehicle Witness System | ❌ | ❌ | ❌ | ✅ **World First** |
| Hospital Alert with Blood Type | ❌ | ❌ | ❌ | ✅ **World First** |
| Satellite Radio Emergency Broadcast | ❌ | ❌ | ❌ | ✅ **World First** |
| Mountain Road Specific Platform | ❌ | ❌ | ❌ | ✅ **World First** |

---

## ✅ Development Progress

| Day | Date | Status | What Was Built |
|---|---|---|---|
| Day 1 | 23 Mar 2026 | ✅ Complete | MySQL database + 8 tables + real data seeded |
| Day 2 | 23 Mar 2026 | ✅ Complete | Node.js + Express server + 8 REST API endpoints |
| Day 3 | 07 Apr 2026 | ✅ Complete | Live map dashboard (Leaflet.js + OpenStreetMap) |
| Day 4 | Apr 2026 | ✅ Complete | Socket.io real-time vehicle tracking |
| Day 5 | Apr 2026 | ✅ Complete | 100-vehicle simulation across J&K (2s tick) |
| Day 6 | Apr 2026 | ✅ Complete | Auto Challan System (speed detection + fines) |
| Day 7 | May 2026 | ✅ Complete | Accident Rerouting System + Zone Block/Clear |
| Day 8 | Coming Soon | ⏳ Pending | Hardware Integration (ESP32 + GPS + Sensors) |

---

## 🚀 Core Features (Implemented)

### 🗺️ 8 Real Danger Zones — J&K Mountain Roads
Hardcoded GPS coordinates of actual high-risk zones with speed limits:

| Zone | Location | Speed Limit |
|---|---|---|
| Banihal Pass Curve | 33.5120°N, 75.2000°E | 30 km/h |
| Zoji La Summit | 34.2600°N, 75.4800°E | 20 km/h |
| Jawahar Tunnel Entry | 33.3200°N, 75.1500°E | 40 km/h |
| Rohtang Pass | 32.3714°N, 77.2441°E | 25 km/h |
| Sinthan Top | 33.6500°N, 75.5000°E | 30 km/h |
| Mughal Road Curve | 33.4800°N, 74.5200°E | 35 km/h |
| Nathatop Blind Curve | 33.0500°N, 75.1000°E | 30 km/h |
| Patnitop Hairpin | 33.1000°N, 75.2800°E | 25 km/h |

### 🚗 100-Vehicle Live Simulation
- 100 vehicles generated with real J&K plates (`JK-XX-XX-XXXX`), driver names, blood groups, and vehicle types
- Realistic mountain movement every **2 seconds** via `setInterval`
- Vehicles stay within J&K geographic bounds
- Telemetry logged to DB every 5th tick

### 💸 Auto Challan System (Day 6)
- Detects speeding in all 8 danger zones automatically
- Fine calculation based on excess speed:
  - 1–10 km/h over limit → ₹500
  - 11–20 km/h → ₹1,000
  - 21–30 km/h → ₹2,000
  - 31+ km/h → ₹3,000
- 30-second cooldown per vehicle (no spam)
- Real-time `challanIssued` event via Socket.io
- Pay challan API endpoint

### 🔀 Accident Rerouting System (Day 7)
- Single accident simulation → auto-blocks danger zone → emits alternate route + waypoints
- Mass accident simulation (5 vehicles simultaneously)
- `isNearBlockedZone()` checks 5km radius per vehicle every tick
- 60-second reroute cooldown per vehicle
- Block/clear zone manually via API
- Events: `zoneBlocked`, `zoneCleared`, `rerouteAlert`

### 📡 Real-Time Socket.io Events
| Event | Description |
|---|---|
| `vehicleUpdate` | Live positions of all 100 vehicles |
| `dangerZoneAlert` | Vehicle entered a danger zone |
| `accidentAlert` | Accident detected |
| `challanIssued` | Speed fine generated |
| `rerouteAlert` | Vehicle being rerouted |
| `zoneBlocked` | Zone blocked with detour info |
| `zoneCleared` | Zone cleared, normal traffic resumed |
| `currentBlockedZones` | Sent to every new dashboard connection |

---

## 🌐 API Endpoints

### Vehicle & Fleet
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Server status + feature list |
| GET | `/positions` | Live positions of all 100 vehicles |
| GET | `/vehicles` | All registered vehicles (DB) |
| GET | `/vehicles/id/:id` | Vehicle by ID |
| GET | `/vehicles/plate/:plate` | Vehicle by number plate |
| GET | `/fleet-stats` | Total, normal, danger, accident, rerouted counts |

### Zones & Routing
| Method | Endpoint | Description |
|---|---|---|
| GET | `/zones` | All danger zones from DB |
| GET | `/blocked-zones` | Currently blocked zones |
| GET | `/alternate-route/:zoneId` | Alternate route for a zone |
| POST | `/block-zone/:zoneId` | Manually block a zone |
| POST | `/clear-zone/:zoneId` | Clear a blocked zone |

### Accidents & Simulation
| Method | Endpoint | Description |
|---|---|---|
| POST | `/simulate-accident/:id` | Trigger accident for a vehicle |
| POST | `/simulate-mass-accident` | Trigger 5 simultaneous accidents |
| POST | `/reset-vehicle/:id` | Reset a single vehicle to normal |
| POST | `/reset-all` | Reset all 100 vehicles |

### Challans & Incidents
| Method | Endpoint | Description |
|---|---|---|
| GET | `/challans` | All challans with vehicle details |
| GET | `/challan-stats` | Total fines, paid/unpaid, max/avg speed |
| POST | `/challans/:id/pay` | Mark challan as paid |
| GET | `/incidents` | All incidents with vehicle + blood group info |
| GET | `/drivers` | All drivers with vehicle details |

---

## 🗄️ Database Structure

**Database:** `hill_safe_ai`

| Table | Purpose |
|---|---|
| `vehicles` | Registration, owner info, blood group, emergency contact |
| `drivers` | License, safety score, violations |
| `zones` | Danger zones, speed limits, GPS boundaries |
| `incidents` | Accidents, emergencies, off-road events |
| `challans` | Auto-generated digital speed penalties |
| `telemetry_logs` | Live GPS, speed, is_on_road flag |
| `emergency_alerts` | Hospital, family, rescue notifications |
| `road_segments` | Single lane roads, passing points |

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| Backend Server | Node.js + Express.js |
| Database | MySQL (XAMPP) |
| Real-Time | Socket.io |
| Frontend | HTML + CSS + JavaScript |
| Live Map | Leaflet.js + OpenStreetMap |
| AI / Vision | Python + OpenCV *(Phase 3)* |
| Face Recognition | face_recognition library *(Phase 3)* |
| Hardware Chip | ESP32 + MPU6050 + NEO-6M GPS *(Phase 3 — Next)* |
| Communication | GSM + LoRaWAN + ISRO NavIC satellite *(Phase 4)* |
| Security | mTLS encryption + JWT authentication |

---

## 🗺️ Project Phases

### ✅ Phase 1 — Core System (Complete)
- MySQL database with 8 tables
- Node.js + Express REST API
- Live map dashboard (Leaflet.js)
- Socket.io real-time tracking
- 100-vehicle simulation
- Auto challan system

### ✅ Phase 2 — Emergency Systems (Complete)
- Accident detection pipeline
- Auto zone blocking on accident
- Alternate route + waypoint system
- Mass accident simulation
- Single/all vehicle reset

### ⏳ Phase 3 — Hardware Integration (Next)
- ESP32 chip prototype
- MPU6050 gyroscope (fall/tilt detection)
- NEO-6M GPS module (real location)
- GSM module (SMS alerts)
- Real vehicle data → backend pipeline
- Face recognition vehicle start
- Drowsiness detection
- Fire & smoke sensors

### ⏳ Phase 4 — AI Features
- Number plate reading (ANPR)
- HillSafe Witness System
- Single road AI coordinator
- 3KM radar detection zone
- Shadow tracking system

### ⏳ Phase 5 — Advanced Communication
- LoRaWAN network (no internet needed)
- Satellite radio emergency broadcast
- ISRO NavIC integration

### ⏳ Phase 6 — Deployment
- Real vehicle testing on J&K highways
- Government presentation
- J&K highway pilot program

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v18+
- MySQL (via XAMPP or standalone)
- npm

### Steps

```bash
# Clone the repository
git clone https://github.com/safeerahmed8/hill_safe_ai.git
cd hill_safe_ai

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials

# Start the server
node server.js
```

### Environment Variables (`.env`)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=hill_safe_ai
PORT=3000
```

### Access
```
Dashboard:        http://localhost:3000
Live Positions:   http://localhost:3000/positions
Fleet Stats:      http://localhost:3000/fleet-stats
Challans:         http://localhost:3000/challans
Incidents:        http://localhost:3000/incidents
Blocked Zones:    http://localhost:3000/blocked-zones
```

---

## 🔮 Upcoming — Phase 3 Hardware

The next major milestone is building the **physical ESP32 hardware chip** that will be installed in real vehicles:

- 📡 **NEO-6M GPS** — Real-time location transmission
- 🔄 **MPU6050** — Gyroscope for fall/tilt/accident detection
- 📱 **GSM Module** — SMS alerts to family + emergency services
- 🌡️ **Temperature + Smoke Sensors** — Fire detection
- 👁️ **Camera Module** — Drowsiness + face recognition
- 🔒 **Speed Lock Relay** — Hardware speed limiter in red zones

---

## 👨‍💻 Author

**Safeer Ahmed** — [@safeerahmed8](https://github.com/safeerahmed8)

> Computer Science & Engineering Student | Building tech that saves lives on J&K mountain roads

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
