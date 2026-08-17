"""
================================================================
 hillsafe_ml_real_data.py — HillSafe AI
 XGBoost ML Model with REAL J&K Accident Data Pipeline

 Data Sources:
 1. NCRB (ncrb.gov.in) — National accident statistics
 2. iRAD (irad.nic.in) — Integrated Road Accident Database
 3. IMD API — India Meteorological Department weather data
 4. Our own MySQL telemetry_logs + incidents tables

 Setup:
   pip install fastapi uvicorn xgboost scikit-learn
               pandas numpy joblib requests openpyxl

 Run:
   python hillsafe_ml_real_data.py

 Server: http://localhost:5000
================================================================
"""

# ── WINDOWS FIX: force UTF-8 console output ─────────────────────
# Without this, Windows cmd/PowerShell crashes with UnicodeEncodeError
# the instant this script prints an emoji — happens almost immediately.
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import os, json, joblib, warnings
import numpy  as np
import pandas as pd
import requests
from datetime import datetime
from pathlib  import Path

from fastapi     import FastAPI, HTTPException
from pydantic    import BaseModel
from xgboost     import XGBClassifier
from sklearn.model_selection  import train_test_split, cross_val_score
from sklearn.preprocessing    import LabelEncoder
from sklearn.metrics          import classification_report, accuracy_score, roc_auc_score
import uvicorn

warnings.filterwarnings('ignore')

app = FastAPI(title="HillSafe AI — ML Danger Prediction API v2")
MODEL_PATH = "hillsafe_model.pkl"
_model     = None

# ================================================================
#  STEP 1 — REAL DATA PIPELINE
# ================================================================

def load_real_data_from_mysql():
    """
    Load real accident data from our MySQL database.
    Uses telemetry_logs + incidents tables.
    """
    try:
        import mysql.connector
        from dotenv import load_dotenv
        load_dotenv()

        conn = mysql.connector.connect(
            host     = os.getenv('DB_HOST', '127.0.0.1'),
            user     = os.getenv('DB_USER', 'root'),
            password = os.getenv('DB_PASSWORD', ''),
            database = os.getenv('DB_NAME', 'hill_safe_ai'),
        )
        cursor = conn.cursor(dictionary=True)

        # Join telemetry + incidents to get labeled accident data
        cursor.execute("""
            SELECT
                t.speed,
                t.latitude AS lat,
                t.longitude AS lng,
                HOUR(t.created_at) AS hour,
                MONTH(t.created_at) AS month,
                v.vehicle_type,
                1 AS accident
            FROM incidents i
            JOIN telemetry_logs t ON t.vehicle_id = i.vehicle_id
                AND ABS(TIMESTAMPDIFF(SECOND, t.created_at, i.created_at)) < 60
            JOIN vehicles v ON v.vehicle_id = i.vehicle_id
            WHERE i.incident_type = 'accident'
            LIMIT 5000
        """)
        accident_rows = cursor.fetchall()

        # Get safe driving samples (no accident)
        cursor.execute("""
            SELECT
                t.speed,
                t.latitude AS lat,
                t.longitude AS lng,
                HOUR(t.created_at) AS hour,
                MONTH(t.created_at) AS month,
                v.vehicle_type,
                0 AS accident
            FROM telemetry_logs t
            JOIN vehicles v ON v.vehicle_id = t.vehicle_id
            WHERE t.vehicle_id NOT IN (
                SELECT DISTINCT vehicle_id FROM incidents WHERE incident_type = 'accident'
            )
            ORDER BY RAND()
            LIMIT 10000
        """)
        safe_rows = cursor.fetchall()

        conn.close()

        if accident_rows and safe_rows:
            df = pd.DataFrame(accident_rows + safe_rows)
            print(f"✅ Loaded {len(df)} records from MySQL")
            print(f"   Accidents: {df['accident'].sum()} | Safe: {(df['accident']==0).sum()}")
            return df

    except Exception as e:
        print(f"⚠️  MySQL load failed: {e}")
    return None


