# Earthlike Map Explorer

An experimental web app that mimics core Google Maps / Google Earth behaviors with open data. It uses React, Vite, and MapLibre GL to deliver a responsive globe, live search via OpenStreetMap's Nominatim API, routing powered by OSRM, user location, and a simple 3D tilt mode.

## Features

- 🌍 MapLibre GL basemap with quick style switching
- 🔍 Type-ahead place search backed by the Nominatim API (OpenStreetMap)
- 📍 Markers for selected places, user position, and waypoints
- 🧭 Route planning powered by OSRM with distance and travel time estimates
- 🛰️ **Earth globe mode** with NASA Blue Marble satellite imagery that fades to vector maps as you zoom in, plus atmospheric fog, sky, and 3D terrain
- 🧭 Map controls for navigation, geolocation, and base layer selection
- 🧭 Map controls for navigation, geolocation, and base layer selection
- 🧭 Map controls for navigation, geolocation, and base layer selection

## Getting started

1. Install dependencies (requires Node 18+):
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the printed URL (defaults to `http://localhost:5173`).

## Environment details

This project uses public, no-key endpoints. Heavy traffic may trigger rate limits—if that happens, swap in your own endpoints in `src/lib/nominatim.ts` and `src/lib/osrm.ts`.

## Next ideas

- Drop in CesiumJS or deck.gl for richer 3D layers
- Persist favorite places and custom overlays via a backend
- Add offline tiles or caching to improve resilience
- Integrate elevation profiles and multiple routing modes
