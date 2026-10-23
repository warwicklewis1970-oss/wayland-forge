/* Wayland Forge — text-on-path badge maker with true vector export. */
'use strict';
(() => {
const FONTS = [
  ['Cinzel', 'Cinzelwght.ttf'], ['Playfair Display', 'PlayfairDisplaywght.ttf'], ['Oswald', 'Oswaldwght.ttf'],
  ['Bebas Neue', 'BebasNeue-Regular.ttf'], ['Alfa Slab One', 'AlfaSlabOne-Regular.ttf'], ['Rye', 'Rye-Regular.ttf'],
  ['Pirata One', 'PirataOne-Regular.ttf'], ['Metal Mania', 'MetalMania-Regular.ttf']
];
const C = 500, ART = 1000, STORE = 'wayland-forge-project-v1';
const fonts = {};
const $ = id => document.getElementById(id);
const f2 = n => Math.round(n * 100) / 100;
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// ---------- state ----------
const newLayer = (text, side) => ({ id: uid(), text, font: 'Cinzel', size: 70, color: '#1b1b1b', side, ring: 'between', offset: 0, spacing: 4, lift: 0, letters: {} });
const defaults = () => ({
  bg: 'transparent', bgColor: '#ffffff',
  base: { shape: 'circle', rx: 400, ry: 400, sides: 6, points: 5, innerRatio: 0.55, dip: 0.45, corner: 14, smooth: 80, gap: 120, width: 8, stroke: '#1b1b1b', outer: true, inner: true, fillOn: false, fill: '#f4ede0' },
  layers: [newLayer('WAYLAND FORGE', 'top'), newLayer('EST. 2026', 'bottom')],
  ornaments: [{ id: uid(), type: 'star', x: 160, y: 500, r: 22, rot: 0, color: '#1b1b1b' }, { id: uid(), type: 'star', x: 840, y: 500, r: 22, rot: 0, color: '#1b1b1b' }],
  image: null,
  swatches: ['#1b1b1b', '#ffffff', '#e0a043', '#8b1e1e', '#1e4d8b', '#2f6b3a']
});
let S = defaults();
let sel = { layer: S.layers[0].id, letters: [], orn: null, img: false };
let mode = { multi: false, pan: false };
const hist = { stack: [], i: -1 };

const curLayer = () => S.layers.find(l => l.id === sel.layer) || null;
const curOrn = () => S.ornaments.find(o => o.id === sel.orn) || null;
// multi-letter selection: sel.letters = [{l: layerId, i: glyphIndex}], may span layers
const isSel = (l, i) => sel.letters.some(s => s.l === l && s.i === i);
function letterObj(l, i) {
  const L = S.layers.find(x => x.id === l); if (!L) return null;
  return L.letters[i] || (L.letters[i] = { dx: 0, dy: 0, rot: 0, scale: 1 });
}
const selObjs = () => sel.letters.map(s => letterObj(s.l, s.i)).filter(Boolean);

// ---------- geometry ----------
// Circle/ellipse are sampled directly. Polygon, star and heart are built as "filleted polygons":
// straight edges joined by circular corner arcs. Offsetting such a shape is exact — every edge
// shifts along its normal and every arc keeps its centre and changes radius — so inner/outer lines
// are true offset curves and the text path is a continuous, corner-rounded curve.
const FILLET = ['polygon', 'star', 'heart'];
const P2 = (x, y) => ({ x, y });
function shapeVerts() {
  const b = S.base, rx = b.rx, ry = b.ry, V = [], R = [], fixed = [], cr = b.corner || 0;
  if (b.shape === 'polygon' || b.shape === 'star') {
    const star = b.shape === 'star', n = star ? b.points * 2 : b.sides;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n, k = star && i % 2 ? b.innerRatio : 1;
      V.push(P2(C + rx * k * Math.cos(a), C + ry * k * Math.sin(a))); R.push(cr); fixed.push(false);
    }
    return { V, R, fixed };
  }
  // heart: two lobe circles + dip vertex + tip vertex. Lobes are emitted as several corners that all
  // circumscribe the same circle (fixed radius), so they join into one smooth arc.
  const rho = 0.47 * rx, top = C - 0.92 * ry, O = P2(C + 0.5 * rx, top + rho);
  const D = P2(C, O.y - rho * (0.85 - 0.95 * (b.dip ?? 0.45))), B = P2(C, C + 0.95 * ry);
  const tan = (Q, sign) => { const dx = Q.x - O.x, dy = Q.y - O.y; return Math.atan2(dy, dx) + sign * Math.acos(Math.min(1, rho / Math.hypot(dx, dy))); };
  let a0 = tan(D, 1), a1 = tan(B, -1); while (a1 <= a0) a1 += 2 * Math.PI;
  const k = 4, step = (a1 - a0) / k, right = [];
  for (let j = 0; j < k; j++) { const m = a0 + (j + 0.5) * step, r = rho / Math.cos(step / 2); right.push(P2(O.x + r * Math.cos(m), O.y + r * Math.sin(m))); }
  V.push(D); R.push(cr); fixed.push(false);
  right.forEach(p => { V.push(p); R.push(rho); fixed.push(true); });
  V.push(B); R.push(cr); fixed.push(false);
  right.slice().reverse().forEach(p => { V.push(P2(2 * C - p.x, p.y)); R.push(rho); fixed.push(true); });
  return { V, R, fixed };
}
function intersect(a, u, b, w) {
  const den = u.x * w.y - u.y * w.x; if (Math.abs(den) < 1e-9) return null;
  const t = ((b.x - a.x) * w.y - (b.y - a.y) * w.x) / den; return P2(a.x + u.x * t, a.y + u.y * t);
}
// Offset a filleted polygon by d (positive = outward). minR = minimum corner radius (text smoothing).
function filletOffset(G, d, minR) {
  const { V, R, fixed } = G, n = V.length, dir = [];
  for (let i = 0; i < n; i++) { const a = V[i], b = V[(i + 1) % n], l = Math.hypot(b.x - a.x, b.y - a.y) || 1; dir.push(P2((b.x - a.x) / l, (b.y - a.y) / l)); }
  const cs = [];
  for (let i = 0; i < n; i++) {
    const u = dir[(i - 1 + n) % n], w = dir[i], cross = u.x * w.y - u.y * w.x, theta = Math.atan2(Math.abs(cross), u.x * w.x + u.y * w.y);
    const convex = cross > 0, nu = P2(u.y, -u.x), nw = P2(w.y, -w.x);
    const P = intersect(P2(V[i].x + nu.x * d, V[i].y + nu.y * d), u, P2(V[i].x + nw.x * d, V[i].y + nw.y * d), w) || P2(V[i].x + nu.x * d, V[i].y + nu.y * d);
    let r = convex ? R[i] + d : R[i] - d; if (!fixed[i]) r = Math.max(r, minR || 0); r = Math.max(r, 0);
    cs.push({ P, u, w, nu, convex, theta, r, fixed: fixed[i], t: r * Math.tan(theta / 2) });
  }
  const edge = i => { const a = cs[i].P, b = cs[(i + 1) % n].P; return (b.x - a.x) * dir[i].x + (b.y - a.y) * dir[i].y; };
  for (let i = 0; i < n; i++) { // shrink non-fixed corners that don't fit their edges
    const c = cs[i]; if (c.fixed || c.t <= 0) continue;
    const ip = (i - 1 + n) % n, inx = (i + 1) % n;
    const availP = cs[ip].fixed ? edge(ip) - cs[ip].t : edge(ip) / 2, availN = cs[inx].fixed ? edge(i) - cs[inx].t : edge(i) / 2;
    const t = Math.max(0, Math.min(c.t, availP, availN)); if (t < c.t) { c.t = t; c.r = t / Math.tan(c.theta / 2); }
  }
  let ok = true;
  for (let i = 0; i < n; i++) if (edge(i) - cs[i].t - cs[(i + 1) % n].t < -0.5 || edge(i) < -0.5) ok = false;
  for (const c of cs) {
    c.T1 = P2(c.P.x - c.u.x * c.t, c.P.y - c.u.y * c.t); c.T2 = P2(c.P.x + c.w.x * c.t, c.P.y + c.w.y * c.t);
    const s = c.convex ? -1 : 1; c.O = P2(c.T1.x + s * c.nu.x * c.r, c.T1.y + s * c.nu.y * c.r);
  }
  return { cs, ok };
}
// Largest-magnitude valid offset between 0 and d (keeps inner lines/text from self-intersecting).
function safeOffset(G, d, minR) {
  let g = filletOffset(G, d, minR); if (g.ok || d >= 0) return { g, d };
  let lo = 0, hi = d; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (filletOffset(G, m, minR).ok) lo = m; else hi = m; }
  return { g: filletOffset(G, lo, minR), d: lo };
}
function filletPts(g) {
  const pts = [];
  for (const c of g.cs) {
    if (c.r > 0.01 && c.t > 0.01) {
      const a1 = Math.atan2(c.T1.y - c.O.y, c.T1.x - c.O.x), sw = (c.convex ? 1 : -1) * c.theta, k = Math.max(2, Math.ceil(c.theta / (Math.PI / 120)));
      for (let j = 0; j <= k; j++) { const a = a1 + sw * j / k; pts.push([c.O.x + c.r * Math.cos(a), c.O.y + c.r * Math.sin(a)]); }
    } else pts.push([c.P.x, c.P.y]);
  }
  return pts;
}
function filletD(g) {
  const c0 = g.cs[0]; let d = `M${f2(c0.T1.x)} ${f2(c0.T1.y)}`;
  g.cs.forEach((c, i) => {
    if (i) d += `L${f2(c.T1.x)} ${f2(c.T1.y)}`;
    if (c.r > 0.01 && c.t > 0.01) d += `A${f2(c.r)} ${f2(c.r)} 0 0 ${c.convex ? 1 : 0} ${f2(c.T2.x)} ${f2(c.T2.y)}`;
  });
  return d + 'Z';
}
let geoCache = { key: '', G: null };
function baseGeo() { const key = JSON.stringify(S.base); if (geoCache.key !== key) geoCache = { key, G: shapeVerts() }; return geoCache.G; }
function maxInnerGap() { if (!FILLET.includes(S.base.shape)) return Infinity; return -safeOffset(baseGeo(), -2000, 0).d; }
function ringPts(d, text) {
  const b = S.base;
  if (FILLET.includes(b.shape)) return filletPts(safeOffset(baseGeo(), d, text ? b.smooth : 0).g);
  const rx = b.rx + d, ry = (b.shape === 'circle' ? b.rx : b.ry) + d, pts = [];
  for (let i = 0; i < 1440; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 1440; pts.push([C + rx * Math.cos(a), C + ry * Math.sin(a)]); }
  return pts;
}
// Arc-length walker. Starts where the closed (clockwise) path crosses the vertical centre line —
// at the top for top text (runs clockwise), at the bottom for bottom text (runs anticlockwise).
function walker(pts, side) {
  const n0 = pts.length; let best = null;
  for (let i = 0; i < n0; i++) {
    const a = pts[i], b = pts[(i + 1) % n0], da = a[0] - C, db = b[0] - C;
    if ((da <= 0 && db > 0) || (da >= 0 && db < 0) || (da === 0 && db === 0)) {
      const t = da === db ? 0 : da / (da - db), y = a[1] + (b[1] - a[1]) * t;
      if (!best || (side === 'top' ? y < best.y : y > best.y)) best = { i, y };
    }
  }
  const X = [C, best ? best.y : pts[0][1]], bi = best ? best.i : 0, P = [X];
  if (side === 'top') for (let k = 1; k <= n0; k++) P.push(pts[(bi + k) % n0]);
  else for (let k = 0; k < n0; k++) P.push(pts[(bi - k + n0) % n0]);
  const n = P.length, cum = [0];
  for (let i = 1; i <= n; i++) { const a = P[i - 1], b = P[i % n]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const L = cum[n];
  return { L, at(s) {
    s = ((s % L) + L) % L; let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const a = P[lo], b = P[(lo + 1) % n], t = (s - cum[lo]) / ((cum[lo + 1] - cum[lo]) || 1);
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
  } };
}
function shapeEl(d, attrs) {
  const b = S.base;
  if (FILLET.includes(b.shape)) { const r = safeOffset(baseGeo(), d, 0); return `<path d="${filletD(r.g)}" ${attrs}/>`; }
  const rx = b.rx + d, ry = (b.shape === 'circle' ? b.rx : b.ry) + d;
  if (rx <= 0 || ry <= 0) return '';
  return `<ellipse cx="${C}" cy="${C}" rx="${f2(rx)}" ry="${f2(ry)}" ${attrs}/>`;
}
// Lay a text layer's glyph outlines along the ring.
function layoutLayer(Ly) {
  const f = fonts[Ly.font]; if (!f || !Ly.text) return [];
  const sc = Ly.size / f.unitsPerEm, cap = ((f.tables.os2 && f.tables.os2.sCapHeight) || f.unitsPerEm * 0.7) * sc;
  const b = S.base, m = b.width / 2 + 10, gap = Math.min(b.gap, maxInnerGap());
  const d = (Ly.ring === 'outer' ? m : Ly.ring === 'inner' ? -gap - m : -gap / 2) + Ly.lift;
  const top = Ly.side === 'top';
  const baseY = Ly.ring === 'between' ? cap / 2 : ((Ly.ring === 'outer') === top ? 0 : cap);
  const W = walker(ringPts(d, true), Ly.side);
  const gl = f.stringToGlyphs(Ly.text);
  const adv = gl.map((g, i) => g.advanceWidth * sc + (i < gl.length - 1 ? Ly.spacing + f.getKerningValue(g, gl[i + 1]) * sc : 0));
  const total = adv.reduce((a, c) => a + c, 0);
  let cur = (top ? 1 : -1) * Ly.offset / 360 * W.L - total / 2;
  return gl.map((g, i) => {
    const w = g.advanceWidth * sc, sm = cur + w / 2, a = Ly.letters[i] || {};
    const p = W.at(sm), h = Math.max(w / 2, Ly.size * 0.6), p0 = W.at(sm - h), p1 = W.at(sm + h);
    const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x); // chord direction: rotates smoothly round corners
    cur += adv[i];
    const gp = g.getPath(-w / 2, baseY, Ly.size), bb = gp.getBoundingBox();
    return { i, s: sm, w, x: p.x, y: p.y, ang, d: gp.toPathData(2), bb: bb.x2 > bb.x1 ? bb : null,
      tr: `translate(${f2(p.x + (a.dx || 0))} ${f2(p.y + (a.dy || 0))}) rotate(${f2(ang * 180 / Math.PI + (a.rot || 0))}) scale(${a.scale || 1})` };
  });
}
function starD(r) {
  let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; d += (i ? 'L' : 'M') + f2(rr * Math.cos(a)) + ' ' + f2(rr * Math.sin(a)); }
  return d + 'Z';
}


