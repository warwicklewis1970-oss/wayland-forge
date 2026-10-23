# Wayland Forge

Wayland Forge sets text around a badge ring (circle, ellipse, polygon, star or heart) as real glyph outlines and exports print-ready files. It's a static app that installs as a PWA and works offline.

## Run / share
- Locally: `python3 -m http.server 8080` in this folder, then open http://localhost:8080. Service workers need http(s), so opening the file directly with file:// won't work.
- Hosting: upload this folder unchanged to any static host (GitHub Pages, Netlify drop, Cloudflare Pages). Every path is relative, so it also works from a sub-path. The **Install app** button shows up once the browser allows installing.

## Exports
- SVG: text converted to outlines, sized in mm/in.
- PDF: vector, page = size + bleed on every side.
- PNG: size × DPI, or the Printify 4500×4500 px preset.

## Licences
- Fonts: SIL OFL 1.1 (see `fonts/*-OFL.txt`).
- opentype.js, jsPDF and svg2pdf.js: MIT (see `vendor/`).

## Letter selection & centre image styles (v6)
- Click a letter to select; Shift/Ctrl/⌘-click (or the Multi-select toggle) adds/removes letters across layers; drag a box on empty space; Esc clears; Ctrl/⌘+A or "Select all in layer". Space- or middle-drag pans (or switch the toolbar Box/Pan toggle).
- Centre image style: Original (optional corner-colour background removal), Silhouette (threshold, light/dark background, smoothing, invert, fill colour) or Vector trace (imagetracerjs, public domain) which exports as real paths in SVG/PDF.

## Install
Open **https://warwicklewis1970-oss.github.io/wayland-forge/** in Chrome, Edge or Safari.
- **Desktop (Chrome/Edge):** click the **⊕ Install** button in the toolbar, or the install icon at the right of the address bar.
- **Android (Chrome):** menu ⋮ → **Install app** / **Add to Home screen**.
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**.
Once opened, it works offline. Your designs autosave in the browser. To keep a copy, use **Project → Save**.
