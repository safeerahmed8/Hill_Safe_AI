# ================================================================
#  hillsafe_ml.py — HillSafe AI Python ML Model
#  XGBoost Danger Prediction + FastAPI Server
#  
#  Install:  pip install fastapi uvicorn xgboost scikit-learn
#            pandas numpy joblib requests
#
#  Run:      python hillsafe_ml.py
#  Server:   http://localhost:5000
# ================================================================

# ── WINDOWS FIX: force UTF-8 console output ─────────────────────
# Without this, Windows cmd/PowerShell (default codepage cp1252)
# crashes with UnicodeEncodeError the instant this script prints
# an emoji (🔄 ✅ 📊 🚀 etc.) — which happens almost immediately.
# This makes the script's console output UTF-8 regardless of the
# system codepage, on every platform.
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import numpy as np
import pandas as pd
import json, joblib, os
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

# XGBoost and sklearn
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score

# ================================================================
#  STEP 1 — GENERATE REALISTIC TRAINING DATA
#  (Replace with real J&K accident data when available)
#  Real data sources:
#    - NCRB: https://ncrb.gov.in/en/road-accidents-in-india
#    - iRAD:  https://irad.nic.in
#    - J&K Traffic Police accident records
# ================================================================

DANGER_ZONES = [
    {"id": 1, "name": "Banihal Pass Curve",   "lat": 33.5120, "lng": 75.2000, "altitude": 2832},
    {"id": 2, "name": "Zoji La Summit",        "lat": 34.2600, "lng": 75.4800, "altitude": 3528},
    {"id": 3, "name": "Jawahar Tunnel Entry",  "lat": 33.3200, "lng": 75.1500, "altitude": 1890},
    {"id": 4, "name": "Rohtang Pass",          "lat": 32.3714, "lng": 77.2441, "altitude": 3978},
    {"id": 5, "name": "Sinthan Top",           "lat": 33.6500, "lng": 75.5000, "altitude": 3748},
    {"id": 6, "name": "Mughal Road Curve",     "lat": 33.4800, "lng": 74.5200, "altitude": 2100},
    {"id": 7, "name": "Nathatop Blind Curve",  "lat": 33.0500, "lng": 75.1000, "altitude": 2390},
    {"id": 8, "name": "Patnitop Hairpin",      "lat": 33.1000, "lng": 75.2800, "altitude": 2024},
]

def generate_training_data(n_samples=15000):
    """
    Generate realistic synthetic training data for J&K mountain roads.
    Features based on real-world accident risk factors.
    """
    np.random.seed(42)
    data = []

    for _ in range(n_samples):
        # ── Vehicle features ──────────────────────────────────
        speed        = np.random.randint(10, 120)
        vehicle_type = np.random.choice([0, 1, 2, 3],
                         p=[0.45, 0.20, 0.25, 0.10])  # car,truck,bus,bike
        vehicle_age  = np.random.randint(0, 20)

        # ── Location features ─────────────────────────────────
        zone = np.random.choice(DANGER_ZONES)
        dist_to_zone = np.random.exponential(scale=3.0)  # km, many vehicles far
        altitude     = zone["altitude"] + np.random.normal(0, 200)
        curvature    = np.random.randint(0, 180)          # road curve angle

        # ── Time features ─────────────────────────────────────
        hour         = np.random.randint(0, 24)
        month        = np.random.randint(1, 13)
        is_night     = 1 if (hour < 6 or hour > 20) else 0
        is_winter    = 1 if month in [11, 12, 1, 2, 3] else 0

        # ── Weather features ──────────────────────────────────
        weather      = np.random.choice([0, 1, 2, 3],
                         p=[0.55, 0.20, 0.15, 0.10])  # clear,rain,fog,snow
        temperature  = np.random.normal(15, 12)          # celsius
        visibility   = {0: 10, 1: 5, 2: 1.5, 3: 0.5}[weather]
        visibility  += np.random.normal(0, 0.5)
        road_surface = weather  # 0=dry, 1=wet, 2=foggy, 3=icy

        # ── Driver features ───────────────────────────────────
        driver_age      = np.random.randint(18, 65)
        driving_hours   = np.random.exponential(scale=2.5)  # hours driven today
        is_fatigued     = 1 if driving_hours > 6 else 0
        prev_violations = np.random.randint(0, 10)

        # ── Traffic features ──────────────────────────────────
        traffic_density = np.random.randint(0, 100)  # 0-100 vehicles nearby

        # ── LABEL GENERATION (accident = 1) ──────────────────
        # Based on domain knowledge — mountain road accident factors
        risk = 0.0

        # Speed is the biggest factor
        speed_limit = 20 if zone["id"] == 2 else 30  # Zoji La = 20
        if speed > speed_limit * 1.5:   risk += 0.45
        elif speed > speed_limit * 1.2: risk += 0.25
        elif speed > speed_limit:       risk += 0.15

        # Proximity to zone
        if dist_to_zone < 0.5:   risk += 0.35
        elif dist_to_zone < 1.5: risk += 0.20
        elif dist_to_zone < 3.0: risk += 0.10

        # Weather and road surface
        risk += {0: 0, 1: 0.08, 2: 0.15, 3: 0.25}[weather]

        # Night driving
        if is_night:  risk += 0.12

        # Altitude (high = more risk)
        if altitude > 3000: risk += 0.15
        elif altitude > 2000: risk += 0.08

        # Heavy vehicles on curves
        if vehicle_type in [1, 2] and curvature > 90: risk += 0.12

        # Driver fatigue
        if is_fatigued: risk += 0.10

        # Previous violations
        risk += min(prev_violations * 0.03, 0.15)

        # Winter season
        if is_winter and altitude > 2500: risk += 0.10

        # Visibility
        if visibility < 1.0: risk += 0.20
        elif visibility < 3.0: risk += 0.10

        # Add noise
        risk += np.random.normal(0, 0.08)
        risk = max(0, min(1, risk))

        # Binary label with threshold
        accident = 1 if risk > 0.55 else 0

        data.append({
            "speed":           speed,
            "vehicle_type":    vehicle_type,
            "vehicle_age":     vehicle_age,
            "dist_to_zone_km": round(dist_to_zone, 2),
            "zone_id":         zone["id"],
            "altitude_m":      round(altitude),
            "curvature_deg":   curvature,
            "hour":            hour,
            "month":           month,
            "is_night":        is_night,
            "is_winter":       is_winter,
            "weather":         weather,
            "temperature":     round(temperature, 1),
            "visibility_km":   round(max(0.1, visibility), 2),
            "road_surface":    road_surface,
            "driver_age":      driver_age,
            "driving_hours":   round(driving_hours, 1),
            "is_fatigued":     is_fatigued,
            "prev_violations": prev_violations,
            "traffic_density": traffic_density,
            "accident":        accident,
        })

    df = pd.DataFrame(data)
    print(f"✅ Generated {len(df)} training samples")
    print(f"   Accident rate: {df['accident'].mean():.1%}")
    return df