def load_ncrb_data(filepath: str = None) -> pd.DataFrame:
    """
    Load NCRB (National Crime Records Bureau) accident data.
    Download from: https://ncrb.gov.in/en/road-accidents-in-india

    Expected CSV columns:
    State, District, Year, Month, Location, Severity, Vehicles_Involved,
    Fatalities, Injuries, Weather, Road_Type, Speed_kmh
    """
    if filepath and Path(filepath).exists():
        print(f"Loading NCRB data: {filepath}")
        df = pd.read_csv(filepath)
        # Filter J&K data
        jk_df = df[df['State'].str.contains('Jammu|Kashmir|J&K', case=False, na=False)]
        print(f"✅ NCRB J&K records: {len(jk_df)}")
        return jk_df

    # If no file, download sample from public API
    print("⚠️  NCRB file not found. Download from ncrb.gov.in/en/road-accidents-in-india")
    print("   Place file at: data/ncrb_jk_accidents.csv")
    return None


def load_irad_data(filepath: str = None) -> pd.DataFrame:
    """
    Load iRAD (Integrated Road Accident Database) data.
    Register at: https://irad.nic.in
    Ministry of Road Transport & Highways database.
    """
    if filepath and Path(filepath).exists():
        df = pd.read_excel(filepath)
        jk_df = df[df['STATE'].str.contains('JAMMU|KASHMIR', case=False, na=False)]
        print(f"✅ iRAD J&K records: {len(jk_df)}")
        return jk_df
    print("⚠️  iRAD file not found. Download from irad.nic.in")
    return None


def fetch_imd_weather(lat: float, lng: float, date: str) -> dict:
    """
    Fetch historical weather from India Meteorological Department.
    OR use Open-Meteo historical API (free, no key).
    """
    try:
        url = (
            f"https://archive-api.open-meteo.com/v1/archive"
            f"?latitude={lat}&longitude={lng}"
            f"&start_date={date}&end_date={date}"
            f"&hourly=temperature_2m,precipitation,snowfall,visibility,windspeed_10m"
            f"&timezone=Asia/Kolkata"
        )
        r = requests.get(url, timeout=10)
        data = r.json()
        hourly = data.get('hourly', {})
        # Return average for the day
        return {
            'temp'       : np.mean(hourly.get('temperature_2m', [15])),
            'rain'       : np.sum(hourly.get('precipitation', [0])),
            'snow'       : np.sum(hourly.get('snowfall', [0])),
            'visibility' : np.mean(hourly.get('visibility', [10000])) / 1000,  # km
            'wind'       : np.mean(hourly.get('windspeed_10m', [10])),
        }
    except Exception as e:
        print(f"Weather API failed: {e}")
        return {'temp':15, 'rain':0, 'snow':0, 'visibility':10, 'wind':10}


# ================================================================
#  STEP 2 — FEATURE ENGINEERING (same as before + new features)
# ================================================================

DANGER_ZONES = [
    {"id":1, "name":"Banihal Pass",     "lat":33.5120, "lng":75.2000, "radius":0.12, "alt":2832},
    {"id":2, "name":"Zoji La",          "lat":34.2600, "lng":75.4800, "radius":0.15, "alt":3528},
    {"id":3, "name":"Jawahar Tunnel",   "lat":33.3200, "lng":75.1500, "radius":0.10, "alt":1890},
    {"id":4, "name":"Rohtang Pass",     "lat":32.3714, "lng":77.2441, "radius":0.12, "alt":3978},
    {"id":5, "name":"Sinthan Top",      "lat":33.6500, "lng":75.5000, "radius":0.10, "alt":3748},
    {"id":6, "name":"Mughal Road",      "lat":33.4800, "lng":74.5200, "radius":0.10, "alt":2100},
    {"id":7, "name":"Nathatop",         "lat":33.0500, "lng":75.1000, "radius":0.08, "alt":2390},
    {"id":8, "name":"Patnitop Hairpin", "lat":33.1000, "lng":75.2800, "radius":0.09, "alt":2024},
]

FEATURES = [
    'speed', 'vehicle_type_enc', 'dist_to_zone_km', 'zone_id',
    'altitude_m', 'curvature_deg', 'hour', 'month', 'is_night',
    'is_winter', 'weather_code', 'temperature', 'visibility_km',
    'snowfall', 'rainfall', 'driver_age', 'driving_hours',
    'is_fatigued', 'prev_violations', 'traffic_density',
    'speed_zone_ratio', 'risk_composite', 'low_visibility',
    'night_bad_weather', 'heavy_on_curve',
    # NEW features for v2
    'altitude_risk',    # altitude/4000 — thin air + ice risk
    'rainfall_speed',   # rain * speed — wet road danger
    'weekend',          # weekend = more traffic = more risk
    'near_tunnel',      # is vehicle near a tunnel?
]

