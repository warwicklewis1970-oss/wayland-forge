# Wayland Forge

Wayland Forge sets text around a badge ring (circle, ellipse, polygon, star or heart) as real glyph outlines and exports print-ready files. It's a static app that installs as a PWA and works offline.

## Run / share
- Locally: `python3 -m http.server 8080` in this folder, then open http://localhost:8080. Service workers need http(s), so opening the file directly with file:// won't work.
- Hosting: upload this folder unchanged to any static host (GitHub Pages, Netlify drop, Cloudflare Pages). Every path is relative, so it also works from a sub-path. The **Install app** button shows up once the browser allows installing.

## Exports
- SVG: text converted to outlines, sized in mm/in.
- PDF: vector, page = size + bleed on every side.
- PNG: size × DPI, or the Printify 4500×4500 px preset.

## Send to Waylands Path (v52)
- **✏️ Send to Waylands Path** (in the Laser section and under Export) opens the design in Waylands Path (same website) as a new project for line editing.
- It sends the artwork as an SVG in true mm (page = Laser W × H; letters are already glyph outlines). Each part follows its Laser job: Etch parts become etch lines (shape rings as one centre line with their width), Cut inside / Cut outside parts become cut lines, Skip parts are left out. Photos stay in Forge; traced or silhouette pictures go across as outlines.
- The hand-over uses the shared `wayland-share` IndexedDB on this site. Forge's laser files are unchanged (byte-compared before and after).

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

## Laser pack (LaserGRBL)
Open **Laser (LaserGRBL)**, give each part a job (Image, Etch, Cut inside edge, Cut outside edge or Skip), type the real size in mm and download the steps. Every file is the same mm page anchored at the laser's 0,0. Letters, ornaments (filled or hollow) and cuts are SVG, which LaserGRBL positions from the page itself, so they always line up: File > Open File > speed and power > Create!. Photo and filled letters are ready-to-run G-code (.nc) with mode, power and speed set in the app (Burn settings: Mode, Power %, Speed per step, no materials): File > Open File > Start, nothing to size or offset (PNG pictures remain as a setting).

## v54 - Wayland design file, and a saved copy of v53

**💾 Save as Wayland design** (on the Export and Laser sheets) writes a `.wayland.json` file that Waylands Path can open. **✏️ Send to Waylands Path** still works as before, and also attaches that file so a newer Path can use it. **Download file**, **Load…** and **Export** are unchanged. Load… also opens a Wayland design (lettering comes back if the file was saved from Forge; lines from Path arrive as imported lines).

A saved copy of v53 stays at https://warwicklewis1970-oss.github.io/wayland-forge/v53/ (and as a GitHub release zip) if you ever need to go back.

**No laser changes** unless you open a new imported design and include those lines in a burn. Existing projects export exactly as in v53.

## v53 - Image frame

Image layers › Placement › **Inside my own frame (a shape you adjust)** gives a picture its own frame, separate from the text path. Start from an Oval, Rectangle, Rounded rectangle or your Path shape, then on the picture: drag inside to move it, drag a dot to bend it, side squares stretch one way, corner squares resize, ⟳ turns it. Or type Width / Height mm and Turn °. + Add point, − Remove point, Make corner / smooth, All smooth / All corners, Centre on picture, ↺ Reset frame. The picture (screen, SVG, PDF and laser image steps) is trimmed to the frame. The frame line itself is **not burned** unless you choose Etch or Cut under "Frame line on the laser" (also listed in the Laser list as "… – frame line", Skip by default). Laser files are unchanged unless a frame is used.