# ================================================================
#  STEP 2 — FEATURE ENGINEERING
# ================================================================

FEATURES = [
    "speed", "vehicle_type", "vehicle_age",
    "dist_to_zone_km", "zone_id", "altitude_m", "curvature_deg",
    "hour", "month", "is_night", "is_winter",
    "weather", "temperature", "visibility_km", "road_surface",
    "driver_age", "driving_hours", "is_fatigued",
    "prev_violations", "traffic_density"
]

def add_engineered_features(df):
    """Add derived features that improve model accuracy."""
    df = df.copy()

    # Speed excess ratio
    df["speed_zone_ratio"] = df["speed"] / (20 + df["zone_id"] * 2)

    # Risk composite score
    df["risk_composite"] = (
        (df["speed"] / 100) * 0.35 +
        (1 / (df["dist_to_zone_km"] + 0.1)) * 0.25 +
        (df["weather"] / 3) * 0.15 +
        df["is_night"] * 0.10 +
        (df["altitude_m"] / 4000) * 0.10 +
        df["is_fatigued"] * 0.05
    )

    # Visibility danger flag
    df["low_visibility"] = (df["visibility_km"] < 2.0).astype(int)

    # Night + bad weather combined
    df["night_bad_weather"] = df["is_night"] * (df["weather"] > 0).astype(int)

    # Heavy vehicle on steep road
    df["heavy_on_curve"] = (df["vehicle_type"] > 0).astype(int) * (df["curvature_deg"] > 45).astype(int)

    return df

ALL_FEATURES = FEATURES + [
    "speed_zone_ratio", "risk_composite",
    "low_visibility", "night_bad_weather", "heavy_on_curve"
]


# ================================================================
#  STEP 3 — TRAIN MODEL
# ================================================================