// ---------- centre image: silhouette + vector trace ----------
function imgDefaults() { return { mode: 'orig', removeBg: false, tol: 60, bgMode: 'light', threshold: 128, smooth: 2, invert: false, color: '#1a1410' }; }
const imgEls = new Map(), procCache = new Map();
function srcKey(s) { let h = 0; for (let i = 0; i < s.length; i += 97) h = (h * 31 + s.charCodeAt(i)) | 0; return s.length + ':' + h; }
function loadedImg(src) {
  let el = imgEls.get(src); if (el) return el.complete && el.naturalWidth ? el : null;
  el = new Image(); el.onload = () => { procCache.clear(); update(); }; el.src = src; imgEls.set(src, el); return null;
}
function grab(el, maxSide) {
  const k = Math.min(1, maxSide / Math.max(el.naturalWidth, el.naturalHeight)), w = Math.max(1, Math.round(el.naturalWidth * k)), h = Math.max(1, Math.round(el.naturalHeight * k));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d'); cx.drawImage(el, 0, 0, w, h);
  return { cv, cx, w, h, id: cx.getImageData(0, 0, w, h) };
}
function boxBlur(a, w, h, r) { // separable box blur, run twice (≈ gaussian); no ctx.filter so it works in Safari too
  const t = new Float32Array(a.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) { let s = 0; const o = y * w; for (let x = -r; x <= r; x++) s += a[o + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { t[o + x] = s / (2 * r + 1); s += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { a[y * w + x] = s / (2 * r + 1); s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  }
}
function inkMask(g, im) { // 1 = ink, 0 = background
  const d = g.id.data, n = g.w * g.h, m = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = i * 4, lum = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
    let ink = d[p + 3] > 10 && (im.bgMode === 'dark' ? lum > im.threshold : lum < im.threshold); if (im.invert) ink = !ink; m[i] = ink ? 1 : 0; }
  if (im.smooth > 0) { boxBlur(m, g.w, g.h, Math.max(1, Math.round(im.smooth * Math.max(g.w, g.h) * 0.004))); for (let i = 0; i < n; i++) m[i] = m[i] > 0.5 ? 1 : 0; }
  return m;
}
function procImage(im) {
  if (im.mode === 'orig' && !im.removeBg) return null;
  const key = im.mode === 'orig' ? ['o', im.tol] : im.mode === 'sil' ? ['s', im.bgMode, im.threshold, im.smooth, im.invert, im.color] : ['t', im.bgMode, im.threshold, im.smooth, im.invert];
  const ck = srcKey(im.src) + '|' + key.join('|'); if (procCache.has(ck)) return procCache.get(ck);
  const el = loadedImg(im.src); if (!el) return null;
  let res;
  try {
    if (im.mode === 'orig') { // colour-preserving background removal: corners give the background colour
      const g = grab(el, 1600), d = g.id.data, W = g.w, H = g.h, cs = [0, W - 1, (H - 1) * W, H * W - 1].map(i => i * 4), bg = [0, 1, 2].map(c => cs.reduce((a, p) => a + d[p + c], 0) / 4);
      for (let p = 0; p < d.length; p += 4) { const dist = Math.hypot(d[p] - bg[0], d[p + 1] - bg[1], d[p + 2] - bg[2]); if (dist < im.tol) d[p + 3] = 0; else if (dist < im.tol * 1.3) d[p + 3] = Math.round(d[p + 3] * (dist - im.tol) / (im.tol * 0.3)); }
      g.cx.putImageData(g.id, 0, 0); res = { url: g.cv.toDataURL('image/png') };
    } else if (im.mode === 'sil') {
      const g = grab(el, 1200), m = inkMask(g, im), d = g.id.data, c = hexRgb(im.color);
      for (let i = 0; i < m.length; i++) { const p = i * 4; d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = m[i] ? 255 : 0; }
      g.cx.putImageData(g.id, 0, 0); res = { url: g.cv.toDataURL('image/png') };
    } else { // vector trace with ImageTracer (public domain): 2-colour mask -> filled SVG paths
      const g = grab(el, 600), m = inkMask(g, im), d = g.id.data;
      for (let i = 0; i < m.length; i++) { const p = i * 4, v = m[i] ? 0 : 255; d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255; }
      const svg = ImageTracer.imagedataToSVG(g.id, { pal: [{ r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }], numberofcolors: 2, colorquantcycles: 1, ltres: 0.5, qtres: 0.5, pathomit: 6, blurradius: 0, strokewidth: 0, roundcoords: 1, linefilter: true });
      const paths = []; svg.replace(/<path[^>]*fill="rgb\(0,0,0\)"[^>]*\sd="([^"]+)"/g, (_, dd) => paths.push(dd.trim()));
      res = { paths, w: g.w, h: g.h };
    }
  } catch (err) { console.warn('image processing failed', err); res = null; }
  procCache.set(ck, res); if (procCache.size > 30) procCache.delete(procCache.keys().next().value);
  return res;
}
function hexRgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); const n = m ? parseInt(m[1], 16) : 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }

// ---------- SVG builder (shared by editor and exports) ----------
function buildArt(editor) {
  const b = S.base, out = [];
  if (b.fillOn) out.push(shapeEl(0, `fill="${b.fill}"`));
  if (S.image) {
    const im = S.image, clip = im.clip && b.inner, pr = procImage(im), ek = editor ? ' data-k="img"' : '';
    if (clip) out.push(`<clipPath id="wfclip">${shapeEl(-b.gap, '')}</clipPath>`);
    let el;
    if (pr && pr.paths) { // vector trace: real paths, fitted like preserveAspectRatio=meet
      const k = im.size / Math.max(pr.w, pr.h), x0 = im.x - pr.w * k / 2, y0 = im.y - pr.h * k / 2;
      el = `<g transform="translate(${f2(x0)} ${f2(y0)}) scale(${+k.toFixed(5)})" fill="${im.color}" fill-rule="evenodd"${ek}>` +
        (editor ? `<rect width="${pr.w}" height="${pr.h}" fill="none" pointer-events="all"/>` : '') + pr.paths.map(d => `<path d="${d}"/>`).join('') + '</g>';
    } else el = `<image href="${esc(pr && pr.url ? pr.url : im.src)}" x="${f2(im.x - im.size / 2)}" y="${f2(im.y - im.size / 2)}" width="${im.size}" height="${im.size}" preserveAspectRatio="xMidYMid meet"${ek}/>`;
    out.push(`<g${clip ? ' clip-path="url(#wfclip)"' : ''}>${el}</g>`);
    if (editor && sel.img) out.push(`<rect x="${im.x - im.size / 2}" y="${im.y - im.size / 2}" width="${im.size}" height="${im.size}" fill="none" stroke="#e0a043" stroke-dasharray="8 6" stroke-width="2" pointer-events="none"/>`);
  }
  if (b.width > 0) {
    const st = `fill="none" stroke="${b.stroke}" stroke-width="${b.width}"`;
    if (b.outer) out.push(shapeEl(0, st));
    if (b.inner) out.push(shapeEl(-b.gap, st));
  }
  for (const o of S.ornaments) {
    const shape = o.type === 'star' ? `<path d="${starD(o.r)}"/>` : `<circle r="${o.r}"/>`;
    out.push(`<g transform="translate(${f2(o.x)} ${f2(o.y)}) rotate(${o.rot})" fill="${o.color}"${editor ? ` data-k="orn" data-id="${o.id}"` : ''}>${shape}${editor && sel.orn === o.id ? `<circle r="${o.r + 8}" fill="none" stroke="#e0a043" stroke-dasharray="6 4" stroke-width="2"/>` : ''}</g>`);
  }
  for (const L of S.layers) {
    const g = layoutLayer(L).map(q => {
      if (!editor) return `<path d="${q.d}" transform="${q.tr}"/>`;
      const hi = isSel(L.id, q.i), at = ` data-k="ch" data-l="${L.id}" data-i="${q.i}"`, bb = q.bb, pd = 6;
      // transparent bbox hit-rect: thin strokes, counters and gaps between strokes all grab the letter
      const hit = bb ? `<rect data-hit="1"${at} x="${f2(bb.x1 - pd)}" y="${f2(bb.y1 - pd)}" width="${f2(bb.x2 - bb.x1 + 2 * pd)}" height="${f2(bb.y2 - bb.y1 + 2 * pd)}" pointer-events="all" ${hi ? 'fill="#e0a043" fill-opacity="0.18" stroke="#e0a043" stroke-width="1.5" stroke-dasharray="4 3"' : 'fill="none"'}/>` : '';
      return `<g transform="${q.tr}"><path d="${q.d}"${at}${hi ? ' stroke="#e0a043" stroke-width="3"' : ''}/>${hit}</g>`;
    }).join('');
    out.push(`<g fill="${L.color}">${g}</g>`);
  }
  return out.join('\n');
}
// Full export SVG at a physical page size; artwork (square) fitted centred, bleed added around.
function exportSVG(W, H, unit, bleed, pxOverride) {
  const s = Math.min(W, H), k = ART / s;
  const vw = (W + 2 * bleed) * k, vh = (H + 2 * bleed) * k, vx = C - vw / 2, vy = C - vh / 2;
  const size = pxOverride ? `width="${pxOverride[0]}" height="${pxOverride[1]}"` : `width="${f2(W + 2 * bleed)}${unit}" height="${f2(H + 2 * bleed)}${unit}"`;
  const bg = S.bg === 'color' ? `<rect x="${f2(vx)}" y="${f2(vy)}" width="${f2(vw)}" height="${f2(vh)}" fill="${S.bgColor}"/>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${size} viewBox="${f2(vx)} ${f2(vy)} ${f2(vw)} ${f2(vh)}">\n<title>Wayland Forge artwork</title>\n${bg}\n${buildArt(false)}\n</svg>\n`;
}

