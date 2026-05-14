# 🏔️ Smart Mountain Road Safety System
### with SetBack AI Algorithm — Real-Time Vehicle Telemetry & Accident Prevention Platform

![Version](https://img.shields.io/badge/version-7.0-blue)
![Status](https://img.shields.io/badge/status-active-green)
![Node](https://img.shields.io/badge/backend-Node.js-339933)
![MySQL](https://img.shields.io/badge/database-MySQL-4479A1)
![Socket.io](https://img.shields.io/badge/realtime-Socket.io-black)
![License](https://img.shields.io/badge/license-MIT-yellow)
![Student](https://img.shields.io/badge/B.Tech-CSE%203rd%20Year-orange)

---

## 🎯 Mission

> *"Prevent bloodshed on mountain roads through intelligent, automated, real-time safety management"*

**Smart Mountain Road Safety System with SetBack AI Algorithm** was born from witnessing road accidents and loss of lives on mountain roads in Jammu & Kashmir. This system is designed to **prevent accidents before they happen**, detect emergencies automatically, and save lives through intelligent real-time response — with zero human intervention required.

---

## 🌍 The Problem

Every year hundreds of people die on mountain roads in J&K, Himachal Pradesh, and Uttarakhand — not just from accidents, but from **delayed rescue**. When a vehicle falls off a mountain road at 3am with no witnesses, no phone signal, and no nearby population — the driver dies waiting for help that never comes in time.

**This system solves that.**

---

## ⚡ What Makes This System Unique

| Feature | USA | China | Germany | Our System |
|---|---|---|---|---|
| GPS Live Tracking | ✅ | ✅ | ✅ | ✅ |
| Forced Speed Lock in Danger Zones | ❌ | ❌ | ❌ | ✅ **World First** |
| Single Road AI Coordinator | ❌ | ❌ | ❌ | ✅ **World First** |
| Vehicle Off-Road Fall Detection | ❌ | ❌ | ❌ | ✅ **World First** |
| Non-Registered Vehicle Witness System | ❌ | ❌ | ❌ | ✅ **World First** |
| Hospital Alert with Blood Type | ❌ | ❌ | ❌ | ✅ **World First** |
| Satellite Radio Emergency Broadcast | ❌ | ❌ | ❌ | ✅ **World First** |
| Mountain Road Specific AI Platform | ❌ | ❌ | ❌ | ✅ **World First** |

---

## ✅ Development Progress

> 🎓 Developed as part of **B.Tech (CSE) — 3rd Year** academic and self-driven research work. Built from scratch over multiple focused development sessions.

| Day | Date | Status | What Was Built |
|---|---|---|---|
| Day 1 | 10 Mar 2026 | ✅ Complete | Project ideation, problem statement, system architecture design |
| Day 2 | 13 Mar 2026 | ✅ Complete | Technology stack finalization, GitHub repo setup, folder structure |
| Day 3 | 17 Mar 2026 | ✅ Complete | Database schema design — 8 tables planned and documented |
| Day 4 | 23 Mar 2026 | ✅ Complete | MySQL database created + all 8 tables + real J&K data seeded |
| Day 5 | 23 Mar 2026 | ✅ Complete | Node.js + Express server setup + 8 REST API endpoints working |
| Day 6 | 27 Mar 2026 | ✅ Complete | API testing (Postman) + DB relationship fixes + error handling |
| Day 7 | 01 Apr 2026 | ✅ Complete | Frontend dashboard UI built (HTML + CSS + JavaScript) |
| Day 8 | 07 Apr 2026 | ✅ Complete | Live map integrated (Leaflet.js + OpenStreetMap + J&K region) |
| Day 9 | 10 Apr 2026 | ✅ Complete | Socket.io setup + real-time vehicle tracking pipeline |
| Day 10 | 14 Apr 2026 | ✅ Complete | 100-vehicle simulation engine (J&K bounds, 2-second tick) |
| Day 11 | 17 Apr 2026 | ✅ Complete | 8 Danger zones mapped with real J&K GPS coordinates + speed limits |
| Day 12 | 20 Apr 2026 | ✅ Complete | Danger zone detection logic + real-time dangerZoneAlert events |
| Day 13 | 24 Apr 2026 | ✅ Complete | Auto Challan System — speed detection, fine calculation (Rs.500–3000) |
| Day 14 | 27 Apr 2026 | ✅ Complete | Challan DB integration + pay challan API + challan stats dashboard |
| Day 15 | 01 May 2026 | ✅ Complete | Accident simulation (single + mass) + incident logging to DB |
| Day 16 | 05 May 2026 | ✅ Complete | SetBack AI Rerouting Algorithm — zone block/clear + alternate routes |
| Day 17 | 09 May 2026 | ✅ Complete | Full Socket.io event pipeline — all alerts, reroutes, zone updates |
| Day 18 | 14 May 2026 | ✅ Complete | System integration testing + bug fixes + full documentation |

---

## 🚀 Core Features

### 🗺️ 8 Real Danger Zones — J&K Mountain Roads

| Zone | Coordinates | Speed Limit |
|---|---|---|
| Banihal Pass Curve | 33.5120N, 75.2000E | 30 km/h |
| Zoji La Summit | 34.2600N, 75.4800E | 20 km/h |
| Jawahar Tunnel Entry | 33.3200N, 75.1500E | 40 km/h |
| Rohtang Pass | 32.3714N, 77.2441E | 25 km/h |
| Sinthan Top | 33.6500N, 75.5000E | 30 km/h |
| Mughal Road Curve | 33.4800N, 74.5200E | 35 km/h |
| Nathatop Blind Curve | 33.0500N, 75.1000E | 30 km/h |
| Patnitop Hairpin | 33.1000N, 75.2800E | 25 km/h |

### 🚗 100-Vehicle Live Simulation
- 100 vehicles with real J&K plates (JK-XX-XX-XXXX), driver names, blood groups, vehicle types
- Realistic mountain movement simulation every 2 seconds
- Geographic bounds enforced within J&K region
- Telemetry logged to database every 5th tick

### 💸 Auto Challan System
- Automatically detects speeding in all 8 danger zones
- Fine tiers: 1–10 km/h over → Rs.500 | 11–20 → Rs.1000 | 21–30 → Rs.2000 | 31+ → Rs.3000
- 30-second cooldown per vehicle
- Real-time challanIssued event via Socket.io
- Pay challan API + stats dashboard

### 🔀 SetBack AI — Rerouting Algorithm
- Accident detected → zone auto-blocked → alternate route + waypoints emitted instantly
- Mass accident simulation (5 vehicles simultaneously)
- 5km radius proximity check per vehicle per tick
- 60-second reroute cooldown per vehicle
- Manual block/clear zone via API

### 📡 Real-Time Socket.io Events

| Event | Description |
|---|---|
| vehicleUpdate | Live positions of all 100 vehicles |
| dangerZoneAlert | Vehicle entered a danger zone |
| accidentAlert | Accident detected |
| challanIssued | Speed fine auto-generated |
| rerouteAlert | Vehicle being rerouted by SetBack AI |
| zoneBlocked | Zone blocked with detour info |
| zoneCleared | Zone cleared, normal traffic resumed |
| currentBlockedZones | Sent to every new dashboard connection |

---

## 🌐 API Endpoints

### Vehicle & Fleet
| Method | Endpoint | Description |
|---|---|---|
| GET | / | Server status + feature list |
| GET | /positions | Live positions of all 100 vehicles |
| GET | /vehicles | All registered vehicles |
| GET | /vehicles/id/:id | Vehicle by ID |
| GET | /vehicles/plate/:plate | Vehicle by plate number |
| GET | /fleet-stats | Total, normal, danger, accident, rerouted counts |

### Zones & Routing
| Method | Endpoint | Description |
|---|---|---|
| GET | /zones | All danger zones |
| GET | /blocked-zones | Currently blocked zones |
| GET | /alternate-route/:zoneId | Alternate route for a zone |
| POST | /block-zone/:zoneId | Manually block a zone |
| POST | /clear-zone/:zoneId | Clear a blocked zone |

### Accidents & Simulation
| Method | Endpoint | Description |
|---|---|---|
| POST | /simulate-accident/:id | Trigger accident for a vehicle |
| POST | /simulate-mass-accident | Trigger 5 simultaneous accidents |
| POST | /reset-vehicle/:id | Reset a vehicle to normal |
| POST | /reset-all | Reset all 100 vehicles |

### Challans & Incidents
| Method | Endpoint | Description |
|---|---|---|
| GET | /challans | All challans with vehicle details |
| GET | /challan-stats | Total fines, paid/unpaid, max/avg speed |
| POST | /challans/:id/pay | Mark challan as paid |
| GET | /incidents | All incidents with blood group info |
| GET | /drivers | All drivers with vehicle details |

---

## 🗄️ Database Structure

**Database:** hill_safe_ai

| Table | Purpose |
|---|---|
| vehicles | Registration, owner info, blood group, emergency contact |
| drivers | License, safety score, violations |
| zones | Danger zones, speed limits, GPS boundaries |
| incidents | Accidents, emergencies, off-road events |
| challans | Auto-generated digital speed penalties |
| telemetry_logs | Live GPS, speed, is_on_road flag |
| emergency_alerts | Hospital, family, rescue notifications |
| road_segments | Single lane roads, passing points |

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| Backend Server | Node.js + Express.js |
| Database | MySQL (XAMPP) |
| Real-Time Engine | Socket.io |
| Frontend | HTML + CSS + JavaScript |
| Live Map | Leaflet.js + OpenStreetMap |
| Security | JWT Authentication |

---

## 🗺️ Project Phases

### ✅ Phase 1 — Core System (Complete)
- MySQL database with 8 tables
- Node.js + Express REST API (18+ endpoints)
- Live map dashboard (Leaflet.js + J&K region)
- Socket.io real-time pipeline

### ✅ Phase 2 — Intelligence Layer (Complete)
- 100-vehicle simulation engine
- Auto Challan System (Rs.500–3000 fines)
- SetBack AI Rerouting Algorithm
- Accident detection + zone management
- Mass accident simulation

### ⏳ Phase 3 — AI Features (Upcoming)
- Drowsiness detection (Python + OpenCV)
- Number plate reading — ANPR
- Vehicle Witness System
- Face recognition vehicle start
- Fire and smoke detection AI

### ⏳ Phase 4 — Deployment
- Real-world testing on J&K highways
- Government / transport authority presentation
- J&K highway pilot program

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v18+
- MySQL via XAMPP
- npm

### Steps

```bash
git clone https://github.com/safeerahmed8/hill_safe_ai.git
cd hill_safe_ai
npm install
cp .env.example .env
node server.js
```

### Environment Variables (.env)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=hill_safe_ai
PORT=3000
```

---

## 👨‍💻 Author

**Safeer Ahmed** — [@safeerahmed8](https://github.com/safeerahmed8) | [LinkedIn](https://www.linkedin.com/in/safeer-ahmed-8379bb251)

> B.Tech CSE — 3rd Year | Building technology that saves lives on J&K mountain roads

---

## 📄 License

MIT License — see LICENSE for details.
