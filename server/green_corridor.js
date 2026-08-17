// green_corridor.js — HillSafe AI v9.0
// Green Corridor: Clears road BEFORE ambulance departs

const AMBU_SPEED   = 55;
const CORRIDOR_R   = 3.0;
const RECHECK_MS   = 20000;

const HOSPITALS = [
  { id:1, name:'SMHS Hospital Srinagar',       lat:34.0890, lng:74.8001, trauma:true },
  { id:2, name:'Govt Hospital Banihal',         lat:33.4905, lng:75.1833, trauma:false },
  { id:3, name:'District Hospital Ramban',      lat:33.2442, lng:75.2292, trauma:false },
  { id:4, name:'GMC Hospital Jammu',            lat:32.7229, lng:74.8556, trauma:true },
  { id:5, name:'District Hospital Anantnag',    lat:33.7311, lng:75.1487, trauma:false },
  { id:6, name:'Sub District Hospital Qazigund',lat:33.5826, lng:75.1245, trauma:false },
];

class GreenCorridorSystem {
  constructor(io, vehiclePositions) {
    this.io = io;
    this.vp = vehiclePositions;
    this.active  = null;
    this.history = [];
    this._timer  = null;
    this._cid    = 0;
  }

  distKm(lat1,lng1,lat2,lng2) {
    const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  perpDist(pLat,pLng,aLat,aLng,bLat,bLng) {
    const AB=this.distKm(aLat,aLng,bLat,bLng);
    if(AB<0.01) return this.distKm(pLat,pLng,aLat,aLng);
    const AP=this.distKm(pLat,pLng,aLat,aLng), BP=this.distKm(pLat,pLng,bLat,bLng);
    const s=(AB+AP+BP)/2, area=Math.sqrt(Math.max(0,s*(s-AB)*(s-AP)*(s-BP)));
    const t=(AP**2-BP**2+AB**2)/(2*AB**2);
    if(t<0||t>1) return 9999;
    return (2*area)/AB;
  }

  nearestHospital(lat,lng) {
    let best=HOSPITALS[0], bd=Infinity;
    HOSPITALS.forEach(h=>{ const d=this.distKm(lat,lng,h.lat,h.lng); if(d<bd){bd=d;best=h;} });
    return { hospital:best, distKm:parseFloat(bd.toFixed(2)) };
  }

  vehiclesOnRoute(hLat,hLng,aLat,aLng) {
    const rl=this.distKm(hLat,hLng,aLat,aLng), out=[];
    Object.entries(this.vp).forEach(([id,v])=>{
      if(v.status==='accident') return;
      const pd=this.perpDist(v.lat,v.lng,hLat,hLng,aLat,aLng);
      const dH=this.distKm(v.lat,v.lng,hLat,hLng), dA=this.distKm(v.lat,v.lng,aLat,aLng);
      if(pd<=CORRIDOR_R && dH<=rl+2 && dA<=rl+2) {
        out.push({ id, vehicle:v, distFromHospKm:+dH.toFixed(2), ambuEtaMin:Math.round((dH/AMBU_SPEED)*60) });
      }
    });
    return out.sort((a,b)=>a.distFromHospKm-b.distFromHospKm);
  }

  pulloverInstruction(type, eta) {
    const u = eta<3?'IMMEDIATELY':`in ${eta} minutes`;
    return ({
      Car  :`Pull completely to left shoulder ${u}. Turn hazard lights ON. Stop engine.`,
      Truck:`Find nearest turnout and pull fully left ${u}. If no space, reverse to nearest passing bay.`,
      Bus  :`Pull as far left as road allows ${u}. Open doors and move passengers left.`,
      Bike :`Move to extreme left edge immediately. Dismount and move away from road.`,
    })[type] || `Pull vehicle to left side ${u}. Stop and turn on hazard lights.`;
  }

  activateCorridor(accidentData) {
    if(this.active) this.deactivateCorridor('replaced');
    const { vehicleId, lat:aLat, lng:aLng, vehicle:v } = accidentData;
    const { hospital:h } = this.nearestHospital(aLat, aLng);
    const dist = this.distKm(h.lat,h.lng,aLat,aLng);
    const eta  = Math.round((dist/AMBU_SPEED)*60);
    const cid  = `GC-${++this._cid}-${Date.now()}`;
    const onRoute = this.vehiclesOnRoute(h.lat,h.lng,aLat,aLng);

    this.active = { id:cid, aLat, aLng, hospLat:h.lat, hospLng:h.lng, hospitalName:h.name,
      patientBlood:v?.blood, patientName:v?.name, etaMinutes:eta,
      routeDistKm:+dist.toFixed(1), vehiclesAlerted:onRoute.length,
      activatedAt:new Date().toLocaleTimeString(), status:'ACTIVE' };

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚑 GREEN CORRIDOR: ${cid}`);
    console.log(`   Hospital: ${h.name} | ETA: ${eta} min | Vehicles: ${onRoute.length}`);
    console.log(`${'='.repeat(50)}\n`);

    onRoute.forEach(({ id, vehicle:vv, ambuEtaMin }) => {
      this.io.emit('greenCorridorAlert', {
        corridorId:cid, targetVehicleId:id,
        plate:vv.plate, driver:vv.name, vehicleType:vv.type, blood:vv.blood,
        priority: ambuEtaMin<5?'CRITICAL':ambuEtaMin<10?'HIGH':'NORMAL',
        title:'🚑 AMBULANCE APPROACHING — CLEAR THE ROAD',
        message:`Ambulance from ${h.name} will reach you in ~${ambuEtaMin} minutes.`,
        instruction:this.pulloverInstruction(vv.type, ambuEtaMin),
        ambulanceEtaMin:ambuEtaMin, hospitalName:h.name,
        accidentLocation:{lat:aLat,lng:aLng}, hospitalLocation:{lat:h.lat,lng:h.lng},
        patientBlood:v?.blood, time:new Date().toLocaleTimeString(),
      });
    });

    this.io.emit('hospitalCorridorAlert', {
      corridorId:cid, hospital:h.name, patientBlood:v?.blood, patientName:v?.name,
      etaMinutes:eta, distanceKm:dist,
      message:`Ambulance dispatched. ETA ${eta} min. Blood: ${v?.blood||'Unknown'}. Prepare trauma bay.`,
      time:new Date().toLocaleTimeString(),
    });

    this.io.emit('corridorActivated', {
      ...this.active, hospital:h, vehiclesAlerted:onRoute.length,
      topVehicles:onRoute.slice(0,8).map(x=>({ id:x.id, plate:x.vehicle.plate, type:x.vehicle.type, distKm:x.distFromHospKm, etaMin:x.ambuEtaMin })),
    });

    this._timer = setInterval(()=>this._monitor(), RECHECK_MS);
    setTimeout(()=>{ if(this.active?.id===cid) this.deactivateCorridor('Ambulance reached site'); }, (eta+20)*60000);
    return this.active;
  }

  _monitor() {
    if(!this.active) return;
    const { hospLat, hospLng, aLat, aLng } = this.active;
    const still = this.vehiclesOnRoute(hospLat,hospLng,aLat,aLng).filter(x=>x.vehicle.speed>15);
    still.forEach(({ id, vehicle:v, ambuEtaMin }) => {
      this.io.emit('corridorViolation', {
        vehicleId:id, plate:v.plate, speed:v.speed,
        message:`${v.plate} still blocking ambulance path. Speed: ${v.speed} km/h. Pull left NOW.`,
        time:new Date().toLocaleTimeString(),
      });
    });
    this.io.emit('corridorStatus', {
      corridorId:this.active?.id, vehiclesStillInPath:still.length,
      corridorClear:still.length===0, time:new Date().toLocaleTimeString(),
    });
  }

  deactivateCorridor(reason='Mission complete') {
    if(!this.active) return;
    clearInterval(this._timer);
    this.io.emit('corridorDeactivated', {
      corridorId:this.active.id, reason,
      message:`✅ Green Corridor closed. ${reason}. Road open for normal traffic.`,
      time:new Date().toLocaleTimeString(),
    });
    this.history.push({ ...this.active, deactivatedAt:new Date().toISOString(), reason });
    console.log(`✅ GREEN CORRIDOR ${this.active.id} closed: ${reason}`);
    this.active = null;
  }

  getStatus()  { return this.active ? { active:true, corridor:this.active } : { active:false, message:'No active corridor' }; }
  getHistory() { return this.history; }
}

module.exports = GreenCorridorSystem;