def train_model(df):
    """Train XGBoost classifier on accident data."""
    df = add_engineered_features(df)

    X = df[ALL_FEATURES]
    y = df["accident"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print(f"\n📊 Training: {len(X_train)} samples | Test: {len(X_test)} samples")

    # ── XGBoost Model ─────────────────────────────────────────
    model = XGBClassifier(
        n_estimators    = 300,
        max_depth       = 6,
        learning_rate   = 0.08,
        subsample       = 0.85,
        colsample_bytree= 0.80,
        min_child_weight= 5,
        gamma           = 0.1,
        scale_pos_weight= (y_train == 0).sum() / (y_train == 1).sum(),
        random_state    = 42,
        eval_metric     = "logloss",
        use_label_encoder = False,
        verbosity       = 0,
    )

    model.fit(
        X_train, y_train,
        eval_set     = [(X_test, y_test)],
        verbose      = False,
    )

    # ── Evaluation ────────────────────────────────────────────
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    print(f"\n✅ Model Accuracy: {acc:.2%}")
    print("\n📋 Classification Report:")
    print(classification_report(y_test, y_pred,
          target_names=["Safe", "Accident Risk"]))

    # ── Feature Importance ────────────────────────────────────
    importance = pd.Series(
        model.feature_importances_, index=ALL_FEATURES
    ).sort_values(ascending=False)

    print("\n🔍 Top 10 Most Important Features:")
    for feat, imp in importance.head(10).items():
        bar = "█" * int(imp * 50)
        print(f"  {feat:<25} {bar} {imp:.3f}")

    return model, acc


# ================================================================
#  STEP 4 — SAVE MODEL
# ================================================================

MODEL_PATH = "hillsafe_model.pkl"

def save_model(model):
    joblib.dump(model, MODEL_PATH)
    print(f"\n💾 Model saved → {MODEL_PATH}")

def load_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None


# ================================================================
#  STEP 5 — FASTAPI SERVER
#  Node.js calls this API for real-time predictions
#  URL: http://localhost:5000/predict
# ================================================================

app = FastAPI(title="HillSafe AI — ML Danger Prediction API")

# Global model instance
_model = None

class VehicleData(BaseModel):
    """Data sent from Node.js server for each vehicle."""
    vehicleId:       str
    speed:           float
    vehicle_type:    int   = 0   # 0=car, 1=truck, 2=bus, 3=bike
    vehicle_age:     int   = 5
    dist_to_zone_km: float = 5.0
    zone_id:         int   = 1
    altitude_m:      float = 1500.0
    curvature_deg:   int   = 30
    hour:            int   = 12
    month:           int   = 6
    weather:         int   = 0   # 0=clear, 1=rain, 2=fog, 3=snow
    temperature:     float = 15.0
    visibility_km:   float = 10.0
    road_surface:    int   = 0
    driver_age:      int   = 35
    driving_hours:   float = 2.0
    prev_violations: int   = 0
    traffic_density: int   = 20

class BatchRequest(BaseModel):
    """Batch prediction for all 100 vehicles at once."""
    vehicles: list[VehicleData]

def make_features(v: VehicleData):
    """Convert API request into model feature vector."""
    is_night   = 1 if (v.hour < 6 or v.hour > 20) else 0
    is_winter  = 1 if v.month in [11, 12, 1, 2, 3] else 0
    is_fatigued= 1 if v.driving_hours > 6 else 0

    row = {
        "speed":              v.speed,
        "vehicle_type":       v.vehicle_type,
        "vehicle_age":        v.vehicle_age,
        "dist_to_zone_km":    v.dist_to_zone_km,
        "zone_id":            v.zone_id,
        "altitude_m":         v.altitude_m,
        "curvature_deg":      v.curvature_deg,
        "hour":               v.hour,
        "month":              v.month,
        "is_night":           is_night,
        "is_winter":          is_winter,
        "weather":            v.weather,
        "temperature":        v.temperature,
        "visibility_km":      v.visibility_km,
        "road_surface":       v.road_surface,
        "driver_age":         v.driver_age,
        "driving_hours":      v.driving_hours,
        "is_fatigued":        is_fatigued,
        "prev_violations":    v.prev_violations,
        "traffic_density":    v.traffic_density,
        # Engineered features
        "speed_zone_ratio":   v.speed / (20 + v.zone_id * 2),
        "risk_composite":     min(1, (v.speed/100)*.35 + (1/(v.dist_to_zone_km+.1))*.25 +
                              (v.weather/3)*.15 + is_night*.10 + (v.altitude_m/4000)*.10),
        "low_visibility":     1 if v.visibility_km < 2.0 else 0,
        "night_bad_weather":  is_night * (1 if v.weather > 0 else 0),
        "heavy_on_curve":     (1 if v.vehicle_type > 0 else 0) * (1 if v.curvature_deg > 45 else 0),
    }
    return pd.DataFrame([row])[ALL_FEATURES]

@app.get("/")
def root():
    return {
        "system":  "HillSafe AI — ML Danger Prediction API",
        "version": "1.0",
        "model":   "XGBoost Classifier",
        "status":  "online" if _model else "model not loaded",
        "endpoint": "POST /predict  |  POST /predict-batch"
    }

@app.post("/predict")
def predict(v: VehicleData):
    """Predict danger probability for a single vehicle."""
    if not _model:
        return {"error": "Model not loaded"}

    X    = make_features(v)
    prob = float(_model.predict_proba(X)[0][1])
    pred = int(_model.predict(X)[0])

    risk_level = (
        "CRITICAL" if prob >= 0.80 else
        "HIGH"     if prob >= 0.60 else
        "MEDIUM"   if prob >= 0.40 else
        "LOW"
    )

    recommendation = {
        "CRITICAL": "IMMEDIATE: Engage speed lock, alert driver, dispatch ambulance pre-alert",
        "HIGH":     "Reduce speed NOW. Alert driver. Hospital on standby.",
        "MEDIUM":   "Send speed warning. Monitor closely.",
        "LOW":      "Vehicle operating normally. Continue monitoring."
    }[risk_level]

    return {
        "vehicleId":       v.vehicleId,
        "dangerProbability": round(prob, 3),
        "isAccidentRisk":  bool(pred),
        "riskLevel":       risk_level,
        "recommendation":  recommendation,
        "topFactors":      get_top_factors(v, prob),
        "timestamp":       datetime.now().isoformat(),
    }

@app.post("/predict-batch")
def predict_batch(req: BatchRequest):
    """Predict danger for all 100 vehicles in one call from Node.js."""
    if not _model:
        return {"error": "Model not loaded"}

    results = []
    high_risk_count = 0

    for v in req.vehicles:
        X    = make_features(v)
        prob = float(_model.predict_proba(X)[0][1])
        pred = int(_model.predict(X)[0])

        risk = (
            "CRITICAL" if prob >= 0.80 else
            "HIGH"     if prob >= 0.60 else
            "MEDIUM"   if prob >= 0.40 else
            "LOW"
        )

        if risk in ["CRITICAL", "HIGH"]:
            high_risk_count += 1

        results.append({
            "vehicleId":        v.vehicleId,
            "dangerProbability": round(prob, 3),
            "riskLevel":        risk,
            "isAccidentRisk":   bool(pred),
        })

    # Sort by danger descending
    results.sort(key=lambda x: x["dangerProbability"], reverse=True)

    return {
        "total":          len(results),
        "highRiskCount":  high_risk_count,
        "results":        results,
        "topRisk":        results[0] if results else None,
        "timestamp":      datetime.now().isoformat(),
    }

@app.post("/train")
def retrain():
    """Retrain model with fresh synthetic data (call weekly or when new real data arrives)."""
    global _model
    print("\n🔄 Retraining model...")
    df     = generate_training_data(15000)
    model, acc = train_model(df)
    save_model(model)
    _model = model
    return {"success": True, "accuracy": round(acc, 4), "message": "Model retrained successfully"}

@app.get("/model-info")
def model_info():
    """Return model metadata."""
    if not _model:
        return {"error": "Model not loaded"}
    return {
        "type":       "XGBoost Classifier",
        "features":   len(ALL_FEATURES),
        "featureList": ALL_FEATURES,
        "modelFile":  MODEL_PATH,
        "status":     "ready"
    }


def get_top_factors(v: VehicleData, prob: float):
    """Return the top 3 risk factors for this vehicle."""
    factors = []
    is_night  = v.hour < 6 or v.hour > 20
    is_fatigued = v.driving_hours > 6

    if v.speed > 60: factors.append(f"High speed: {v.speed} km/h")
    if v.dist_to_zone_km < 1.0: factors.append(f"Near danger zone: {v.dist_to_zone_km:.1f} km")
    if v.weather == 3: factors.append("Snow conditions — black ice risk")
    elif v.weather == 2: factors.append("Fog — visibility below 2 km")
    elif v.weather == 1: factors.append("Rain — wet road surface")
    if is_night: factors.append("Night driving — reduced visibility")
    if is_fatigued: factors.append(f"Driver fatigue: {v.driving_hours:.1f} hours on road")
    if v.visibility_km < 2.0: factors.append(f"Low visibility: {v.visibility_km} km")
    if v.altitude_m > 3000: factors.append(f"High altitude: {v.altitude_m:.0f}m — ice risk")
    if v.prev_violations > 3: factors.append(f"History: {v.prev_violations} past violations")
    if v.vehicle_type in [1, 2] and v.curvature_deg > 60:
        factors.append("Heavy vehicle on sharp curve")

    return factors[:3] if factors else ["Multiple compounding risk factors"]


# ================================================================
#  MAIN — Train and start API server
# ================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  HillSafe AI — Python ML Danger Prediction Model")
    print("  XGBoost · FastAPI · Real-time vehicle scoring")
    print("=" * 60)

    # Load existing model or train fresh
    _model = load_model()

    if _model:
        print(f"✅ Loaded existing model from {MODEL_PATH}")
    else:
        print("\n🔄 No model found. Training fresh model...")
        df = generate_training_data(15000)
        _model, acc = train_model(df)
        save_model(_model)

    print("\n🚀 Starting FastAPI server on http://localhost:5000")
    print("   Node.js will call: POST http://localhost:5000/predict-batch")
    print("   Dashboard:         GET  http://localhost:5000/")
    print("=" * 60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=5000, log_level="warning")
