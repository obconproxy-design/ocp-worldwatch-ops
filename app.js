// Worldwatch OPS — standalone client. Aggregates open-source RSS feeds via a public CORS-friendly proxy.
// No API keys required. Categorization is keyword-based, severity is heuristic.

const FEEDS = [
  // Conflict / world
  { src: "Reuters World", cat: "conflict", url: "https://feeds.reuters.com/Reuters/worldNews" },
  { src: "BBC World", cat: "conflict", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { src: "AP Top", cat: "conflict", url: "https://feeds.apnews.com/rss/apf-topnews" },
  { src: "Al Jazeera", cat: "conflict", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { src: "AP World", cat: "conflict", url: "https://feeds.apnews.com/rss/apf-intlnews" },
  // Defense
  { src: "Defense News", cat: "defense", url: "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml" },
  { src: "War on the Rocks", cat: "defense", url: "https://warontherocks.com/feed/" },
  // Maritime
  { src: "gCaptain", cat: "maritime", url: "https://gcaptain.com/feed/" },
  { src: "Maritime Executive", cat: "maritime", url: "https://www.maritime-executive.com/articles.rss" },
  // Aviation
  { src: "AVweb", cat: "aviation", url: "https://www.avweb.com/feed/" },
  { src: "Aviation Week", cat: "aviation", url: "https://aviationweek.com/awn/rss.xml" },
  // Energy
  { src: "OilPrice", cat: "energy", url: "https://oilprice.com/rss/main" },
  { src: "Reuters Energy", cat: "energy", url: "https://feeds.reuters.com/reuters/businessNews" },
  // Cyber / AI
  { src: "BleepingComputer", cat: "cyber", url: "https://www.bleepingcomputer.com/feed/" },
  { src: "The Hacker News", cat: "cyber", url: "https://feeds.feedburner.com/TheHackersNews" },
  // Disaster
  { src: "USGS Quakes M4.5+", cat: "disaster", url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.atom" },
  { src: "ReliefWeb", cat: "disaster", url: "https://reliefweb.int/disasters/rss.xml" },
];

// Category keyword reclassifiers — re-bucket items by content rather than feed
const KEYWORDS = {
  conflict: ["war", "strike", "attack", "missile", "drone", "killed", "casualt", "front line", "offensive", "shelling", "hostag", "ceasefire", "iran", "ukraine", "gaza", "israel", "russia", "houthi"],
  maritime: ["vessel", "tanker", "shipping", "strait", "port", "navy", "naval", "submarine", "red sea", "panama canal", "hormuz", "suez", "freighter", "container ship"],
  aviation: ["airline", "aircraft", "boeing", "airbus", "flight", "aviation", "airport", "airspace", "drone", "f-35", "f-16"],
  energy: ["oil", "gas", "lng", "opec", "refinery", "pipeline", "crude", "brent", "wti", "energy", "power grid", "electric", "uranium", "nuclear plant"],
  defense: ["pentagon", "nato", "defense", "military", "army", "marines", "navy", "weapons", "arms"],
  cyber: ["cyber", "ransomware", "hack", "breach", "malware", "ai ", "artificial intelligence", "openai", "nvidia", "chatgpt", "lockbit"],
  disaster: ["earthquake", "tsunami", "hurricane", "typhoon", "flood", "wildfire", "volcano", "magnitude", "evacuat"],
  diplomacy: ["summit", "treaty", "talks", "diplomat", "ambassador", "sanction", "agreement", "g7", "g20", "u.n.", "united nations", "putin", "xi", "biden", "trump", "macron"],
};

const SEVERE = {
  5: ["nuclear", "killed dozens", "killed hundreds", "mass casual", "tsunami", "magnitude 7", "magnitude 8"],
  4: ["killed", "missile", "strike", "drone attack", "hostage", "evacuat", "magnitude 6", "ransomware"],
  3: ["clash", "fired", "blockade", "sanction", "outage", "magnitude 5", "breach", "hack"],
  2: ["protest", "warns", "deploys", "tension", "summit"],
  1: [],
};

// Public CORS-friendly RSS->JSON proxy (free, no key). Fallback strategies handle outages.
function rssJsonUrl(url) {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
}
function rssAlt1(url) {
  // alternate proxy
  return `https://corsproxy.io/?${encodeURIComponent(url)}`;
}

async function fetchFeed(feed) {
  try {
    const r = await fetch(rssJsonUrl(feed.url), { cache: "no-store" });
    if (!r.ok) throw new Error("rss2json " + r.status);
    const j = await r.json();
    if (j.status !== "ok" || !Array.isArray(j.items)) throw new Error("bad payload");
    return j.items.map((it) => normalizeItem(it, feed));
  } catch (e1) {
    try {
      const r2 = await fetch(rssAlt1(feed.url));
      if (!r2.ok) throw e1;
      const xml = await r2.text();
      return parseXml(xml, feed);
    } catch (e2) {
      console.warn("feed fail", feed.src, e2);
      return [];
    }
  }
}
function normalizeItem(it, feed) {
  const title = (it.title || "").trim();
  const desc = stripHtml((it.description || it.content || "").toString()).slice(0, 240);
  const ts = parseTime(it.pubDate || it.published || it.updated);
  return enrich({ title, desc, link: it.link || it.guid, ts, src: feed.src, baseCat: feed.cat });
}
function parseXml(xml, feed) {
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const items = Array.from(doc.querySelectorAll("item, entry"));
    return items.map((n) => {
      const title = text(n, "title");
      const link = (n.querySelector("link[href]")?.getAttribute("href")) || text(n, "link");
      const desc = stripHtml(text(n, "description") || text(n, "summary") || text(n, "content"));
      const ts = parseTime(text(n, "pubDate") || text(n, "published") || text(n, "updated"));
      return enrich({ title, desc, link, ts, src: feed.src, baseCat: feed.cat });
    }).filter(x => x.title);
  } catch { return []; }
}
function text(node, sel) { const e = node.querySelector(sel); return e ? e.textContent.trim() : ""; }
function stripHtml(s) { const d = document.createElement("div"); d.innerHTML = s; return (d.textContent || "").trim(); }
function parseTime(s) { const t = Date.parse(s || ""); return isNaN(t) ? Date.now() : t; }

function enrich(item) {
  const blob = (item.title + " " + item.desc).toLowerCase();
  // re-categorize
  let bestCat = item.baseCat, bestScore = 0;
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    let s = 0;
    for (const k of kws) if (blob.includes(k)) s++;
    if (s > bestScore) { bestScore = s; bestCat = cat; }
  }
  item.cat = bestCat;
  // severity
  let sev = 1;
  for (const [lvl, kws] of Object.entries(SEVERE)) {
    if (kws.some(k => blob.includes(k))) sev = Math.max(sev, parseInt(lvl, 10));
  }
  item.sev = sev;
  // hotspot — try to identify a region
  const REGIONS = ["Ukraine","Russia","Gaza","Israel","Iran","Lebanon","Syria","Yemen","Red Sea","Strait of Hormuz","Taiwan","South China Sea","North Korea","Venezuela","Sudan","Niger","Sahel","Mexico","Haiti","Pakistan","Afghanistan","Kashmir","Beijing","Moscow","Washington","Brussels","Tokyo","Seoul","Pyongyang","Tehran","Baghdad","Damascus"];
  item.region = REGIONS.find(r => blob.includes(r.toLowerCase())) || null;
  return item;
}

// State
let RAW = [];
let activeCat = "all";
let activeHours = 24;
let minSev = 0;
let q = "";

// Bootstrap
init();

async function init() {
  startClock();
  bindUI();
  await refresh();
  // auto-refresh every 5 min
  setInterval(refresh, 5 * 60 * 1000);
}

function startClock() {
  const tick = () => {
    const d = new Date();
    document.getElementById("clock").textContent = d.toLocaleTimeString("en-US", { hour12: false }) + " " + Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop();
    document.getElementById("date").textContent = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
    document.getElementById("hdr-date").textContent = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
  };
  tick(); setInterval(tick, 1000);
}

function bindUI() {
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
  const sev = document.getElementById("sev");
  sev.addEventListener("input", () => { minSev = parseInt(sev.value, 10); document.getElementById("sev-val").textContent = minSev; render(); });
  document.getElementById("q").addEventListener("input", (e) => { q = e.target.value.toLowerCase(); render(); });
  document.getElementById("refresh").addEventListener("click", refresh);
}

async function refresh() {
  document.getElementById("feed-meta").textContent = "FETCHING…";
  const all = await Promise.all(FEEDS.map(fetchFeed));
  const flat = all.flat();
  // dedupe by link/title
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

  // counts per category (within time window)
  const inTime = RAW.filter(it => it.ts >= cutoff);
  const counts = { all: inTime.length };
  for (const c of Object.keys(KEYWORDS)) counts[c] = inTime.filter(it => it.cat === c).length;
  document.querySelectorAll(".ct").forEach(el => { el.textContent = counts[el.dataset.cnt] ?? 0; });

  // KPIs
  const conflict = inTime.filter(it => it.cat === "conflict").length;
  const sev4plus = inTime.filter(it => it.sev >= 4).length;
  const hotspots = bucket(inTime, "region");
  const topRegion = Object.entries(hotspots).filter(([k]) => k && k !== "null").sort((a,b)=>b[1]-a[1])[0];
  const sources = new Set(inTime.map(it => it.src));
  document.getElementById("kpis").innerHTML = `
    <div class="kpi"><div class="lbl">SIGNALS / ${activeHours}H</div><div class="val">${inTime.length}</div><div class="delta">across ${sources.size} sources</div></div>
    <div class="kpi"><div class="lbl">CONFLICT</div><div class="val" style="color:var(--bad)">${conflict}</div><div class="delta">${pct(conflict, inTime.length)} of feed</div></div>
    <div class="kpi"><div class="lbl">CRITICAL (S4+)</div><div class="val" style="color:var(--acc)">${sev4plus}</div><div class="delta">high-severity items</div></div>
    <div class="kpi"><div class="lbl">TOP HOTSPOT</div><div class="val" style="font-size:18px">${topRegion ? topRegion[0] : "—"}</div><div class="delta">${topRegion ? topRegion[1] + " mentions" : "tracking…"}</div></div>
  `;

  // Hotspots
  const hot = Object.entries(hotspots).filter(([k]) => k && k !== "null").sort((a,b) => b[1]-a[1]).slice(0, 12);
  document.getElementById("hotspots").innerHTML = hot.length
    ? hot.map(([name, n]) => `<div class="hot"><span class="name">${name}</span><span class="n">${n}</span></div>`).join("")
    : `<div class="empty">NO HOTSPOTS IN WINDOW</div>`;

  // Sources
  document.getElementById("sources").innerHTML =
    [...sources].sort().map(s => `<span class
="src-pill">${s}</span>`).join("");

  // Feed
  const feedEl = document.getElementById("feed");
  document.getElementById("feed-meta").textContent =
    `${visible.length} ITEMS · UPDATED ${new Date().toLocaleTimeString("en-US",{hour12:false})}`;
  if (visible.length === 0) {
    feedEl.innerHTML = `<div class="empty">NO SIGNALS MATCH FILTERS — TRY EXPANDING TIME RANGE OR LOWERING SEVERITY</div>`;
    return;
  }
  feedEl.innerHTML = visible.slice(0, 200).map(renderItem).join("");
}

function renderItem(it) {
  const when = relTime(it.ts);
  const sevBars = `<div class="sev-bar s${it.sev}">` + Array(5).fill(0).map((_,i)=>`<i class="${i<it.sev?'on':''}"></i>`).join("") + `</div>`;
  return `
    <div class="item">
      <div class="when">${when}</div>
      <div class="body">
        <div class="ttl"><a href="${escapeAttr(it.link)}" target="_blank" rel="noopener">${escapeHtml(it.title)}</a></div>
        ${it.desc ? `<div class="desc">${escapeHtml(it.desc)}</div>` : ""}
        <div class="meta">
          <span class="src">${escapeHtml(it.src)}</span>
          ${it.region ? `<span>· ${escapeHtml(it.region)}</span>` : ""}
        </div>
      </div>
      <div class="right">
        <span class="tag cat-${it.cat}">${it.cat.toUpperCase()}</span>
        ${sevBars}
      </div>
    </div>
  `;
}

function bucket(arr, key) {
  return arr.reduce((acc, it) => { acc[it[key]] = (acc[it[key]] || 0) + 1; return acc; }, {});
}
function pct(a, b) { if (!b) return "0%"; return ((a/b)*100).toFixed(0) + "%"; }
function relTime(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return Math.floor(d) + "s ago";
  if (d < 3600) return Math.floor(d/60) + "m ago";
  if (d < 86400) return Math.floor(d/3600) + "h ago";
  return Math.floor(d/86400) + "d ago";
}
function escapeHtml(s) { return (s||"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/'/g, "&#39;"); }