// ---------- editor rendering ----------
const stage = $('stage');
let view = { x: -40, y: -40, w: 1080, h: 1080 };
function render() {
  const bgFill = S.bg === 'color' ? S.bgColor : 'none';
  stage.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  stage.innerHTML = `<rect x="0" y="0" width="${ART}" height="${ART}" fill="${bgFill}" stroke="#6b5f50" stroke-dasharray="6 6" data-k="bg"/>` + buildArt(true);
  persist();
}
function syncUI() {
  document.querySelectorAll('[data-b]').forEach(el => {
    const [scope, key] = el.dataset.b.split('.'); const o = target(scope);
    el.disabled = !o; if (!o) return;
    if (el.type === 'checkbox') el.checked = !!o[key]; else el.value = o[key];
    const out = el.nextElementSibling; if (out && out.tagName === 'OUTPUT') out.textContent = o[key];
  });
  const sh = S.base.shape;
  document.querySelectorAll('[data-shapes]').forEach(e => e.hidden = !e.dataset.shapes.split(' ').includes(sh));
  const mg = maxInnerGap(); $('gapWarn').hidden = !(S.base.gap > mg); $('gapWarn').textContent = `Ring gap limited to ${Math.floor(mg)} for this shape so the inner line can't fold over itself.`;
  $('layerSel').innerHTML = S.layers.map(l => `<option value="${l.id}"${l.id === sel.layer ? ' selected' : ''}>${esc(l.text || '(empty)')} · ${l.side}</option>`).join('');
  $('layerFields').hidden = !curLayer();
  const n = sel.letters.length;
  $('letterBox').hidden = !n; $('letterNone').hidden = !!n;
  if (n) {
    const names = sel.letters.slice(0, 12).map(s => { const L = S.layers.find(x => x.id === s.l); return (L && L.text[s.i]) || '?'; });
    $('letterName').textContent = `${n} letter${n > 1 ? 's' : ''} selected: ${names.join(' ')}${n > 12 ? ' …' : ''}`;
    const o = selObjs()[0] || {};
    document.querySelectorAll('[data-rel]').forEach(el => { const v = el.dataset.rel === 'rot' ? (o.rot || 0) : (o.scale || 1); el.value = v; el._prev = +el.value; el.nextElementSibling.textContent = n > 1 ? 'rel' : v; });
  }
  $('selCount').hidden = !n; $('selCount').textContent = n + ' sel';
  document.querySelectorAll('.multitog').forEach(b => b.setAttribute('aria-pressed', mode.multi));
  $('multiBtn2').textContent = '✚ Multi-select: ' + (mode.multi ? 'on' : 'off');
  $('dragMode').classList.toggle('pan', mode.pan); $('dragMode').innerHTML = mode.pan ? '✋<span class="tl"> Pan</span>' : '▭<span class="tl"> Box</span>';
  const im = S.image; if (im) document.querySelectorAll('[data-imgmodes]').forEach(e => e.hidden = !e.dataset.imgmodes.split(' ').includes(im.mode));
  if (im && im.mode === 'trace') { const pr = procImage(im); $('traceInfo').textContent = pr && pr.paths ? `Traced ${pr.paths.length} vector shape${pr.paths.length === 1 ? '' : 's'}; they export as true paths in SVG and PDF.` : 'Tracing…'; }
  $('ornFields').hidden = !curOrn(); $('ornNone').hidden = !!curOrn() || !S.ornaments.length;
  $('imgFields').hidden = !S.image;
  $('swatches').innerHTML = S.swatches.map(c => `<button style="background:${c}" data-c="${c}" title="${c}"></button>`).join('');
  $('undoBtn').disabled = hist.i <= 0; $('redoBtn').disabled = hist.i >= hist.stack.length - 1;
}
function target(scope) {
  return scope === 'base' ? S.base : scope === 'layer' ? curLayer() : scope === 'orn' ? curOrn() : scope === 'img' ? S.image : scope === 'doc' ? S : null;
}
function update() { render(); syncUI(); }
function commit() {
  const snap = JSON.stringify(S);
  if (hist.stack[hist.i] === snap) return;
  hist.stack = hist.stack.slice(0, hist.i + 1); hist.stack.push(snap);
  if (hist.stack.length > 100) hist.stack.shift(); hist.i = hist.stack.length - 1;
  syncUI();
}
function restore(snap) { S = JSON.parse(snap); geoCache.key = ''; fixSel(); update(); }
function sanitize(raw) {
  const d = defaults(), o = raw || {};
  const st = { bg: o.bg === 'color' ? 'color' : 'transparent', bgColor: o.bgColor || d.bgColor,
    base: Object.assign({}, d.base, o.base || {}), swatches: Array.isArray(o.swatches) ? o.swatches : d.swatches,
    layers: Array.isArray(o.layers) ? o.layers.map(l => Object.assign(newLayer('', 'top'), l)) : d.layers,
    ornaments: Array.isArray(o.ornaments) ? o.ornaments.filter(x => x && (x.type === 'star' || x.type === 'dot')) : d.ornaments,
    image: o.image && o.image.src ? Object.assign(imgDefaults(), o.image) : null };
  if (!['circle', 'ellipse', 'polygon', 'star', 'heart'].includes(st.base.shape)) st.base.shape = 'circle';
  return st; // anything else in old data (frames, templates, packs…) is dropped
}
function fixSel() { if (!curLayer()) sel.layer = S.layers[0] ? S.layers[0].id : null; if (!curOrn()) sel.orn = null; if (!S.image) sel.img = false; sel.letters = sel.letters.filter(s => { const L = S.layers.find(x => x.id === s.l); return L && s.i < L.text.length; }); }
let saveT; function persist() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* storage full (large image) */ } }, 300); }

