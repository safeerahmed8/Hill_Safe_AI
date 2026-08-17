// weather_service.js — HillSafe AI
// Real weather for all J&K + Delhi zones
// Uses Open-Meteo API — FREE, no API key needed

const ZONES = [
  { id:1, name:'Banihal Pass Curve',   lat:33.5120, lng:75.2000 },
  { id:2, name:'Zoji La Summit',       lat:34.2600, lng:75.4800 },
  { id:3, name:'Jawahar Tunnel Entry', lat:33.3200, lng:75.1500 },
  { id:4, name:'Rohtang Pass',         lat:32.3714, lng:77.2441 },
  { id:5, name:'Sinthan Top',          lat:33.6500, lng:75.5000 },
  { id:6, name:'Mughal Road Curve',    lat:33.4800, lng:74.5200 },
  { id:7, name:'Nathatop Blind Curve', lat:33.0500, lng:75.1000 },
  { id:8, name:'Patnitop Hairpin',     lat:33.1000, lng:75.2800 },
  { id:9, name:'Peer Ki Gali',         lat:33.6167, lng:74.7333 },
  { id:10,name:'Sonamarg',             lat:34.3020, lng:75.2941 },
  { id:11,name:'Delhi – ITO Chowk',    lat:28.6304, lng:77.2426 },
];

function parseCode(code) {
  if (code===0)    return { condition:'Clear',        emoji:'☀️',  mult:1.0 };
  if (code<=3)     return { condition:'Cloudy',       emoji:'⛅',  mult:1.1 };
  if (code<=49)    return { condition:'Fog',          emoji:'🌫️',  mult:2.0 };
  if (code<=69)    return { condition:'Rain',         emoji:'🌧️',  mult:1.8 };
  if (code<=79)    return { condition:'Snow',         emoji:'❄️',  mult:2.8 };
  if (code<=99)    return { condition:'Thunderstorm', emoji:'⛈️',  mult:2.5 };
  return              { condition:'Unknown',       emoji:'🌡️',  mult:1.0 };
}

const cache = {};

async function fetchZone(z) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${z.lat}&longitude=${z.lng}&current_weather=true&hourly=visibility,snowfall,precipitation&forecast_days=1`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    const w    = data.current_weather;
    const h    = new Date().getHours();
    const vis  = data.hourly?.visibility?.[h] ?? 10000;
    const snow = data.hourly?.snowfall?.[h]   ?? 0;
    const rain = data.hourly?.precipitation?.[h] ?? 0;
    const wObj = parseCode(w.weathercode);
    let extra  = 1.0;
    if (vis < 200)  extra = 1.5;
    else if (vis < 1000) extra = 1.2;
    if (snow > 2)   extra += 0.5;
    return {
      zoneId: z.id, zoneName: z.name,
      temperature: Math.round(w.temperature), windspeed: Math.round(w.windspeed),
      condition: wObj.condition, emoji: wObj.emoji,
      visibility: Math.round(vis/100)/10, snowfall: +snow.toFixed(1), rainfall: +rain.toFixed(1),
      dangerMultiplier: +((wObj.mult * extra).toFixed(2)),
      alert: wObj.mult > 1.5 ? `⚠️ ${wObj.emoji} ${wObj.condition} at ${z.name} — danger ×${(wObj.mult*extra).toFixed(1)}` : null,
      fetchedAt: new Date().toLocaleTimeString(),
    };
  } catch {
    return { zoneId:z.id, zoneName:z.name, condition:'Unknown', emoji:'🌡️', temperature:15, windspeed:0, visibility:10, snowfall:0, rainfall:0, dangerMultiplier:1.0, alert:null, fetchedAt:new Date().toLocaleTimeString() };
  }
}

async function fetchAllWeather() {
  console.log('🌦  Fetching weather for 8 danger zones...');
  const results = await Promise.all(ZONES.map(fetchZone));
  results.forEach(w => { cache[w.zoneId] = w; });
  const alerts = results.filter(w => w.alert);
  if (alerts.length) { console.log('🌨  Weather alerts:'); alerts.forEach(a => console.log(`   ${a.alert}`)); }
  else console.log('✅ All zones clear weather');
  return results;
}

const getWeather     = id  => cache[id]  || null;
const getAllWeather   = ()  => ({ ...cache });
const getMultiplier  = id  => cache[id]?.dangerMultiplier ?? 1.0;

module.exports = { fetchAllWeather, getWeather, getAllWeather, getMultiplier };
