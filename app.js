// Worldwatch OPS — Command Center
// Free APIs: USGS quakes, NASA FIRMS fires, NOAA NHC storms, OpenWeatherMap tiles, N2YO satellites, NewsAPI + RSS news.

const CFG = window.WW_CONFIG || {};

const REGIONS = [
  { name: "Ukraine", lat: 49.0, lon: 32.0 }, { name: "Russia", lat: 55.7, lon: 37.6 },
  { name: "Gaza", lat: 31.5, lon: 34.4 }, { name: "Israel", lat: 31.5, lon: 34.9 },
  { name: "Iran", lat: 32.4, lon: 53.7 }, { name: "Lebanon", lat: 33.9, lon: 35.5 },
  { name: "Syria", lat: 34.8, lon: 38.9 }, { name: "Yemen", lat: 15.5, lon: 48.5 },
  { name: "Red Sea", lat: 20.0, lon: 38.5 }, { name: "Strait of Hormuz", lat: 26.6, lon: 56.3 },
  { name: "Taiwan", lat: 23.7, lon: 121.0 }, { name: "South China Sea", lat: 12.0, lon: 115.0 },
  { name: "North Korea", lat: 40.3, lon: 127.5 }, { name: "Venezuela", lat: 6.4, lon: -66.6 },
  { name: "Sudan", lat: 12.9, lon: 30.2 }, { name: "Niger", lat: 17.6, lon: 8.1 },
  { name: "Sahel", lat: 14.5, lon: 0.0 }, { name: "Mexico", lat: 23.6, lon: -102.5 },
  { name: "Haiti", lat: 18.9, lon: -72.3 }, { name: "Pakistan", lat: 30.4, lon: 69.3 },
  { name: "Afghanistan", lat: 33.9, lon: 67.7 }, { name: "Kashmir", lat: 34.1, lon: 74.8 },
  { name: "Beijing", lat: 39.9, lon: 116.4 }, { name: "Moscow", lat: 55.7, lon: 37.6 },
  { name: "Washington", lat: 38.9, lon: -77.0 }, { name: "Brussels", lat: 50.8, lon: 4.4 },
  { name: "Tokyo", lat: 35.7, lon: 139.7 }, { name: "Seoul", lat: 37.6, lon: 127.0 },
  { name: "Pyongyang", lat: 39.0, lon: 125.7 }, { name: "Tehran", lat: 35.7, lon: 51.4 },
  { name: "Baghdad", lat: 33.3, lon: 44.4 }, { name: "Damascus", lat: 33.5, lon: 36.3 },
  { name: "Crimea", lat: 45.0, lon: 34.0 }, { name: "Donbas", lat: 48.0, lon: 38.0 },
  { name: "Suez", lat: 29.97, lon: 32.55 }, { name: "Panama Canal", lat: 9.08, lon: -79.68 },
];

