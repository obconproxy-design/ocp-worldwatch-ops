# Worldwatch OPS

Live geopolitical operations dashboard. Aggregates open-source RSS feeds (Reuters, BBC, AP, Al Jazeera, OilPrice, gCaptain, Maritime Executive, USGS earthquakes, BleepingComputer, War on the Rocks, etc.) and re-buckets each item by topic (conflict, maritime, aviation, energy, defense, cyber, disaster, diplomacy) with severity scoring and live hotspot tracking.

100% static — `index.html`, `styles.css`, `app.js`. Open in any browser or deploy to any static host (Cloudflare Pages, GitHub Pages, Netlify, Vercel).

## Run locally
```
python3 -m http.server 8088
# open http://localhost:8088
```

## Deploy
- **GitHub Pages:** Settings -> Pages -> Branch `main` -> root.
- **Cloudflare Pages / Netlify:** Connect this repo, no build command, output dir = `/`.

## Live URL
See repo description.