TYPE_MAP = {'Car':0, 'Truck':1, 'Bus':2, 'Bike':3, 'SUV':0}

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Encode vehicle type
    df['vehicle_type_enc'] = df.get('vehicle_type', 'Car').map(
        lambda x: TYPE_MAP.get(str(x), 0)
    )

    # Distance to nearest danger zone
    def nearest_zone(lat, lng):
        min_d = 999
        zone_id = 1
        alt = 1500
        for z in DANGER_ZONES:
            d = ((lat - z['lat'])**2 + (lng - z['lng'])**2)**0.5 * 111
            if d < min_d:
                min_d = d; zone_id = z['id']; alt = z['alt']
        return min_d, zone_id, alt

    if 'lat' in df.columns and 'lng' in df.columns:
        zones = df.apply(lambda r: nearest_zone(r.get('lat',33.5), r.get('lng',75.2)), axis=1)
        df['dist_to_zone_km'] = zones.apply(lambda x: x[0])
        df['zone_id']         = zones.apply(lambda x: x[1])
        df['altitude_m']      = zones.apply(lambda x: x[2])
    else:
        df['dist_to_zone_km'] = df.get('dist_to_zone_km', 5.0)
        df['zone_id']         = df.get('zone_id', 1)
        df['altitude_m']      = df.get('altitude_m', 1500)

    # Time features
    if 'hour'  not in df.columns: df['hour']  = 12
    if 'month' not in df.columns: df['month'] = 6
    df['is_night']   = ((df['hour'] < 6) | (df['hour'] > 21)).astype(int)
    df['is_winter']  = df['month'].isin([11,12,1,2,3]).astype(int)
    df['weekend']    = 0  # set from actual date if available

    # Weather
    df['weather_code'] = df.get('weather_code', 0)
    df['temperature']  = df.get('temperature', 15)
    df['visibility_km']= df.get('visibility_km', 10)
    df['snowfall']     = df.get('snowfall', 0)
    df['rainfall']     = df.get('rainfall', 0)

    # Driver
    df['driver_age']      = df.get('driver_age', 35)
    df['driving_hours']   = df.get('driving_hours', 2)
    df['is_fatigued']     = (df['driving_hours'] > 6).astype(int)
    df['prev_violations'] = df.get('prev_violations', 0)
    df['traffic_density'] = df.get('traffic_density', 20)
    df['curvature_deg']   = df.get('curvature_deg', 30)

    # Engineered features
    df['speed_zone_ratio']  = df['speed'] / (20 + df['zone_id'] * 2)
    df['risk_composite']    = (
        (df['speed']/100).clip(0,1) * 0.35 +
        (1 / (df['dist_to_zone_km'] + 0.1)) * 0.25 +
        (df['weather_code']/3).clip(0,1) * 0.15 +
        df['is_night'] * 0.10 +
        (df['altitude_m']/4000).clip(0,1) * 0.10 +
        df['is_fatigued'] * 0.05
    )
    df['low_visibility']   = (df['visibility_km'] < 2.0).astype(int)
    df['night_bad_weather'] = df['is_night'] * (df['weather_code'] > 0).astype(int)
    df['heavy_on_curve']   = (df['vehicle_type_enc'] > 0).astype(int) * (df['curvature_deg'] > 45).astype(int)
    df['altitude_risk']    = (df['altitude_m'] / 4000).clip(0, 1)
    df['rainfall_speed']   = (df['rainfall'] * df['speed'] / 1000).clip(0, 1)
    df['near_tunnel']      = (df['dist_to_zone_km'] < 1.0).astype(int) * (df['zone_id'] == 3).astype(int)

    return df