const FEEDS = [
  { src: "Reuters World", cat: "conflict", url: "https://feeds.reuters.com/Reuters/worldNews" },
  { src: "BBC World", cat: "conflict", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { src: "AP Top", cat: "conflict", url: "https://feeds.apnews.com/rss/apf-topnews" },
  { src: "Al Jazeera", cat: "conflict", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { src: "AP World", cat: "conflict", url: "https://feeds.apnews.com/rss/apf-intlnews" },
  { src: "Defense News", cat: "defense", url: "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml" },
  { src: "War on the Rocks", cat: "defense", url: "https://warontherocks.com/feed/" },
  { src: "gCaptain", cat: "maritime", url: "https://gcaptain.com/feed/" },
  { src: "Maritime Executive", cat: "maritime", url: "https://www.maritime-executive.com/articles.rss" },
  { src: "AVweb", cat: "aviation", url: "https://www.avweb.com/feed/" },
  { src: "Aviation Week", cat: "aviation", url: "https://aviationweek.com/awn/rss.xml" },
  { src: "OilPrice", cat: "energy", url: "https://oilprice.com/rss/main" },
  { src: "Reuters Business", cat: "energy", url: "https://feeds.reuters.com/reuters/businessNews" },
  { src: "BleepingComputer", cat: "cyber", url: "https://www.bleepingcomputer.com/feed/" },
  { src: "The Hacker News", cat: "cyber", url: "https://feeds.feedburner.com/TheHackersNews" },
  { src: "ReliefWeb", cat: "disaster", url: "https://reliefweb.int/disasters/rss.xml" },
];

const KEYWORDS = {
  conflict: ["war","strike","attack","missile","drone","killed","casualt","front line","offensive","shelling","hostag","ceasefire","iran","ukraine","gaza","israel","russia","houthi"],
  maritime: ["vessel","tanker","shipping","strait","port","navy","naval","submarine","red sea","panama canal","hormuz","suez","freighter","container ship"],
  aviation: ["airline","aircraft","boeing","airbus","flight","aviation","airport","airspace","f-35","f-16"],
  energy: ["oil","gas","lng","opec","refinery","pipeline","crude","brent","wti","power grid","uranium","nuclear plant"],
  defense: ["pentagon","nato","defense","military","army","marines","weapons","arms"],
  cyber: ["cyber","ransomware","hack","breach","malware","ai ","artificial intelligence","openai","chatgpt","lockbit"],
  disaster: ["earthquake","tsunami","hurricane","typhoon","flood","wildfire","volcano","magnitude","evacuat"],
  diplomacy: ["summit","treaty","talks","diplomat","ambassador","sanction","agreement","g7","g20","united nations","putin","xi","biden","trump","macron"],
};
const SEVERE = {
  5: ["nuclear","killed dozens","killed hundreds","mass casual","tsunami","magnitude 7","magnitude 8"],
  4: ["killed","missile","strike","drone attack","hostage","evacuat","magnitude 6","ransomware"],
  3: ["clash","fired","blockade","sanction","outage","magnitude 5","breach","hack"],
  2: ["protest","warns","deploys","tension","summit"],
  1: [],
};

// State
let RAW = [];
let activeCat = "all";
let activeHours = 24;
let minSev = 0;
let q = "";
let map;
const layers = {}; // name -> L.LayerGroup or tile
const layerActive = { nasaTrue: true, quakes: true, fires: true, storms: true, lightning: true, news: true, sats: false, iss: true, clouds: true, precip: true, wind: false, temp: false };
let issMarker = null;
let issTimer = null;
let boltWs = null;
let boltCount = 0;
let boltDecayTimer = null;

// === Bootstrap ===
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

async function init() {
  startClock();
  initMap();
  bindUI();
  // initial loads in parallel
  await Promise.all([
    refreshNews(),
    refreshQuakes(),
    refreshFires(),
    refreshStorms(),
  ]);
  startISS();
  startLightning();
  startBoltDecay();
  // refreshes
  setInterval(refreshNews, 5 * 60 * 1000);
  setInterval(refreshQuakes, 5 * 60 * 1000);
  setInterval(refreshFires, 30 * 60 * 1000);
  setInterval(refreshStorms, 15 * 60 * 1000);
}

function startClock() {
  const tick = () => {
    const d = new Date();
    const c = document.getElementById("clock"); if (c) c.textContent = d.toLocaleTimeString("en-US", { hour12: false }) + " UTC";
    const dt = document.getElementById("date"); if (dt) dt.textContent = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
    const hd = document.getElementById("hdr-date"); if (hd) hd.textContent = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
  };
  tick(); setInterval(tick, 1000);
}

function initMap() {
  map = L.map("map", { worldCopyJump: true, zoomControl: true, attributionControl: true, minZoom: 2, maxZoom: 12 }).setView([20, 10], 2);
  // Always-on dark base + city labels
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: "© OpenStreetMap · CARTO", subdomains: "abcd", maxZoom: 19, opacity: 0.55,
  }).addTo(map);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd", maxZoom: 19, opacity: 0.85, zIndex: 650,
  }).addTo(map);

  // NASA Worldview / GIBS true-color (yesterday) — high resolution real-Earth imagery, default ON
  const yday = new Date(Date.now() - 36*3600*1000).toISOString().slice(0,10);
  layers.nasaTrue = L.tileLayer(
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${yday}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    { attribution: "NASA GIBS · VIIRS True Color", maxNativeZoom: 9, maxZoom: 12, opacity: 0.85, tileSize: 256 }
  ).addTo(map);

  // Weather (CLOUDS + PRECIP default ON, brighter)
  layers.clouds = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${CFG.OWM_KEY}`, { opacity: 0.55, attribution: "© OpenWeatherMap" }).addTo(map);
  layers.precip = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${CFG.OWM_KEY}`, { opacity: 0.85 }).addTo(map);
  layers.wind = L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${CFG.OWM_KEY}`, { opacity: 0.7 });
  layers.temp = L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${CFG.OWM_KEY}`, { opacity: 0.6 });

  layers.quakes = L.layerGroup().addTo(map);
  layers.fires = L.layerGroup().addTo(map);
  layers.storms = L.layerGroup().addTo(map);
  layers.lightning = L.layerGroup().addTo(map);
  layers.news = L.markerClusterGroup({ maxClusterRadius: 35, showCoverageOnHover: false, iconCreateFunction: (c) => L.divIcon({ html: `<div>${c.getChildCount()}</div>`, className: "marker-cluster", iconSize: [32,32] }) }).addTo(map);
  layers.sats = L.layerGroup();
  layers.iss = L.layerGroup().addTo(map);

  document.getElementById("map-meta").textContent = "READY · DRAG TO PAN · SCROLL TO ZOOM";
}

