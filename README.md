# 🏔️ HillSafe AI
### Smart Mountain Road Safety & Real-Time Vehicle Telemetry Platform

![Status](https://img.shields.io/badge/Status-Active%20Development-green)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🎯 Mission

> *"Prevent bloodshed on mountain roads through intelligent, automated, real-time safety management"*

HillSafe AI was born from witnessing road accidents and loss of lives on mountain roads in Jammu & Kashmir. This system is designed to prevent accidents before they happen, detect emergencies automatically, and save lives through intelligent real-time response — with zero human intervention required.

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

## 🚀 Core Features

### 🔴 Forced Speed Lock in Red Zones
Vehicle enters danger zone → engine speed automatically limited → driver cannot override until safe zone. Prevents accidents by force, not just warning.

### 🚗↔️🚗 Single Road AI Coordinator
AI detects two vehicles approaching each other on narrow mountain road → calculates empty space → directs Vehicle A to wait at passing point → Vehicle B passes safely. Both drivers see each other on live map.

### 📉 Vehicle Off-Road Fall Detection
GPS + gyroscope chip detects vehicle falling off mountain → instant alert sent automatically → rescue dispatched with exact location, driver contact, live camera feed. Works even if driver is unconscious.

### 🚨 Zero Human Emergency Response
Accident detected by sensors → rescue team alerted → hospital pre-warned with patient blood type → family notified via SMS → nearby vehicles warned → road rerouted. All in under 3 seconds. No human action needed.

### 🏥 Direct Hospital Alert System
When accident detected, nearest hospital receives: exact GPS location, patient blood type, vehicle details, live camera feed, estimated ambulance arrival time. Emergency room prepared before ambulance arrives.

### 🔥 Vehicle Fire Detection
Temperature sensor + smoke sensor + AI camera detect fire → driver warned immediately → fire department alerted with live location → forest department notified if near trees → all nearby vehicles warned.

### 👁️ HillSafe Witness System
Every HillSafe vehicle is a moving rescue scout. Camera reads number plates of ALL vehicles on road — even those without HillSafe system. If accident detected near unregistered vehicle → owner details retrieved → rescue dispatched. System protects EVERY vehicle even without installation.

### 📻 Satellite Radio Emergency Broadcast
Emergency alert broadcast via satellite to every truck, bus, and car radio on the road. Works with zero internet. Works on oldest vehicles. Reaches everyone.

### 😴 Drowsiness Detection
Cabin camera watches driver eyes in real time. Drowsiness detected → alarm sounds → speed reduced automatically → if no response → HillSafe dashboard alerted.

### 📡 3KM Mobile Radar Detection Zone
Every HillSafe vehicle scans 3km radius constantly — detecting vehicles, obstacles, vehicles off road, vehicles fallen into gorges. Moving vehicles become moving rescue infrastructure.

---

## 🗄️ Database Structure

**Database:** `smart_vehicle_registry`

| Table | Purpose |
|---|---|
| `vehicles` | Registration, chip ID, owner info, blood group |
| `drivers` | License, face data, safety score, violations |
| `zones` | Red zones, safe zones, speed limits, GPS boundaries |
| `incidents` | Accidents, emergencies, off-road events |
| `challans` | Auto-generated digital penalties |
| `telemetry_logs` | Live GPS, speed, gyroscope, temperature data |
| `emergency_alerts` | Hospital, family, rescue, radio alerts |
| `road_segments` | Single lane roads, passing points, capacity |

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| Backend Server | Node.js + Express.js |
| Database | MySQL (XAMPP) |
| Real-Time | Socket.io |
| Frontend | HTML + CSS + JavaScript |
| Live Map | Leaflet.js + OpenStreetMap |
| AI / Vision | Python + OpenCV (Phase 3) |
| Face Recognition | face_recognition library (Phase 3) |
| Hardware Chip | ESP32 + MPU6050 + NEO-6M GPS (Phase 3) |
| Communication | GSM + LoRaWAN + ISRO NavIC satellite |
| Security | mTLS encryption + JWT authentication |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Server status |
| GET | `/vehicles` | All registered vehicles |
| GET | `/vehicles/id/:id` | Vehicle by ID |
| GET | `/vehicles/plate/:plate` | Vehicle by number plate |
| GET | `/zones` | All danger zones |
| GET | `/drivers` | All drivers with vehicle details |
| GET | `/challans` | All digital challans |
| GET | `/incidents` | All incidents and accidents |

---

## 📅 Development Progress

| Day | Date | Status | What Was Built |
|---|---|---|---|
| Day 1 | 23 March 2026 | ✅ Complete | MySQL database + 8 tables + real data |
| Day 2 | 23 March 2026 | ✅ Complete | Node.js server + 8 working APIs |
| Day 3 | 07 April 2026 | 🔄 In Progress | Live map dashboard + J&K map |
| Day 4 | Coming Soon | ⏳ Pending | Socket.io live vehicle tracking |
| Day 5 | Coming Soon | ⏳ Pending | Vehicle simulation (100 vehicles) |
| Day 6 | Coming Soon | ⏳ Pending | Auto challan system |
| Day 7 | Coming Soon | ⏳ Pending | Emergency alert pipeline |

---

## 🗺️ Project Phases

### Phase 1 — Core System (Current)
- [x] MySQL database with 8 tables
- [x] Node.js + Express backend
- [x] 8 REST API endpoints
- [x] Live map dashboard
- [ ] Socket.io real-time tracking
- [ ] Vehicle simulation
- [ ] Auto challan system

### Phase 2 — Emergency Systems
- [ ] Accident detection pipeline
- [ ] Hospital alert with blood type
- [ ] Family SMS notification
- [ ] Emergency vehicle corridor
- [ ] Accident rerouting

### Phase 3 — AI Features
- [ ] Face recognition vehicle start
- [ ] Drowsiness detection
- [ ] Number plate reading (ANPR)
- [ ] Witness system
- [ ] Fire detection AI

### Phase 4 — Advanced
- [ ] Single road AI coordinator
- [ ] 3KM radar detection
- [ ] Shadow tracking system
- [ ] LoRaWAN network
- [ ] Satellite communication

### Phase 5 — Deployment
- [ ] Hardware chip prototype
- [ ] Real vehicle testing
- [ ] J&K highway pilot
- [ ] Government presentation

---

## ⚙️ Installation & Setup

### Prerequisites