// ---------- control bindings ----------
document.querySelectorAll('[data-b]').forEach(el => {
  el.addEventListener('input', () => {
    const [scope, key] = el.dataset.b.split('.'); const o = target(scope); if (!o) return;
    o[key] = el.type === 'checkbox' ? el.checked : (el.type === 'range' || el.type === 'number') ? parseFloat(el.value) : el.value;
    if (scope === 'layer' && key === 'text') fixSel();
    const out = el.nextElementSibling; if (out && out.tagName === 'OUTPUT') out.textContent = o[key];
    render(); if (scope === 'base' || scope === 'img') syncUI();
    if (el.tagName === 'SELECT' || el.type === 'checkbox') { syncUI(); commit(); }
  });
  el.addEventListener('change', commit);
});
$('fontSel').innerHTML = FONTS.map(f => `<option>${f[0]}</option>`).join('');
$('layerSel').addEventListener('change', e => { sel.layer = e.target.value; update(); });
const act = (id, fn) => $(id).addEventListener('click', () => { fn(); fixSel(); update(); commit(); });
act('addLayer', () => { const L = newLayer('NEW TEXT', 'top'); L.ring = 'outer'; S.layers.push(L); sel.layer = L.id; });
act('delLayer', () => { S.layers = S.layers.filter(l => l.id !== sel.layer); });
act('dupOpp', () => { const L = curLayer(); if (!L) return; const c = JSON.parse(JSON.stringify(L)); c.id = uid(); c.side = L.side === 'top' ? 'bottom' : 'top'; c.offset = -L.offset; S.layers.push(c); sel.layer = c.id; });
act('resetLetter', () => { for (const s of sel.letters) { const L = S.layers.find(x => x.id === s.l); if (L) delete L.letters[s.i]; } });
act('resetLetters', () => { const L = curLayer(); if (L) L.letters = {}; });
const addOrn = type => { const o = { id: uid(), type, x: C, y: C, r: type === 'star' ? 26 : 10, rot: 0, color: S.base.stroke }; S.ornaments.push(o); sel.orn = o.id; };
act('addStar', () => addOrn('star')); act('addDot', () => addOrn('dot'));
act('mirrorOrn', () => { const o = curOrn(); if (!o) return; const c = { ...o, id: uid(), x: ART - o.x, rot: -o.rot }; S.ornaments.push(c); sel.orn = c.id; });
act('delOrn', () => { S.ornaments = S.ornaments.filter(o => o.id !== sel.orn); });
act('clearOrn', () => { S.ornaments = []; });
act('centreImg', () => { if (S.image) { S.image.x = C; S.image.y = C; } });
act('delImg', () => { S.image = null; });
act('addSwatch', () => { const c = $('swatchPick').value; if (!S.swatches.includes(c)) S.swatches.push(c); });
act('newProj', () => { if (confirm('Start a new design? Unsaved work will be replaced.')) { S = defaults(); sel = { layer: S.layers[0].id, letters: [], orn: null, img: false }; } });
$('swatches').addEventListener('click', e => {
  const c = e.target.dataset && e.target.dataset.c; if (!c) return;
  if (curOrn()) curOrn().color = c; else if (curLayer()) curLayer().color = c; else S.base.stroke = c;
  update(); commit();
});
$('imgFile').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => { S.image = Object.assign(imgDefaults(), { src: r.result, x: C, y: C, size: Math.max(80, (S.base.rx - S.base.gap) * 2), clip: true }); sel.img = true; sel.orn = null; update(); commit(); };
  r.readAsDataURL(file); e.target.value = '';
});
$('undoBtn').onclick = () => { if (hist.i > 0) restore(hist.stack[--hist.i]); };
$('redoBtn').onclick = () => { if (hist.i < hist.stack.length - 1) restore(hist.stack[++hist.i]); };
$('fitBtn').onclick = () => fitView();
document.addEventListener('keydown', e => {
  if (e.target.matches('input[type=text]')) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); (e.shiftKey ? $('redoBtn') : $('undoBtn')).click(); }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); $('redoBtn').click(); }
  if (e.target.matches('input,select,textarea')) return;
  if (k === 'escape' && sel.letters.length) { sel.letters = []; update(); }
  if ((e.ctrlKey || e.metaKey) && k === 'a') { e.preventDefault(); $('selAll').click(); }
  if (e.key === ' ') { spaceDown = true; e.preventDefault(); }
  const ar = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
  if (ar && sel.letters.length) { e.preventDefault(); nudge(ar[0], ar[1], e.shiftKey ? 10 : 2); }
});
document.addEventListener('keyup', e => { if (e.key === ' ') spaceDown = false; });