function bindUI() {
  // Accordion groups
  document.querySelectorAll(".grp-hdr").forEach(h => {
    h.addEventListener("click", () => {
      const g = h.parentElement;
      g.classList.toggle("collapsed");
    });
  });
  document.querySelectorAll('.lyr input').forEach(cb => {
    cb.addEventListener("change", () => {
      const name = cb.dataset.layer;
      layerActive[name] = cb.checked;
      const lyr = layers[name];
      if (!lyr) return;
      if (cb.checked) lyr.addTo(map); else map.removeLayer(lyr);
      if (name === "iss") cb.checked ? startISS() : stopISS();
      if (name === "sats" && cb.checked) loadSatellites();
      updateLayerCount();
    });
  });
  document.querySelectorAll(".cat").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".cat").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      activeCat = b.dataset.cat;
      render();
    });
  });
  document.querySelectorAll(".tr").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".tr").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      activeHours = parseInt(b.dataset.h, 10);
      render();
    });
  });
  document.getElementById("sev").addEventListener("input", e => {
    minSev = parseInt(e.target.value, 10);
    document.getElementById("sev-val").textContent = minSev;
    render();
  });
  document.getElementById("q").addEventListener("input", e => { q = e.target.value.toLowerCase(); render(); });
  document.getElementById("refresh").addEventListener("click", () => {
    document.getElementById("feed-meta").textContent = "REFRESHING…";
    refreshNews(); refreshQuakes(); refreshStorms();
  });
  document.getElementById("reset-view").addEventListener("click", () => map.setView([20, 10], 2));
  // Legend toggle (mobile)
  document.getElementById("legend-toggle")?.addEventListener("click", () => {
    document.getElementById("legend").classList.toggle("open");
  });
  // PDF report button
  document.getElementById("btn-pdf")?.addEventListener("click", generateReport);
  // Mobile drawer toggles
  const left = document.getElementById("left-rail");
  const right = document.getElementById("right-rail");
  const scrim = document.getElementById("scrim");
  const closeAll = () => { left.classList.remove("open"); right.classList.remove("open"); scrim.classList.remove("open"); };
  document.getElementById("mob-left")?.addEventListener("click", () => { closeAll(); left.classList.add("open"); scrim.classList.add("open"); });
  document.getElementById("mob-right")?.addEventListener("click", () => { closeAll(); right.classList.add("open"); scrim.classList.add("open"); });
  scrim.addEventListener("click", closeAll);

  document.getElementById("fs").addEventListener("click", () => {
    const el = document.querySelector(".center");
    if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.();
    setTimeout(() => map.invalidateSize(), 200);
  });
  updateLayerCount();
}

function updateLayerCount() {
  const n = Object.values(layerActive).filter(Boolean).length;
  document.getElementById("layer-count").textContent = n;
}

// === Lightning strikes (Blitzortung free WebSocket) ===
function startLightning() {
  if (boltWs) return;
  // Random server 1-3, public free real-time stroke feed
  const srv = Math.floor(Math.random()*3) + 1;
  try {
    boltWs = new WebSocket(`wss://ws${srv}.blitzortung.org/`);
    boltWs.onopen = () => { try { boltWs.send('{"a":111}'); } catch(e){} };
    boltWs.onmessage = (ev) => {
      try {
        const data = decodeBlitz(ev.data);
        if (!data || !data.lat || !data.lon) return;
        addBolt(data.lat, data.lon);
      } catch(e) {}
    };
    boltWs.onclose = () => { boltWs = null; setTimeout(startLightning, 5000); };
    boltWs.onerror = () => { try { boltWs.close(); } catch(e){} };
  } catch(e) { console.warn("lightning ws", e); }
}
// Blitzortung obfuscates JSON with simple LZW-like swap. Public decoder:
function decodeBlitz(b){
  const e={}; let d=b.split(""); let c=d[0]; let f=c; const g=[c]; let h=256, o=h;
  for(let n=1;n<d.length;n++){
    let a=d[n].charCodeAt(0);
    a=h>a?d[n]:e[a]?e[a]:f+c;
    g.push(a); c=a.charAt(0); e[o]=f+c; o++; f=a;
  }
  try { return JSON.parse(g.join("")); } catch { return null; }
}
function addBolt(lat, lon) {
  const m = L.circleMarker([lat, lon], { radius: 5, fillColor: "#fde047", color: "#fff7c2", weight: 1, fillOpacity: 0.95 });
  m._bornAt = Date.now();
  m.addTo(layers.lightning);
  boltCount++;
  document.getElementById("c-bolt").textContent = boltCount;
}
function startBoltDecay() {
  if (boltDecayTimer) return;
  boltDecayTimer = setInterval(() => {
    const cutoff = Date.now() - 10*60*1000; // keep last 10 minutes
    layers.lightning.eachLayer(l => { if (l._bornAt && l._bornAt < cutoff) layers.lightning.removeLayer(l); });
  }, 30000);
}