def generate_synthetic_data(n: int = 20000) -> pd.DataFrame:
    """
    Generate realistic J&K mountain road data.
    Used when real NCRB/iRAD data isn't available yet.
    """
    np.random.seed(42)
    rows = []
    for _ in range(n):
        z    = DANGER_ZONES[np.random.randint(len(DANGER_ZONES))]
        spd  = np.random.randint(10, 120)
        vtyp = np.random.choice(['Car','Truck','Bus','Bike'], p=[0.45,0.20,0.25,0.10])
        dist = np.random.exponential(3.0)
        hour = np.random.randint(0, 24)
        mon  = np.random.randint(1, 13)
        wx   = np.random.choice([0,1,2,3], p=[0.55,0.20,0.15,0.10])
        temp = np.random.normal(10, 12)
        vis  = max(0.1, {0:10,1:5,2:1.5,3:0.5}[wx] + np.random.normal(0,0.5))
        snow = max(0, np.random.exponential(0.5) if wx==3 else 0)
        rain = max(0, np.random.exponential(2)   if wx==1 else 0)
        dage = np.random.randint(18, 65)
        dhrs = np.random.exponential(2.5)
        pvio = np.random.randint(0, 10)
        alt  = z['alt'] + np.random.normal(0, 200)

        # Label with domain knowledge
        risk = 0.0
        zone_limit = 20 if z['id'] in [1,2] else 30
        if spd > zone_limit * 1.5: risk += 0.45
        elif spd > zone_limit:     risk += 0.25
        if dist < 0.5:  risk += 0.35
        elif dist < 1.5:risk += 0.20
        risk += {0:0,1:0.08,2:0.15,3:0.25}[wx]
        if hour<6 or hour>21: risk += 0.12
        if alt > 3000:  risk += 0.15
        if vtyp in ['Truck','Bus']: risk += 0.08
        if dhrs > 6:    risk += 0.10
        risk += min(pvio * 0.03, 0.15)
        risk += np.random.normal(0, 0.08)
        risk  = max(0, min(1, risk))

        rows.append({
            'speed':spd,'vehicle_type':vtyp,'lat':z['lat'],'lng':z['lng'],
            'hour':hour,'month':mon,'weather_code':wx,'temperature':temp,
            'visibility_km':vis,'snowfall':snow,'rainfall':rain,
            'driver_age':dage,'driving_hours':dhrs,'prev_violations':pvio,
            'traffic_density':np.random.randint(0,100),'curvature_deg':np.random.randint(0,180),
            'accident': 1 if risk > 0.55 else 0,
        })
    df = pd.DataFrame(rows)
    print(f"✅ Synthetic data: {len(df)} samples | Accident rate: {df['accident'].mean():.1%}")
    return df


# ================================================================
#  STEP 3 — TRAIN MODEL
# ================================================================

def train_model(df: pd.DataFrame):
    print(f"\n{'='*55}")
    print(f"  Training XGBoost Model — HillSafe AI v2")
    print(f"{'='*55}")

    df  = engineer_features(df)
    feats_available = [f for f in FEATURES if f in df.columns]
    X   = df[feats_available].fillna(0)
    y   = df['accident']

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)
    print(f"Train: {len(X_tr)} | Test: {len(X_te)} | Features: {len(feats_available)}")

    model = XGBClassifier(
        n_estimators     = 400,
        max_depth        = 7,
        learning_rate    = 0.06,
        subsample        = 0.85,
        colsample_bytree = 0.80,
        min_child_weight = 4,
        gamma            = 0.1,
        scale_pos_weight = (y_tr==0).sum() / max(1,(y_tr==1).sum()),
        random_state     = 42,
        eval_metric      = 'logloss',
        use_label_encoder= False,
        verbosity        = 0,
    )
    model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=False)

    y_pred  = model.predict(X_te)
    y_proba = model.predict_proba(X_te)[:, 1]
    acc     = accuracy_score(y_te, y_pred)
    auc     = roc_auc_score(y_te, y_proba)

    print(f"\n✅ Accuracy: {acc:.2%}  |  AUC-ROC: {auc:.3f}")
    print(f"\n{classification_report(y_te, y_pred, target_names=['Safe','Accident'])}")

    # Feature importance
    importance = pd.Series(model.feature_importances_, index=feats_available).sort_values(ascending=False)
    print("🔍 Top 10 Features:")
    for feat, imp in importance.head(10).items():
        print(f"  {feat:<25} {'█'*int(imp*50)} {imp:.3f}")

    return model, acc, auc, feats_available


# ================================================================
#  STEP 4 — FASTAPI SERVER
# ================================================================

class VehicleData(BaseModel):
    vehicleId:        str
    speed:            float
    vehicle_type:     str   = 'Car'
    lat:              float = 33.5
    lng:              float = 75.2
    hour:             int   = 12
    month:            int   = 6
    weather_code:     int   = 0
    temperature:      float = 15.0
    visibility_km:    float = 10.0
    snowfall:         float = 0.0
    rainfall:         float = 0.0
    driver_age:       int   = 35
    driving_hours:    float = 2.0
    prev_violations:  int   = 0
    traffic_density:  int   = 20
    curvature_deg:    int   = 30

class BatchRequest(BaseModel):
    vehicles: list

