/*
 * ================================================================
 * HillSafe AI — OBD-II Vehicle Tracker Firmware
 * Hardware: ESP32 + ELM327 OBD-II Adapter + NEO-6M GPS
 * Language: C++ (Arduino Framework)
 * 
 * COMPONENTS NEEDED:
 * - ESP32 Dev Board (₹350)
 * - ELM327 OBD-II Bluetooth/UART Adapter (₹200)  
 * - NEO-6M GPS Module (₹300)
 * - MPU6050 Accelerometer (₹150) ← crash detection
 * - SIM800L GSM Module (₹400) ← for no-WiFi areas
 * Total cost per vehicle: ~₹1,400
 *
 * CONNECTIONS:
 * ESP32 Pin  → Component
 * GPIO 16    → ELM327 TX
 * GPIO 17    → ELM327 RX
 * GPIO 12    → NEO-6M TX (GPS)
 * GPIO 13    → NEO-6M RX (GPS)
 * GPIO 21    → MPU6050 SDA (I2C)
 * GPIO 22    → MPU6050 SCL (I2C)
 * GPIO 26    → SIM800L TX
 * GPIO 27    → SIM800L RX
 *
 * INSTALL LIBRARIES (Arduino IDE):
 * - ArduinoJson
 * - TinyGPSPlus
 * - MPU6050
 * - WebSockets by Markus Sattler
 * ================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>
#include <Wire.h>
// #include <MPU6050.h>      // Uncomment when hardware connected
// #include <WebSocketsClient.h>  // For real-time

// ── CONFIGURATION ─────────────────────────────────────────────
const char* WIFI_SSID     = "HillSafe_Network";     // WiFi name
const char* WIFI_PASSWORD = "hillsafe2024";          // WiFi password
const char* SERVER_URL    = "http://192.168.1.100:3000"; // Server IP
const char* VEHICLE_PLATE = "JK-02-B-5567";          // Real plate
const char* BLOOD_GROUP   = "O+";                    // Driver blood
const int   VEHICLE_ID    = 2;                       // DB vehicle ID
const int   G_FORCE_THRESHOLD = 6;                   // Crash G-force threshold

// ── SERIAL PORTS ──────────────────────────────────────────────
HardwareSerial obd(1);  // ELM327 OBD-II on UART1
HardwareSerial gps(2);  // GPS on UART2
TinyGPSPlus    gpsParser;

// ── SENSOR DATA ───────────────────────────────────────────────
struct VehicleData {
  float  speed_obd = 0;     // Speed from OBD-II (km/h)
  float  speed_gps = 0;     // Speed from GPS (km/h)
  float  rpm       = 0;     // Engine RPM
  float  lat       = 0;     // GPS latitude
  float  lng       = 0;     // GPS longitude
  float  altitude  = 0;     // GPS altitude (m)
  float  gforce    = 0;     // Accelerometer G-force
  float  temp_engine= 0;    // Engine coolant temperature
  int    brake_pressure = 0;// Brake pressure (simulated)
  bool   engine_on = true;
  bool   crash_detected = false;
  String dtc_codes = "";    // Diagnostic Trouble Codes
  unsigned long timestamp = 0;
};

VehicleData vData;

// ── HILLSAFE AI ALERTS ────────────────────────────────────────
struct Alert {
  String type;
  String message;
  bool   sent;
};

// ── SETUP ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n===========================================");
  Serial.println("  HillSafe AI — OBD-II Tracker v1.0");
  Serial.println("  Vehicle: " + String(VEHICLE_PLATE));
  Serial.println("===========================================\n");

  // Init OBD-II UART
  obd.begin(9600, SERIAL_8N1, 16, 17);
  Serial.println("[OBD] ELM327 initialized on UART1 (9600 baud)");

  // Init GPS UART
  gps.begin(9600, SERIAL_8N1, 12, 13);
  Serial.println("[GPS] NEO-6M initialized on UART2");

  // Init I2C for MPU6050
  Wire.begin(21, 22);
  // mpu.initialize();  // Uncomment when MPU6050 library added

  // Connect WiFi
  connectWiFi();

  // Init OBD
  initOBD();

  Serial.println("\n✅ All systems initialized. Starting monitoring...\n");
}

// ── MAIN LOOP ─────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // 1. Read GPS (every loop)
  readGPS();

  // 2. Read OBD-II (every 500ms)
  static unsigned long lastOBD = 0;
  if (now - lastOBD >= 500) {
    readOBD();
    lastOBD = now;
  }

  // 3. Read accelerometer (every 100ms)
  static unsigned long lastAccel = 0;
  if (now - lastAccel >= 100) {
    readAccelerometer();
    lastAccel = now;
  }

  // 4. Send to HillSafe AI server (every 2 seconds)
  static unsigned long lastSend = 0;
  if (now - lastSend >= 2000) {
    sendToServer();
    lastSend = now;
  }

  // 5. Check for alerts
  checkAlerts();

  // 6. DTC scan every 60 seconds
  static unsigned long lastDTC = 0;
  if (now - lastDTC >= 60000) {
    scanDTCCodes();
    lastDTC = now;
  }
}

// ── OBD-II COMMUNICATION ──────────────────────────────────────
void initOBD() {
  delay(1000);
  sendOBDCommand("ATZ");    // Reset
  delay(1000);
  sendOBDCommand("ATE0");   // Echo off
  sendOBDCommand("ATL0");   // Linefeeds off
  sendOBDCommand("ATS0");   // Spaces off
  sendOBDCommand("ATH0");   // Headers off
  sendOBDCommand("ATSP0");  // Auto protocol
  Serial.println("[OBD] ELM327 initialized");
}

String sendOBDCommand(String cmd) {
  obd.println(cmd);
  delay(200);
  String response = "";
  while (obd.available()) {
    char c = obd.read();
    if (c != '\r' && c != '>') response += c;
  }
  return response.trim();
}

void readOBD() {
  // Speed (PID 010D)
  String speedResp = sendOBDCommand("010D");
  if (speedResp.length() >= 4) {
    int hexVal = strtol(speedResp.substring(speedResp.length()-2).c_str(), NULL, 16);
    vData.speed_obd = hexVal; // km/h directly
  }

  // RPM (PID 010C)
  String rpmResp = sendOBDCommand("010C");
  if (rpmResp.length() >= 8) {
    int a = strtol(rpmResp.substring(rpmResp.length()-4, rpmResp.length()-2).c_str(), NULL, 16);
    int b = strtol(rpmResp.substring(rpmResp.length()-2).c_str(), NULL, 16);
    vData.rpm = ((a * 256) + b) / 4.0;
  }

  // Engine coolant temp (PID 0105)
  String tempResp = sendOBDCommand("0105");
  if (tempResp.length() >= 4) {
    int hexVal = strtol(tempResp.substring(tempResp.length()-2).c_str(), NULL, 16);
    vData.temp_engine = hexVal - 40; // °C
  }

  // If OBD not connected, use GPS speed as fallback
  if (vData.speed_obd == 0 && vData.speed_gps > 0) {
    vData.speed_obd = vData.speed_gps;
  }

  Serial.printf("[OBD] Speed: %.0f km/h | RPM: %.0f | Temp: %.0f°C\n",
    vData.speed_obd, vData.rpm, vData.temp_engine);
}

void scanDTCCodes() {
  String dtcResp = sendOBDCommand("03"); // Request DTC
  if (dtcResp.length() > 4 && dtcResp != "4300") {
    vData.dtc_codes = dtcResp;
    Serial.println("[OBD] DTC Codes found: " + dtcResp);
    // Alert server about fault codes
    sendFaultAlert(dtcResp);
  } else {
    vData.dtc_codes = "";
  }
}

// ── GPS ────────────────────────────────────────────────────────
void readGPS() {
  while (gps.available() > 0) {
    gpsParser.encode(gps.read());
  }
  if (gpsParser.location.isValid()) {
    vData.lat      = gpsParser.location.lat();
    vData.lng      = gpsParser.location.lng();
    vData.altitude = gpsParser.altitude.meters();
    vData.speed_gps= gpsParser.speed.kmph();
  }
}

// ── ACCELEROMETER (MPU6050) ───────────────────────────────────
void readAccelerometer() {
  // Simulated — replace with actual MPU6050 read
  // int16_t ax, ay, az;
  // mpu.getAcceleration(&ax, &ay, &az);
  // float gx = ax / 16384.0, gy = ay / 16384.0, gz = az / 16384.0;
  // vData.gforce = sqrt(gx*gx + gy*gy + gz*gz);

  // ---- SIMULATION (remove when hardware connected) ----
  vData.gforce = 1.0 + random(0, 20) * 0.01; // Normal driving ~1G

  // Crash detection
  if (vData.gforce > G_FORCE_THRESHOLD && !vData.crash_detected) {
    vData.crash_detected = true;
    Serial.printf("[CRASH] G-Force: %.1f G — CRASH DETECTED!\n", vData.gforce);
    sendCrashAlert();
  } else if (vData.gforce < 2.0) {
    vData.crash_detected = false;
  }
}

// ── SEND TO SERVER ────────────────────────────────────────────
void sendToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    return;
  }

  StaticJsonDocument<512> doc;
  doc["vehicleId"]   = VEHICLE_ID;
  doc["plate"]       = VEHICLE_PLATE;
  doc["blood"]       = BLOOD_GROUP;
  doc["lat"]         = vData.lat;
  doc["lng"]         = vData.lng;
  doc["speed"]       = vData.speed_obd;
  doc["rpm"]         = vData.rpm;
  doc["altitude"]    = vData.altitude;
  doc["gforce"]      = vData.gforce;
  doc["engineTemp"]  = vData.temp_engine;
  doc["engineOn"]    = vData.engine_on;
  doc["crashDetected"] = vData.crash_detected;
  doc["dtcCodes"]    = vData.dtc_codes;
  doc["timestamp"]   = millis();
  doc["source"]      = "OBD2_ESP32";

  String jsonStr;
  serializeJson(doc, jsonStr);

  HTTPClient http;
  http.begin(String(SERVER_URL) + "/api/obd-telemetry");
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(jsonStr);

  if (code == 200) {
    // Parse server response for any commands
    String resp = http.getString();
    StaticJsonDocument<256> respDoc;
    deserializeJson(respDoc, resp);

    // Server can remotely lock ECU speed
    if (respDoc.containsKey("ecuLock")) {
      float maxSpd = respDoc["ecuMaxSpeed"] | 100;
      applyECULock(maxSpd);
    }
  }
  http.end();
}

// ── ECU SPEED LOCK ────────────────────────────────────────────
void applyECULock(float maxSpeedKmh) {
  // In real implementation: send CAN bus command to ECU
  // This limits throttle to enforce speed limit
  Serial.printf("[ECU] Speed lock applied: max %.0f km/h\n", maxSpeedKmh);

  // Via OBD-II (advanced command — vehicle specific)
  // sendOBDCommand("AT" + String(maxSpeedKmh, 0));

  // Audio alert to driver
  // playBuzzer();
}

// ── ALERTS ────────────────────────────────────────────────────
void checkAlerts() {
  // Overspeed
  if (vData.speed_obd > 80) {
    Serial.printf("[ALERT] OVERSPEED: %.0f km/h\n", vData.speed_obd);
    sendAlert("OVERSPEED", "Speed " + String(vData.speed_obd, 0) + " km/h detected on mountain road");
  }

  // High RPM (engine stress)
  if (vData.rpm > 4500) {
    Serial.printf("[ALERT] HIGH RPM: %.0f\n", vData.rpm);
  }

  // Engine overheating
  if (vData.temp_engine > 105) {
    sendAlert("ENGINE_OVERHEAT", "Engine temperature " + String(vData.temp_engine, 0) + "°C — critical!");
  }
}

void sendCrashAlert() {
  HTTPClient http;
  http.begin(String(SERVER_URL) + "/simulate-accident/" + String(VEHICLE_ID));
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["vehicleId"]  = VEHICLE_ID;
  doc["gforce"]     = vData.gforce;
  doc["lat"]        = vData.lat;
  doc["lng"]        = vData.lng;
  doc["blood"]      = BLOOD_GROUP;
  doc["source"]     = "HARDWARE_CRASH_SENSOR";

  String body;
  serializeJson(doc, body);
  http.POST(body);
  http.end();

  Serial.println("[SERVER] Crash alert sent to HillSafe AI!");
}

void sendFaultAlert(String dtcCode) {
  HTTPClient http;
  http.begin(String(SERVER_URL) + "/api/obd-fault");
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> doc;
  doc["vehicleId"] = VEHICLE_ID;
  doc["dtcCode"]   = dtcCode;
  doc["plate"]     = VEHICLE_PLATE;

  String body;
  serializeJson(doc, body);
  http.POST(body);
  http.end();
}

void sendAlert(String type, String message) {
  Serial.println("[ALERT] " + type + ": " + message);
  // Throttle: one alert per type per minute
}

// ── WIFI ──────────────────────────────────────────────────────
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("[WiFi] Connecting to " + String(WIFI_SSID));
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500); Serial.print("."); attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WiFi] Failed — will retry. Using GSM fallback if available.");
    // TODO: switch to SIM800L GSM for no-WiFi mountain zones
  }
}