// === USGS Earthquakes ===
async function refreshQuakes() {
  try {
    const r = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson", { cache: "no-store" });
    const j = await r.json();
    layers.quakes.clearLayers();
    let n = 0;
    for (const f of j.features) {
      const [lon, lat, depth] = f.geometry.coordinates;
      const m = f.properties.mag || 0;
      const place = f.properties.place;
      const time = new Date(f.properties.time);
      const url = f.properties.url;
      const r = Math.max(4, m * 3);
      const color = m >= 6 ? "#ff8a8a" : m >= 5 ? "#fdba74" : m >= 4 ? "#fde68a" : "#fed7aa";
      const c = L.circleMarker([lat, lon], { radius: r, fillColor: color, color: "#fff", weight: 0.7, fillOpacity: 0.85 });
      c.bindPopup(`<b>M ${m.toFixed(1)} EARTHQUAKE</b><br>${escapeHtml(place)}<br><small>${time.toUTCString()}</small><br><small>Depth ${depth.toFixed(0)} km</small><br><a href="${url}" target="_blank">USGS details →</a>`);
      c.addTo(layers.quakes);
      n++;
    }
    document.getElementById("c-quakes").textContent = n;
  } catch (e) { console.warn("quakes", e); }
}

// === NASA EOSDIS GIBS active fire tile layer (24h, no key needed) ===
async function refreshFires() {
  // GIBS WMTS template; tiles update daily. Use yesterday's date for guaranteed availability.
  if (layers.fires._initialized) return;
  const d = new Date(Date.now() - 24*3600*1000);
  const ymd = d.toISOString().slice(0,10);
  const tile = L.tileLayer(
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Combined_Thermal_Anomalies_All/default/${ymd}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
    { attribution: "NASA GIBS · MODIS Thermal Anomalies", opacity: 0.9, maxNativeZoom: 9, tileSize: 256 }
  );
  layers.fires.addLayer(tile);
  layers.fires._initialized = true;
  document.getElementById("c-fires").textContent = "LIVE";
}

// === NOAA NHC active tropical storms ===
async function refreshStorms() {
  try {
    const r = await fetch("https://www.nhc.noaa.gov/CurrentStorms.json", { cache: "no-store" });
    const j = await r.json();
    layers.storms.clearLayers();
    const arr = j.activeStorms || [];
    for (const s of arr) {
      const lat = parseFloat(s.lat), lon = parseFloat(s.lon);
      if (isNaN(lat) || isNaN(lon)) continue;
      const wind = s.intensity || 0, name = s.name, basin = s.binNumber, cls = s.classification;
      const color = wind >= 96 ? "#ff8a8a" : wind >= 74 ? "#fdba74" : wind >= 39 ? "#fde68a" : "#93c5fd";
      const c = L.circleMarker([lat, lon], { radius: 14, fillColor: color, color: "#fff", weight: 1.2, fillOpacity: 0.65 });
      c.bindPopup(`<b>${cls} ${escapeHtml(name)}</b><br>Wind ${wind} kt<br>Pressure ${s.pressure || "?"} mb<br>Movement ${s.movement || "?"}<br><a href="https://www.nhc.noaa.gov/" target="_blank">NHC →</a>`);
      c.addTo(layers.storms);
    }
    document.getElementById("c-storms").textContent = arr.length;
  } catch (e) { console.warn("storms", e); document.getElementById("c-storms").textContent = "—"; }
}

