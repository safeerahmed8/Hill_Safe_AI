// reroute.js — HillSafe AI
// 11 Alternate routes across J&K + Delhi urban zones

let _pool = null;
const blockedZones = {};

const alternateRoutes = {
  1: { zoneName:'Banihal Pass Curve',   detour:'Via Banihal Bypass → Rejoin NH-44 at Ramban',             waypoints:['Ramban','Banihal Bypass','Qazigund'],     estimatedDelay:'25 min' },
  2: { zoneName:'Zoji La Summit',        detour:'Via Z-Morh Tunnel → Sonamarg → Rejoin NH-1',              waypoints:['Sonamarg','Z-Morh Tunnel','Drass'],        estimatedDelay:'45 min' },
  3: { zoneName:'Jawahar Tunnel Entry',  detour:'Via Banihal Railway Tunnel Road → Banihal Town',          waypoints:['Banihal Town','Railway Tunnel Road'],       estimatedDelay:'20 min' },
  4: { zoneName:'Rohtang Pass',          detour:'Via Atal Tunnel → Solang Valley → Manali',                waypoints:['Solang Valley','Atal Tunnel','Sissu'],      estimatedDelay:'35 min' },
  5: { zoneName:'Sinthan Top',           detour:'Via Kokernag → Anantnag → Srinagar',                      waypoints:['Kokernag','Anantnag','Srinagar'],           estimatedDelay:'50 min' },
  6: { zoneName:'Mughal Road Curve',     detour:'Via Shopian → Pulwama → Srinagar',                        waypoints:['Shopian','Pulwama','Srinagar'],             estimatedDelay:'30 min' },
  7: { zoneName:'Nathatop Blind Curve',  detour:'Via Ramnagar → Udhampur Bypass',                          waypoints:['Ramnagar','Chenani','Udhampur Bypass'],     estimatedDelay:'15 min' },
  8: { zoneName:'Patnitop Hairpin',      detour:'Via Sudh Mahadev Road → Lower Patnitop',                  waypoints:['Sudh Mahadev','Lower Patnitop','Batote'],   estimatedDelay:'18 min' },
  9: { zoneName:'Peer Ki Gali',          detour:'Descend to Poonch → switch to NH-44 via Jammu',           waypoints:['Poonch','Rajouri','Jammu (NH-44)'],         estimatedDelay:'90 min' },
  10:{ zoneName:'Sonamarg',              detour:'Via old Baltal bypass road → rejoin NH-1 past the pass',  waypoints:['Baltal','Zoji La base','Drass'],            estimatedDelay:'40 min' },
  11:{ zoneName:'Delhi – ITO Chowk',     detour:'Via Ring Road → Vikas Marg → bypass ITO signal complex',  waypoints:['Ring Road','Vikas Marg','Laxmi Nagar'],     estimatedDelay:'12 min' },
};

function setPool(pool) { _pool = pool; }

function blockZone(zoneId, reason = '') {
  const route = alternateRoutes[zoneId];
  if (!route) return null;
  blockedZones[zoneId] = { zoneId, zoneName: route.zoneName, reason, route, blockedAt: new Date().toISOString() };
  return blockedZones[zoneId];
}

function clearZone(zoneId) {
  if (!blockedZones[zoneId]) return null;
  const info = { ...blockedZones[zoneId] };
  delete blockedZones[zoneId];
  return info;
}

function getAlternateRoute(zoneId) { return alternateRoutes[zoneId] || null; }
function getBlockedZones()         { return { ...blockedZones }; }
function getZoneStats()            { return { total: Object.keys(alternateRoutes).length, blocked: Object.keys(blockedZones).length, routes: alternateRoutes }; }

function isNearBlockedZone(lat, lng, radiusKm = 5) {
  for (const [id, info] of Object.entries(blockedZones)) {
    const route   = alternateRoutes[parseInt(id)];
    if (!route) continue;
    const distance = Math.sqrt(Math.pow(lat - 33.5, 2) + Math.pow(lng - 75.2, 2)) * 111;
    if (distance < radiusKm) return { ...info };
  }
  return null;
}

module.exports = { setPool, blockZone, clearZone, getAlternateRoute, getBlockedZones, getZoneStats, isNearBlockedZone, alternateRoutes };