// ---------- pointer: select, drag, pan, zoom ----------
function svgPt(e) { const p = stage.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(stage.getScreenCTM().inverse()); }
let drag = null, spaceDown = false;
function nudge(x, y, step) { for (const o of selObjs()) { o.dx = f2(o.dx + x * step); o.dy = f2(o.dy + y * step); } update(); commit(); }
document.querySelectorAll('[data-nudge]').forEach(b => b.addEventListener('click', () => { const [x, y] = b.dataset.nudge.split(',').map(Number); nudge(x, y, 2); }));
document.querySelectorAll('[data-rel]').forEach(el => {
  el.addEventListener('input', () => { // relative: every selected letter changes by the same delta / ratio
    const v = parseFloat(el.value), prev = el._prev == null ? v : el._prev;
    for (const o of selObjs()) {
      if (el.dataset.rel === 'rot') o.rot = f2((o.rot || 0) + v - prev);
      else o.scale = Math.max(0.1, Math.min(5, +((o.scale || 1) * v / prev).toFixed(4)));
    }
    el._prev = v; el.nextElementSibling.textContent = sel.letters.length > 1 ? 'rel' : v; render();
  });
  el.addEventListener('change', () => { commit(); syncUI(); });
});
$('multiBtn').onclick = $('multiBtn2').onclick = () => { mode.multi = !mode.multi; syncUI(); };
$('dragMode').onclick = () => { mode.pan = !mode.pan; syncUI(); };
$('clearSel').onclick = () => { sel.letters = []; update(); };
act('selAll', () => { const L = curLayer(); if (!L) return; const add = layoutLayer(L).filter(q => q.bb && !isSel(L.id, q.i)).map(q => ({ l: L.id, i: q.i })); sel.letters = sel.letters.concat(add); openSec('sec-letter'); });
const additive = e => e.shiftKey || e.ctrlKey || e.metaKey || mode.multi;
function startLetterDrag(p) { drag = { letters: selObjs().map(o => ({ o, x0: o.dx, y0: o.dy })), p }; }
stage.addEventListener('pointerdown', e => {
  if (drag) return; // second finger etc.
  const t = e.target.closest('[data-k]'), k = t && t.dataset.k, p = svgPt(e);
  stage.setPointerCapture(e.pointerId);
  if (e.button === 1 || spaceDown || (mode.pan && k !== 'ch' && k !== 'orn' && k !== 'img')) {
    e.preventDefault(); drag = { pan: true, sx: e.clientX, sy: e.clientY, v: { ...view } }; stage.classList.add('panning'); return;
  }
  if (e.button > 0) return;
  sel.img = false;
  if (k === 'ch') {
    const l = t.dataset.l, i = +t.dataset.i; sel.layer = l; sel.orn = null;
    if (additive(e)) {
      if (isSel(l, i)) { sel.letters = sel.letters.filter(s => !(s.l === l && s.i === i)); drag = { none: true }; }
      else { sel.letters.push({ l, i }); startLetterDrag(p); }
    } else if (isSel(l, i)) { startLetterDrag(p); drag.collapse = { l, i }; } // drag the whole group; a plain click narrows to this one
    else { sel.letters = [{ l, i }]; startLetterDrag(p); }
    openSec('sec-letter');
  } else if (k === 'orn') { sel.orn = t.dataset.id; sel.letters = []; const o = curOrn(); drag = { obj: o, x0: o.x, y0: o.y, p }; openSec('sec-orn'); }
  else if (k === 'img') { sel.img = true; sel.orn = null; sel.letters = []; drag = { obj: S.image, x0: S.image.x, y0: S.image.y, p }; openSec('sec-img'); }
  else { sel.orn = null; if (!additive(e)) sel.letters = []; drag = { mq: true, p, cx: e.clientX, cy: e.clientY }; }
  drag.sx = e.clientX; drag.sy = e.clientY;
  update(); // drag state lives in JS, not in the (re-rendered) DOM node
});
function drawMarquee(p) {
  let r = stage.querySelector('#wfmq'); if (!r) { r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.id = 'wfmq'; r.setAttribute('fill', 'rgba(224,160,67,0.12)'); r.setAttribute('stroke', '#e0a043'); r.setAttribute('stroke-dasharray', '6 4'); r.setAttribute('vector-effect', 'non-scaling-stroke'); r.setAttribute('pointer-events', 'none'); stage.appendChild(r); }
  r.setAttribute('x', Math.min(p.x, drag.p.x)); r.setAttribute('y', Math.min(p.y, drag.p.y)); r.setAttribute('width', Math.abs(p.x - drag.p.x)); r.setAttribute('height', Math.abs(p.y - drag.p.y));
}
stage.addEventListener('pointermove', e => {
  if (!drag || drag.none) return;
  if (drag.pan) { const r = stage.getBoundingClientRect(), s = drag.v.w / Math.min(r.width, r.height); view.x = drag.v.x - (e.clientX - drag.sx) * s; view.y = drag.v.y - (e.clientY - drag.sy) * s; render(); return; }
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 3) return; // click tolerance
  drag.moved = true; const p = svgPt(e), dx = p.x - drag.p.x, dy = p.y - drag.p.y;
  if (drag.mq) { drawMarquee(p); return; }
  if (drag.letters) for (const q of drag.letters) { q.o.dx = f2(q.x0 + dx); q.o.dy = f2(q.y0 + dy); }
  else { drag.obj.x = f2(drag.x0 + dx); drag.obj.y = f2(drag.y0 + dy); }
  render();
});
function endDrag(e) {
  const d = drag; drag = null; stage.classList.remove('panning'); if (!d) return;
  if (d.mq && d.moved) {
    const x1 = Math.min(d.cx, e.clientX), x2 = Math.max(d.cx, e.clientX), y1 = Math.min(d.cy, e.clientY), y2 = Math.max(d.cy, e.clientY);
    stage.querySelectorAll('rect[data-hit]').forEach(r => {
      const b = r.getBoundingClientRect(), mx = b.left + b.width / 2, my = b.top + b.height / 2;
      if (mx >= x1 && mx <= x2 && my >= y1 && my <= y2 && !isSel(r.dataset.l, +r.dataset.i)) sel.letters.push({ l: r.dataset.l, i: +r.dataset.i });
    });
    if (sel.letters.length) openSec('sec-letter');
  }
  if (d.collapse && !d.moved) sel.letters = [d.collapse];
  update(); if (d.moved && !d.mq && !d.pan) commit();
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('wheel', e => {
  e.preventDefault(); const p = svgPt(e), z = Math.exp(e.deltaY * 0.0015), w = Math.min(4000, Math.max(120, view.w * z)), r = w / view.w;
  view = { x: p.x - (p.x - view.x) * r, y: p.y - (p.y - view.y) * r, w, h: w }; render();
}, { passive: false });

// ---------- export ----------
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
async function doExport() {
  const fmt = $('exFmt').value, unit = $('exUnit').value, W = +$('exW').value, H = +$('exH').value, bleed = +$('exBleed').value || 0, dpi = +$('exDpi').value || 300;
  const name = 'wayland-forge-' + new Date().toISOString().slice(0, 10);
  if (!(W > 0 && H > 0)) throw new Error('Enter a width and height.');
  if (fmt === 'svg') { download(new Blob([exportSVG(W, H, unit, bleed)], { type: 'image/svg+xml' }), name + '.svg'); return `SVG ${W}×${H}${unit}${bleed ? ' + ' + bleed + unit + ' bleed' : ''}`; }
  if (fmt === 'pdf') {
    const PW = W + 2 * bleed, PH = H + 2 * bleed;
    const doc = new window.jspdf.jsPDF({ unit, format: [PW, PH], orientation: PW > PH ? 'landscape' : 'portrait' });
    const holder = document.createElement('div'); holder.style.cssText = 'position:absolute;left:-99999px;top:0';
    holder.innerHTML = exportSVG(W, H, unit, bleed).replace(/^<\?xml[^>]*>\n/, ''); document.body.appendChild(holder);
    try { await doc.svg(holder.querySelector('svg'), { x: 0, y: 0, width: PW, height: PH }); } finally { holder.remove(); }
    download(doc.output('blob'), name + '.pdf'); return `PDF ${f2(PW)}×${f2(PH)}${unit} page (vector)`;
  }
  const pf = $('exPrintify').checked, inch = unit === 'in' ? 1 : 1 / 25.4;
  let pw = pf ? 4500 : Math.round((W + 2 * bleed) * inch * dpi), ph = pf ? 4500 : Math.round((H + 2 * bleed) * inch * dpi);
  if (Math.max(pw, ph) > 12000) throw new Error(`That is ${pw}×${ph}px — too big for the browser. Lower the DPI or size.`);
  const svg = pf ? exportSVG(1, 1, 'in', 0, [pw, ph]) : exportSVG(W, H, unit, bleed, [pw, ph]);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const img = new Image(); img.decoding = 'sync';
  await new Promise((ok, bad) => { img.onload = ok; img.onerror = () => bad(new Error('Could not rasterise artwork.')); img.src = url; });
  const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph; cv.getContext('2d').drawImage(img, 0, 0, pw, ph); URL.revokeObjectURL(url);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  download(blob, name + '.png'); return `PNG ${pw}×${ph}px${pf ? ' (Printify)' : ` @ ${dpi} DPI`}`;
}
$('exportBtn').addEventListener('click', async () => {
  $('exInfo').textContent = 'Exporting…';
  try { $('exInfo').textContent = 'Saved: ' + await doExport(); } catch (err) { console.warn(err); $('exInfo').textContent = 'Export failed: ' + err.message; }
});
$('saveProj').onclick = () => download(new Blob([JSON.stringify({ app: 'wayland-forge', version: 1, state: S }, null, 1)], { type: 'application/json' }), 'wayland-forge-project.json');
$('loadProj').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return; e.target.value = '';
  try { const j = JSON.parse(await file.text()); if (!j.state || !Array.isArray(j.state.layers)) throw new Error('Not a Wayland Forge project'); S = sanitize(j.state); fixSel(); update(); commit(); }
  catch (err) { alert('Could not load project: ' + err.message); }
});