// === N2YO Satellites: ISS + selectable categories ===
async function startISS() {
  if (issTimer) return;
  const update = async () => {
    try {
      const r = await fetch(`https://api.wheretheiss.at/v1/satellites/25544`);
      const j = await r.json();
      if (!issMarker) {
        issMarker = L.marker([j.latitude, j.longitude], { icon: L.divIcon({ html: `<div style="font-size:18px;filter:drop-shadow(0 0 4px #a78bfa);">🛰️</div>`, className: "", iconSize: [24,24] }) });
        issMarker.addTo(layers.iss);
      } else issMarker.setLatLng([j.latitude, j.longitude]);
      issMarker.bindPopup(`<b>ISS · ZARYA</b><br>Alt ${j.altitude.toFixed(1)} km<br>Vel ${j.velocity.toFixed(0)} km/h<br>Lat ${j.latitude.toFixed(2)}, Lon ${j.longitude.toFixed(2)}`);
      document.getElementById("c-iss").textContent = `${j.latitude.toFixed(1)}, ${j.longitude.toFixed(1)}`;
    } catch (e) { /* silent */ }
  };
  update();
  issTimer = setInterval(update, 10000);
}
function stopISS() {
  if (issTimer) { clearInterval(issTimer); issTimer = null; }
  if (issMarker) { layers.iss.removeLayer(issMarker); issMarker = null; }
  document.getElementById("c-iss").textContent = "—";
}

