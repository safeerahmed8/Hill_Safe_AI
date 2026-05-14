// reroute.js — HillSafe AI v7.0 — Accident Rerouting Module

// ============================================
// ALTERNATE ROUTES — one per danger zone
// Each zone has a bypass path with waypoints
// ============================================
const alternateRoutes = {
  1: {
    zone       : 'Banihal Pass Curve',
    blockedLat : 33.5120, blockedLng: 75.2000,
    reason     : 'Accident at Banihal Pass Curve — road blocked',
    detour     : 'Take Banihal Bypass Road via Ramban → rejoin NH44 after Banihal Tunnel',
    waypoints  : [
      { lat: 33.4900, lng: 75.1500, label: 'Ramban Diversion Point' },
      { lat: 33.5000, lng: 75.1700, label: 'Bypass Road Entry'      },
      { lat: 33.5300, lng: 75.2300, label: 'Rejoin NH44 Post Tunnel' }
    ],
    estimatedDelay: '25 mins extra'
  },
  2: {
    zone       : 'Zoji La Summit',
    blockedLat : 34.2600, blockedLng: 75.4800,
    reason     : 'Accident at Zoji La Summit — road blocked',
    detour     : 'Route closed — return to Sonamarg and wait for clearance. No alternate exists for Zoji La.',
    waypoints  : [
      { lat: 34.1800, lng: 75.3500, label: 'Sonamarg Holding Point' },
      { lat: 34.2000, lng: 75.4000, label: 'BRO Control Post'       }
    ],
    estimatedDelay: 'Indefinite — await clearance'
  },
  3: {
    zone       : 'Jawahar Tunnel Entry',
    blockedLat : 33.3200, blockedLng: 75.1500,
    reason     : 'Accident at Jawahar Tunnel Entry — tunnel closed',
    detour     : 'Use Banihal Rail Tunnel service road via Qazigund → Banihal',
    waypoints  : [
      { lat: 33.3000, lng: 75.1000, label: 'Qazigund Diversion'       },
      { lat: 33.3100, lng: 75.1200, label: 'Service Road Entry'        },
      { lat: 33.3400, lng: 75.1800, label: 'Banihal Town Rejoin Point' }
    ],
    estimatedDelay: '20 mins extra'
  },
  4: {
    zone       : 'Rohtang Pass',
    blockedLat : 32.3714, blockedLng: 77.2441,
    reason     : 'Accident at Rohtang Pass — road blocked',
    detour     : 'Use Atal Tunnel (Rohtang Tunnel) via Solang Valley → Sissu',
    waypoints  : [
      { lat: 32.3100, lng: 77.1800, label: 'Solang Valley Turn'   },
      { lat: 32.3300, lng: 77.2000, label: 'Atal Tunnel Entry'    },
      { lat: 32.4800, lng: 77.3200, label: 'Sissu Tunnel Exit'    }
    ],
    estimatedDelay: '15 mins extra'
  },
  5: {
    zone       : 'Sinthan Top',
    blockedLat : 33.6500, blockedLng: 75.5000,
    reason     : 'Accident at Sinthan Top — road blocked',
    detour     : 'Return to Kokernag → take Pahalgam route via Aru Valley',
    waypoints  : [
      { lat: 33.6000, lng: 75.4000, label: 'Kokernag Turnaround'  },
      { lat: 33.5500, lng: 75.3500, label: 'Pahalgam Road Entry'  },
      { lat: 33.7300, lng: 75.3100, label: 'Aru Valley Waypoint'  }
    ],
    estimatedDelay: '40 mins extra'
  },
  6: {
    zone       : 'Mughal Road Curve',
    blockedLat : 33.4800, blockedLng: 74.5200,
    reason     : 'Accident at Mughal Road Curve — road blocked',
    detour     : 'Use Jawahar Tunnel route via Banihal → Ramban → Udhampur',
    waypoints  : [
      { lat: 33.4500, lng: 74.4500, label: 'Shopian Diversion'     },
      { lat: 33.4000, lng: 74.8000, label: 'Banihal Route Entry'   },
      { lat: 33.3200, lng: 75.1500, label: 'NH44 Reconnect Point'  }
    ],
    estimatedDelay: '60 mins extra'
  },
  7: {
    zone       : 'Nathatop Blind Curve',
    blockedLat : 33.0500, blockedLng: 75.1000,
    reason     : 'Accident at Nathatop Blind Curve — road blocked',
    detour     : 'Take Kud–Batote bypass road → rejoin NH44 at Ramban',
    waypoints  : [
      { lat: 33.0300, lng: 75.0600, label: 'Kud Diversion Point'   },
      { lat: 33.0600, lng: 75.0800, label: 'Batote Bypass Entry'   },
      { lat: 33.1100, lng: 75.2000, label: 'Ramban Rejoin NH44'    }
    ],
    estimatedDelay: '20 mins extra'
  },
  8: {
    zone       : 'Patnitop Hairpin',
    blockedLat : 33.1000, blockedLng: 75.2800,
    reason     : 'Accident at Patnitop Hairpin — road blocked',
    detour     : 'Use Nashri Tunnel bypass → proceed via Chenani → Udhampur directly',
    waypoints  : [
      { lat: 33.0800, lng: 75.2200, label: 'Nashri Tunnel Entry'   },
      { lat: 33.0600, lng: 75.1800, label: 'Chenani Town'          },
      { lat: 32.9100, lng: 75.1400, label: 'Udhampur Reconnect'    }
    ],
    estimatedDelay: '15 mins extra'
  }
};

// ============================================
// BLOCKED ZONES STATE
// ============================================
const blockedZones = {}; // { zoneId: { blockedAt, reason, route } }

// ============================================
// BLOCK A ZONE
// ============================================
function blockZone(zoneId, reason = null) {
  const route = alternateRoutes[zoneId];
  if (!route) return null;

  blockedZones[zoneId] = {
    zoneId,
    zoneName  : route.zone,
    blockedAt : new Date().toLocaleTimeString(),
    reason    : reason || route.reason,
    route
  };

  console.log(`🚧 Zone ${zoneId} (${route.zone}) BLOCKED — rerouting active`);
  return blockedZones[zoneId];
}

// ============================================
// CLEAR A ZONE
// ============================================
function clearZone(zoneId) {
  if (!blockedZones[zoneId]) return null;
  const zoneName = blockedZones[zoneId].zoneName;
  delete blockedZones[zoneId];
  console.log(`✅ Zone ${zoneId} (${zoneName}) CLEARED — normal traffic resumed`);
  return { zoneId, zoneName };
}

// ============================================
// GET ALTERNATE ROUTE FOR A ZONE
// ============================================
function getAlternateRoute(zoneId) {
  return alternateRoutes[zoneId] || null;
}

// ============================================
// GET ALL BLOCKED ZONES
// ============================================
function getBlockedZones() {
  return blockedZones;
}

// ============================================
// CHECK IF A VEHICLE IS NEAR A BLOCKED ZONE
// ============================================
function isNearBlockedZone(lat, lng, radiusKm = 5) {
  const R = 111; // 1 degree ≈ 111 km
  for (const zoneId in blockedZones) {
    const route = blockedZones[zoneId].route;
    const distDeg = Math.sqrt(
      Math.pow(lat - route.blockedLat, 2) +
      Math.pow(lng - route.blockedLng, 2)
    );
    const distKm = distDeg * R;
    if (distKm <= radiusKm) return { zoneId: parseInt(zoneId), ...blockedZones[zoneId] };
  }
  return null;
}

module.exports = { blockZone, clearZone, getAlternateRoute, getBlockedZones, isNearBlockedZone, alternateRoutes };