def make_features(v: VehicleData, feat_cols):
    row = v.dict()
    df  = engineer_features(pd.DataFrame([row]))
    avail = [f for f in feat_cols if f in df.columns]
    return df[avail].fillna(0)

@app.get("/")
def root():
    return {
        "system"   : "HillSafe AI ML API v2",
        "model"    : "XGBoost + Real Data Pipeline",
        "features" : len(FEATURES),
        "status"   : "online" if _model else "model not loaded",
    }

@app.post("/predict")
def predict(v: VehicleData):
    if not _model: raise HTTPException(503, "Model not loaded")
    fc    = _model.get('features', FEATURES)
    X     = make_features(v, fc)
    prob  = float(_model['model'].predict_proba(X)[0][1])
    risk  = 'CRITICAL' if prob>=0.80 else 'HIGH' if prob>=0.60 else 'MEDIUM' if prob>=0.40 else 'LOW'
    actions = {
        'CRITICAL':'IMMEDIATE: ECU lock + alert driver + dispatch ambulance',
        'HIGH'    :'Reduce speed NOW. Monitor closely.',
        'MEDIUM'  :'Send speed warning. Watch driver pattern.',
        'LOW'     :'Normal monitoring.',
    }
    return {
        'vehicleId'        : v.vehicleId,
        'dangerProbability': round(prob, 3),
        'riskLevel'        : risk,
        'action'           : actions[risk],
        'timestamp'        : datetime.now().isoformat(),
    }

@app.post("/predict-batch")
def predict_batch(req: BatchRequest):
    if not _model: raise HTTPException(503, "Model not loaded")
    results, high = [], 0
    fc = _model.get('features', FEATURES)
    for item in req.vehicles:
        v    = VehicleData(**item) if isinstance(item, dict) else item
        X    = make_features(v, fc)
        prob = float(_model['model'].predict_proba(X)[0][1])
        risk = 'CRITICAL' if prob>=0.80 else 'HIGH' if prob>=0.60 else 'MEDIUM' if prob>=0.40 else 'LOW'
        if risk in ['CRITICAL','HIGH']: high += 1
        results.append({'vehicleId':v.vehicleId, 'dangerProbability':round(prob,3), 'riskLevel':risk})
    results.sort(key=lambda x: x['dangerProbability'], reverse=True)
    return {'total':len(results),'highRiskCount':high,'results':results,'timestamp':datetime.now().isoformat()}

@app.post("/retrain")
def retrain():
    global _model
    print("Retraining model with latest data...")
    # Try real data first, fall back to synthetic
    real_df = load_real_data_from_mysql()
    df      = real_df if real_df is not None else generate_synthetic_data(20000)
    model, acc, auc, feats = train_model(df)
    obj = {'model':model,'features':feats,'accuracy':acc,'auc':auc,'trained_at':datetime.now().isoformat()}
    joblib.dump(obj, MODEL_PATH)
    _model = obj
    return {'success':True,'accuracy':round(acc,4),'auc':round(auc,3),'features':len(feats)}

@app.get("/model-info")
def model_info():
    if not _model: return {'status':'not loaded'}
    return {
        'accuracy'  : round(_model.get('accuracy',0),4),
        'auc'       : round(_model.get('auc',0),3),
        'features'  : len(_model.get('features',[])),
        'trained_at': _model.get('trained_at','unknown'),
    }

# ================================================================
#  MAIN
# ================================================================

if __name__ == "__main__":
    print("="*55)
    print("  HillSafe AI — ML Server v2 (Real Data Pipeline)")
    print("="*55)

    # Load or train
    if Path(MODEL_PATH).exists():
        _model = joblib.load(MODEL_PATH)
        print(f"✅ Model loaded | Acc: {_model.get('accuracy',0):.2%}")
    else:
        print("Training fresh model...")
        # Try MySQL → NCRB → synthetic
        df = (
            load_real_data_from_mysql() or
            load_ncrb_data("data/ncrb_jk_accidents.csv") or
            generate_synthetic_data(20000)
        )
        model, acc, auc, feats = train_model(df)
        _model = {'model':model,'features':feats,'accuracy':acc,'auc':auc,'trained_at':datetime.now().isoformat()}
        joblib.dump(_model, MODEL_PATH)

    print(f"\n🚀 Starting API → http://localhost:5000\n")
    uvicorn.run(app, host="0.0.0.0", port=5000, log_level="warning")