async function loadSatellites() {
  if (!CFG.N2YO_KEY) return;
  // N2YO "above" endpoint: satellites above lat/lon. Use map center.
  try {
    const c = map.getCenter();
    layers.sats.clearLayers();
    // Category 18 = Geostationary, 52 = Starlink. Pull two categories around center w/ 70deg search radius.
    const cats = [{ id: 52, color: "#a78bfa", name: "Starlink" }, { id: 3, color: "#22d3ee", name: "Brightest" }];
    let total = 0;
    for (const cat of cats) {
      const url = `https://api.n2yo.com/rest/v1/satellite/above/${c.lat.toFixed(2)}/${c.lng.toFixed(2)}/0/70/${cat.id}/&apiKey=${CFG.N2YO_KEY}`;
      // CORS: N2YO usually allows; if blocked, route via corsproxy
      const r = await fetch(url).catch(() => fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`));
      if (!r.ok) continue;
      const j = await r.json();
      for (const s of (j.above || []).slice(0, 200)) {
        const m = L.circleMarker([s.satlat, s.satlng], { radius: 2, fillColor: cat.color, color: cat.color, weight: 0, fillOpacity: 0.8 });
        m.bindPopup(`<b>${escapeHtml(s.satname)}</b><br>NORAD ${s.satid}<br>Alt ${s.satalt.toFixed(0)} km<br><small>${cat.name}</small>`);
        m.addTo(layers.sats);
        total++;
      }
    }
    document.getElementById("c-sats").textContent = total;
  } catch (e) { console.warn("sats", e); document.getElementById("c-sats").textContent = "—"; }
}

// === News (RSS via rss2json + NewsAPI for boost) ===
function rssJsonUrl(url) { return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`; }

async function fetchFeed(feed) {
  try {
    const r = await fetch(rssJsonUrl(feed.url), { cache: "no-store" });
    if (!r.ok) throw new Error();
    const j = await r.json();
    if (j.status !== "ok" || !Array.isArray(j.items)) throw new Error();
    return j.items.map(it => normalizeItem(it, feed));
  } catch { return []; }
}
async function fetchNewsAPI() {
  if (!CFG.NEWSAPI_KEY) return [];
  try {
    const url = `https://newsapi.org/v2/top-headlines?category=general&pageSize=50&apiKey=${CFG.NEWSAPI_KEY}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.articles || []).map(a => enrich({
      title: a.title || "", desc: a.description || "", link: a.url, ts: Date.parse(a.publishedAt) || Date.now(),
      src: (a.source && a.source.name) || "NewsAPI", baseCat: "conflict",
    }));
  } catch { return []; }
}
function normalizeItem(it, feed) {
  const title = (it.title || "").trim();
  const desc = stripHtml((it.description || it.content || "").toString()).slice(0, 280);
  const ts = Date.parse(it.pubDate || it.published || "") || Date.now();
  return enrich({ title, desc, link: it.link || it.guid, ts, src: feed.src, baseCat: feed.cat });
}
function stripHtml(s) { const d = document.createElement("div"); d.innerHTML = s; return (d.textContent || "").trim(); }
function enrich(item) {
  const blob = (item.title + " " + item.desc).toLowerCase();
  let bestCat = item.baseCat, bestScore = 0;
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    let s = 0;
    for (const k of kws) if (blob.includes(k)) s++;
    if (s > bestScore) { bestScore = s; bestCat = cat; }
  }
  item.cat = bestCat;
  let sev = 1;
  for (const [lvl, kws] of Object.entries(SEVERE)) if (kws.some(k => blob.includes(k))) sev = Math.max(sev, parseInt(lvl, 10));
  item.sev = sev;
  const reg = REGIONS.find(r => blob.includes(r.name.toLowerCase()));
  item.region = reg ? reg.name : null;
  item.lat = reg ? reg.lat : null;
  item.lon = reg ? reg.lon : null;
  return item;
}

async function refreshNews() {
  document.getElementById("feed-meta").textContent = "FETCHING…";
  const all = await Promise.all([...FEEDS.map(fetchFeed), fetchNewsAPI()]);
  const flat = all.flat();
  const seen = new Set();
  RAW = flat.filter(it => {
    const k = (it.link || it.title || "").trim();
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  }).sort((a,b) => b.ts - a.ts);
  render();
}

function render() {
  const cutoff = Date.now() - activeHours * 3600 * 1000;
  const visible = RAW.filter(it => {
    if (it.ts < cutoff) return false;
    if (activeCat !== "all" && it.cat !== activeCat) return false;
    if (it.sev < minSev) return false;
    if (q && !((it.title + " " + it.desc).toLowerCase().includes(q))) return false;
    return true;
  });
  // counts
  const inTime = RAW.filter(it => it.ts >= cutoff);
  const counts = { all: inTime.length };
  for (const c of Object.keys(KEYWORDS)) counts[c] = inTime.filter(it => it.cat === c).length;
  document.querySelectorAll('[data-cnt]').forEach(el => el.textContent = counts[el.dataset.cnt] ?? 0);

  // KPIs
  const conflict = inTime.filter(it => it.cat === "conflict").length;
  const sev4plus = inTime.filter(it => it.sev >= 4).length;
  const hots = bucket(inTime.filter(it=>it.region), "region");
  const top = Object.entries(hots).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById("kpis").innerHTML = `
    <div class="kpi"><div class="lbl">SIGNALS / ${activeHours}H</div><div class="val">${inTime.length}</div><div class="delta">${new Set(inTime.map(i=>i.src)).size} sources</div></div>
    <div class="kpi"><div class="lbl">CONFLICT</div><div class="val" style="color:var(--bad)">${conflict}</div><div class="delta">${pct(conflict, inTime.length)} of feed</div></div>
    <div class="kpi"><div class="lbl">CRITICAL S4+</div><div class="val" style="color:var(--acc)">${sev4plus}</div><div class="delta">high severity</div></div>
    <div class="kpi"><div class="lbl">TOP HOTSPOT</div><div class="val" style="font-size:14px">${top ? escapeHtml(top[0]) : "—"}</div><div class="delta">${top ? top[1] + " mentions" : "tracking"}</div></div>
  `;

  // Hotspots side panel
  const hotEntries = Object.entries(hots).sort((a,b)=>b[1]-a[1]).slice(0, 14);
  document.getElementById("hotspots").innerHTML = hotEntries.length
    ? hotEntries.map(([name, n]) => `<div class="hot" data-name="${escapeAttr(name)}"><span class="name">${escapeHtml(name)}</span><span class="n">${n}</span></div>`).join("")
    : `<div class="empty">NO HOTSPOTS</div>`;
  document.querySelectorAll(".hot").forEach(el => {
    el.addEventListener("click", () => {
      const name = el.dataset.name;
      const r = REGIONS.find(x => x.name === name);
      if (r) map.flyTo([r.lat, r.lon], 5, { duration: 1.0 });
      document.getElementById("q").value = name;
      q = name.toLowerCase(); render();
    });
  });

  // News pins on map
  layers.news.clearLayers();
  let pins = 0;
  // jitter map to avoid stacking exactly
  for (const it of visible.filter(x => x.lat != null)) {
    const lat = it.lat + (Math.random()-0.5) * 1.2;
    const lon = it.lon + (Math.random()-0.5) * 1.2;
    const color = it.sev >= 4 ? "#ff8a8a" : it.sev >= 3 ? "#fdba74" : "#fcd34d";
    const m = L.circleMarker([lat, lon], { radius: 5 + it.sev, fillColor: color, color: "#fff", weight: 0.7, fillOpacity: 0.95 });
    m.bindPopup(`<b>${it.cat.toUpperCase()} · S${it.sev}</b><br><a href="${escapeAttr(it.link)}" target="_blank">${escapeHtml(it.title)}</a><br><small>${escapeHtml(it.src)} · ${escapeHtml(it.region)}</small>`);
    m.addTo(layers.news);
    pins++;
  }
  document.getElementById("c-news").textContent = pins;

  // Feed list
  const feedEl = document.getElementById("feed");
  document.getElementById("feed-meta").textContent = `${visible.length} · ${new Date().toLocaleTimeString("en-US",{hour12:false})}`;
  feedEl.innerHTML = visible.length === 0
    ? `<div class="empty">NO SIGNALS — RELAX FILTERS</div>`
    : visible.slice(0, 250).map(renderItem).join("");
  feedEl.querySelectorAll('.item').forEach((el, i) => {
    el.addEventListener("click", (ev) => {
      if (ev.target.tagName === "A") return;
      const it = visible[i];
      if (it.lat != null) map.flyTo([it.lat, it.lon], 5, { duration: 1.0 });
    });
  });
}

function renderItem(it) {
  const when = relTime(it.ts);
  const sevBars = `<span class="sev-bar">` + Array(5).fill(0).map((_,i)=>`<i class="${i<it.sev?'on':''}"></i>`).join("") + `</span>`;
  return `
    <div class="item">
      <div class="top">
        <span class="tag cat-${it.cat}">${it.cat.toUpperCase()}</span>
        <span class="when">${when}</span>
      </div>
      <div class="ttl"><a href="${escapeAttr(it.link)}" target="_blank" rel="noopener">${escapeHtml(it.title)}</a></div>
      ${it.desc ? `<div class="desc">${escapeHtml(it.desc)}</div>` : ""}
      <div class="meta">
        <span class="src">${escapeHtml(it.src)}</span>
        ${it.region ? `<span>· ${escapeHtml(it.region)}</span>` : ""}
        <span style="margin-left:auto">${sevBars}</span>
      </div>
    </div>`;
}

function bucket(arr, key) { return arr.reduce((a, it) => (a[it[key]] = (a[it[key]] || 0) + 1, a), {}); }
function pct(a, b) { if (!b) return "0%"; return ((a/b)*100).toFixed(0) + "%"; }
function relTime(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return Math.floor(d) + "s";
  if (d < 3600) return Math.floor(d/60) + "m";
  if (d < 86400) return Math.floor(d/3600) + "h";
  return Math.floor(d/86400) + "d";
}
function escapeHtml(s) { return (s||"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/'/g, "&#39;"); }


// === PDF Report Generation ===
async function generateReport() {
  const btn = document.getElementById("btn-pdf");
  const orig = btn.textContent;
  btn.textContent = "GENERATING…";
  btn.disabled = true;
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 36;
    const now = new Date();
    const stamp = now.toUTCString();

    // Header
    doc.setFillColor(11, 16, 24); doc.rect(0, 0, W, 60, "F");
    doc.setTextColor(255, 217, 168); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text("WORLDWATCH OPS", M, 32);
    doc.setFontSize(9); doc.setTextColor(180, 190, 210);
    doc.text("GLOBAL COMMAND CENTER \u00b7 SITUATION REPORT", M, 48);
    doc.setFontSize(8); doc.setTextColor(255, 217, 168);
    doc.text(stamp, W - M, 32, { align: "right" });
    doc.setTextColor(140, 150, 170);
    doc.text("UNCLASSIFIED \u00b7 OPEN-SOURCE", W - M, 48, { align: "right" });

    let y = 90;

    // Active layers + filters summary
    const activeLayers = Object.entries(layerActive).filter(([,v])=>v).map(([k])=>k.toUpperCase()).join(", ");
    doc.setTextColor(40, 50, 70); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("ACTIVE LAYERS", M, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 70, 90);
    doc.text(doc.splitTextToSize(activeLayers, W - 2*M), M, y); y += 22;

    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(40, 50, 70);
    doc.text("FILTERS", M, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 70, 90);
    doc.text(`Window: ${activeHours}H \u2022 Category: ${activeCat.toUpperCase()} \u2022 Min severity: S${minSev} \u2022 Search: "${q || "\u2014"}"`, M, y);
    y += 22;

    // KPIs
    const cutoff = Date.now() - activeHours * 3600 * 1000;
    const inTime = RAW.filter(it => it.ts >= cutoff);
    const conflict = inTime.filter(it => it.cat === "conflict").length;
    const sev4 = inTime.filter(it => it.sev >= 4).length;
    const hots = bucket(inTime.filter(it=>it.region), "region");
    const top = Object.entries(hots).sort((a,b)=>b[1]-a[1])[0];

    const kpis = [
      ["Signals", String(inTime.length)],
      ["Conflict", String(conflict)],
      ["Critical S4+", String(sev4)],
      ["Top Hotspot", top ? `${top[0]} (${top[1]})` : "\u2014"],
    ];
    const kpiW = (W - 2*M - 18) / 4;
    kpis.forEach(([lbl,val], i) => {
      const x = M + i * (kpiW + 6);
      doc.setFillColor(245, 245, 250); doc.roundedRect(x, y, kpiW, 50, 4, 4, "F");
      doc.setFontSize(8); doc.setTextColor(120,130,150); doc.setFont("helvetica","normal");
      doc.text(lbl.toUpperCase(), x + 8, y + 14);
      doc.setFontSize(13); doc.setTextColor(40,50,70); doc.setFont("helvetica","bold");
      doc.text(val, x + 8, y + 36);
    });
    y += 70;

    // Map snapshot (canvas of leaflet using html2canvas-lite via dom-to-image is heavy; use map screenshot via leaflet's getCanvas not available without plugin)
    // Strategy: use Leaflet's natural HTML and html-to-image fallback — but to keep static & simple, render an outline image with Stadia/OSM static map fallback.
    // Use a lightweight static map via OSM staticmap services (none free for commercial). Skip the live snapshot; instead include hotspot/feed list.

    // Hotspots table
    doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(40,50,70);
    doc.text("HOTSPOTS", M, y); y += 14;
    doc.setLineWidth(0.5); doc.setDrawColor(220, 225, 235); doc.line(M, y, W-M, y); y += 4;
    const hotEntries = Object.entries(hots).sort((a,b)=>b[1]-a[1]).slice(0, 10);
    doc.setFont("helvetica","normal"); doc.setFontSize(10);
    if (!hotEntries.length) { doc.setTextColor(150,160,180); doc.text("No regional hotspots in window.", M, y+12); y += 24; }
    hotEntries.forEach(([name, n]) => {
      y += 14;
      doc.setTextColor(40,50,70); doc.text(name, M+4, y);
      doc.setTextColor(180, 130, 60); doc.text(String(n) + " mentions", W - M - 4, y, { align: "right" });
    });
    y += 16;

    // Feed (filtered to current view)
    const visible = RAW.filter(it => {
      if (it.ts < cutoff) return false;
      if (activeCat !== "all" && it.cat !== activeCat) return false;
      if (it.sev < minSev) return false;
      if (q && !((it.title + " " + it.desc).toLowerCase().includes(q))) return false;
      return true;
    }).slice(0, 60);

    doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(40,50,70);
    if (y > H - 100) { doc.addPage(); y = M; }
    doc.text(`SITUATIONAL FEED (${visible.length})`, M, y); y += 14;
    doc.setLineWidth(0.5); doc.setDrawColor(220,225,235); doc.line(M, y, W-M, y); y += 8;

    doc.setFontSize(9);
    visible.forEach(it => {
      const ttl = it.title;
      const meta = `${it.cat.toUpperCase()} \u2022 S${it.sev} \u2022 ${it.src}${it.region ? " \u2022 " + it.region : ""} \u2022 ${relTime(it.ts)} ago`;
      const ttlLines = doc.splitTextToSize(ttl, W - 2*M);
      const blockH = 14 * ttlLines.length + 16;
      if (y + blockH > H - M) { doc.addPage(); y = M; }
      doc.setFont("helvetica","bold"); doc.setTextColor(40,50,70);
      doc.text(ttlLines, M, y); y += 12 * ttlLines.length;
      doc.setFont("helvetica","normal"); doc.setTextColor(140,150,170); doc.setFontSize(8);
      doc.text(meta, M, y); y += 6;
      doc.setDrawColor(235,238,243); doc.line(M, y, W-M, y); y += 10;
      doc.setFontSize(9);
    });

    // Footer on every page
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setTextColor(150,160,180);
      doc.text(`Worldwatch OPS \u2022 ${stamp} \u2022 Page ${i} of ${pages}`, W/2, H - 14, { align: "center" });
    }

    const fname = `worldwatch-ops_${now.toISOString().slice(0,16).replace(/[:T]/g,"-")}.pdf`;
    doc.save(fname);
  } catch (e) {
    console.error("report", e);
    alert("Report generation failed: " + e.message);
  } finally {
    btn.textContent = orig;
    btn.disabled = false;
  }
}