// ---------- panel: accordion, presets, mobile sheet ----------
const secs = [...document.querySelectorAll('aside details')];
function openSec(id) { secs.forEach(d => { d.open = d.id === id; }); }
secs.forEach(d => d.addEventListener('toggle', () => {
  if (!d.open) return;
  secs.forEach(o => { if (o !== d) o.open = false; }); // one open at a time (fallback for browsers without <details name>)
  try { localStorage.setItem('wf-open-section', d.id); } catch (e) { /* ignore */ }
}));
openSec((() => { try { return localStorage.getItem('wf-open-section'); } catch (e) { return null; } })() || 'sec-text');
if (!secs.some(d => d.open)) openSec('sec-text');
$('quickExport').onclick = () => $('exportBtn').click();
const PRESETS = { printify: { fmt: 'png' }, '100mm': { w: 100, h: 100, unit: 'mm' }, '4in': { w: 4, h: 4, unit: 'in' }, a4: { w: 210, h: 297, unit: 'mm' } };
$('exPreset').addEventListener('change', e => {
  const pr = PRESETS[e.target.value]; $('exPrintify').checked = e.target.value === 'printify';
  if (pr) { if (pr.fmt) $('exFmt').value = pr.fmt; if (pr.w) { $('exW').value = pr.w; $('exH').value = pr.h; $('exUnit').value = pr.unit; } }
  exportUI();
});
['exW', 'exH', 'exUnit'].forEach(id => $(id).addEventListener('input', () => { $('exPreset').value = ''; $('exPrintify').checked = false; exportUI(); }));
$('exFmt').addEventListener('change', () => { if ($('exFmt').value !== 'png' && $('exPrintify').checked) { $('exPreset').value = ''; $('exPrintify').checked = false; } exportUI(); });
function exportUI() {
  const png = $('exFmt').value === 'png', pf = $('exPrintify').checked;
  $('exDpi').disabled = !png || pf; ['exW', 'exH', 'exUnit', 'exBleed'].forEach(id => $(id).disabled = pf);
  $('exBleed').disabled = pf || $('exFmt').value === 'svg' && false;
}
exportUI();
const panel = $('panel');
// mobile sheet: snap points collapsed / small (~38%) / tall (~70%); stage re-fits above it
const isSheet = () => matchMedia('(max-width:820px) and (orientation:portrait)').matches;
const SNAPS = { collapsed: () => 34, small: () => innerHeight * 0.38, tall: () => innerHeight * 0.70 };
function fitView() { view = { x: -40, y: -40, w: 1080, h: 1080 }; render(); }
function setSnap(name) {
  panel.dataset.snap = name; panel.style.setProperty('--sheet', name === 'small' ? '38dvh' : name === 'tall' ? '70dvh' : '34px');
  if (name === 'collapsed') panel.scrollTop = 0;
  $('panelToggle').setAttribute('aria-expanded', name !== 'collapsed'); fitView();
}
const setSheet = open => setSnap(open ? 'small' : 'collapsed');
panel.addEventListener('click', e => { if (isSheet() && panel.dataset.snap === 'collapsed' && !e.target.closest('#sheetHandle')) setSnap('small'); });
$('panelToggle').onclick = () => setSheet(panel.dataset.snap === 'collapsed');
(() => {
  const hd = $('sheetHandle'); let st = null;
  hd.addEventListener('pointerdown', e => { if (!isSheet()) return; hd.setPointerCapture(e.pointerId); st = { y: e.clientY, h: panel.getBoundingClientRect().height, moved: false }; panel.classList.add('dragging'); });
  hd.addEventListener('pointermove', e => {
    if (!st) return; const dy = st.y - e.clientY; if (Math.abs(dy) > 4) st.moved = true; if (!st.moved) return;
    panel.style.setProperty('--sheet', Math.max(34, Math.min(innerHeight * 0.8, st.h + dy)) + 'px');
  });
  const end = () => {
    if (!st) return; panel.classList.remove('dragging');
    const order = ['collapsed', 'small', 'tall'];
    if (!st.moved) setSnap(order[(order.indexOf(panel.dataset.snap) + 1) % 3]);
    else { const h = panel.getBoundingClientRect().height; setSnap(order.reduce((a, n) => Math.abs(SNAPS[n]() - h) < Math.abs(SNAPS[a]() - h) ? n : a, 'small')); }
    st = null;
  };
  hd.addEventListener('pointerup', end); hd.addEventListener('pointercancel', end);
  hd.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const o = ['collapsed', 'small', 'tall']; setSnap(o[(o.indexOf(panel.dataset.snap) + 1) % 3]); } });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fitView, 120); });
})();

// ---------- install / offline ----------
let deferred = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('installBtn').hidden = false; });
$('installBtn').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('installBtn').hidden = true; };
window.addEventListener('appinstalled', () => { $('installBtn').hidden = true; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW failed', err)));

// ---------- boot ----------
window.WF = { get sel() { return sel; }, mode, procImage, get state() { return S; }, set state(v) { S = sanitize(v); fixSel(); update(); commit(); }, exportSVG, layoutLayer, doExport, update, maxInnerGap };
(async () => {
  await Promise.all(FONTS.map(async ([name, file]) => { const buf = window.WF_FONTS ? Uint8Array.from(atob(window.WF_FONTS[file]), c => c.charCodeAt(0)).buffer : await (await fetch('fonts/' + file)).arrayBuffer(); fonts[name] = opentype.parse(buf); }));
  try { const saved = JSON.parse(localStorage.getItem(STORE) || 'null'); if (saved && Array.isArray(saved.layers)) { S = sanitize(saved); fixSel(); } } catch (e) { /* ignore bad autosave */ }
  $('loading').remove(); update(); commit();
  document.body.dataset.ready = '1';
})().catch(err => { $('loading').textContent = 'Failed to load fonts: ' + err.message; console.error(err); });
})();
