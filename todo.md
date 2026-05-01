# Worldwatch OPS — Upgrade TODO

- [ ] Add Leaflet (CDN) with dark map tiles (CartoDB Dark Matter)
- [ ] Layer toggles: Earthquakes, Fires, Storms/Weather, Satellites, News, Hotspots
- [ ] USGS earthquakes layer (M2.5+ 24h, color/size by magnitude, popup details)
- [ ] NASA FIRMS active fires (VIIRS 24h CSV, key=cf89e...)
- [ ] OpenWeatherMap overlay tiles: clouds, precipitation, wind, temperature
- [ ] NOAA storm centers (active hurricanes/tropical storms via NHC RSS+geojson)
- [ ] N2YO live satellites (ISS + selectable categories) via key 6WXZN5-...
- [ ] News pins on map for items with detected region (clickable -> filter feed)
- [ ] Hotspot heat circles
- [ ] Layer legend + counters
- [ ] Fullscreen map mode
- [ ] Click region on map -> filter feed by hotspot/keyword
- [ ] Stat overlay panel (signals, conflict, criticals, top hotspot)
- [ ] Mobile responsive layout
- [ ] Push update to GitHub repo

## Round 2 polish
- [ ] Brighter pastel layer icons + dot colors
- [ ] Darker map base + brighter pastel labels
- [ ] Stronger weather overlays (clouds + precip default ON)
- [ ] Add lightning strike layer (Blitzortung WS)
- [ ] NASA true-color VIIRS basemap toggle, default ON
- [ ] Mobile-friendly Chrome (collapsible rails, big touch targets, responsive grid)
- [ ] Push to GitHub

## Round 3 — UI overhaul + PDF + security
- [ ] Reorganize layers into collapsible groups (BASEMAP / EARTH / WEATHER / SPACE / INTEL)
- [ ] Cleaner pastel palette, calmer contrast, larger touch targets
- [ ] Mobile-first: drawer rails, single-tap toggles, no overflow, sticky header
- [ ] Verify every button (refresh, reset, fullscreen, drawers, toggles, category, range, slider, search, hotspot, feed, pins)
- [ ] Add "GENERATE REPORT" button -> branded PDF with map snapshot + counts + filtered feed
- [ ] Security: CSP meta, SRI on Leaflet/cluster, referrer policy, x-content-type-options
