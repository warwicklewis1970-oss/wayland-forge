/* Wayland Forge — text-on-path badge maker with true vector export. */
'use strict';
(() => {
const FONTS = [
  ['Cinzel', 'Cinzelwght.ttf', 'Classic'], ['Playfair Display', 'PlayfairDisplaywght.ttf', 'Classic'], ['Oswald', 'Oswaldwght.ttf', 'Classic'],
  ['Bebas Neue', 'BebasNeue-Regular.ttf', 'Classic'], ['Alfa Slab One', 'AlfaSlabOne-Regular.ttf', 'Classic'], ['Rye', 'Rye-Regular.ttf', 'Classic'],
  ['Pirata One', 'PirataOne-Regular.ttf', 'Classic'], ['Metal Mania', 'MetalMania-Regular.ttf', 'Classic'],
  ['Mountains of Christmas', 'MountainsofChristmas-Bold-sub.ttf', 'Festive'], ['Berkshire Swash', 'BerkshireSwash-Regular-sub.ttf', 'Festive'], ['Emilys Candy', 'EmilysCandy-Regular-sub.ttf', 'Festive'],
  ['Great Vibes', 'GreatVibes-Regular-sub.ttf', 'Script & soft', 1], ['Dancing Script', 'DancingScript-sub.ttf', 'Script & soft', 1], ['Pacifico', 'Pacifico-Regular-sub.ttf', 'Script & soft', 1],
  ['Lobster', 'Lobster-Regular-sub.ttf', 'Script & soft', 1], ['Fredoka', 'Fredoka-sub.ttf', 'Script & soft']
];
const SCRIPT = new Set(FONTS.filter(f => f[3]).map(f => f[0]));
const C = 500, ART = 1000, STORE = 'wayland-forge-project-v1';
const fonts = {};
const $ = id => document.getElementById(id);
const f2 = n => Math.round(n * 100) / 100;
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// ---------- state ----------
const newLayer = (text, side) => ({ id: uid(), text, font: 'Cinzel', size: 70, color: '#1b1b1b', side, ring: 'between', offset: 0, spacing: 4, lift: 0, style: 'fill', letters: {} });
const baseDefaults = () => ({ shape: 'circle', rx: 400, ry: 400, sides: 6, points: 5, innerRatio: 0.55, dip: 0.45, corner: 14, smooth: 80, gap: 120, width: 8, stroke: '#1b1b1b', outer: true, inner: true, fillOn: false, fill: '#f4ede0', fillAbove: false });
const newShape = (name, base) => ({ id: uid(), name, visible: true, x: 0, y: 0, scale: 1, rot: 0, base: Object.assign(baseDefaults(), base || {}) });
const defaults = () => { const d = defaults0(); d.layers.forEach(l => { l.shape = d.shapes[0].id; }); return d; };
const defaults0 = () => ({
  bg: 'transparent', bgColor: '#ffffff',
  shapes: [newShape('Layer 1')],
  layers: [newLayer('WAYLAND FORGE', 'top'), newLayer('EST. 2026', 'bottom')],
  ornaments: [{ id: uid(), type: 'star', x: 160, y: 500, r: 22, rot: 0, color: '#1b1b1b' }, { id: uid(), type: 'star', x: 840, y: 500, r: 22, rot: 0, color: '#1b1b1b' }],
  images: [], laser: {},
  swatches: ['#1b1b1b', '#ffffff', '#e0a043', '#8b1e1e', '#1e4d8b', '#2f6b3a']
});
let S = defaults();
let sel = { layer: S.layers[0].id, shape: S.shapes[0].id, letters: [], orn: null, img: false };
let mode = { multi: false, pan: false };
const hist = { stack: [], i: -1 };

const curLayer = () => S.layers.find(l => l.id === sel.layer) || null;
// shape layers: each has its own base (shape settings) + position/scale/rotation; text layers belong to one shape
let CUR = null; // shape being drawn right now (null = the active one)
const curShape = () => S.shapes.find(s => s.id === sel.shape) || S.shapes[0];
const SB = () => (CUR || curShape()).base;
const shapeOf = L => S.shapes.find(s => s.id === L.shape) || S.shapes[0];
const withShape = (sh, fn) => { const p = CUR; CUR = sh; try { return fn(); } finally { CUR = p; } };
const shTr = sh => { const k = sh.scale || 1; if (!sh.x && !sh.y && !sh.rot && k === 1) return ''; return `translate(${f2(sh.x)} ${f2(sh.y)}) rotate(${f2(sh.rot)} ${C} ${C}) translate(${f2(C * (1 - k))} ${f2(C * (1 - k))}) scale(${k})`; };
const shPt = (sh, x, y) => { const k = sh.scale || 1, a = (sh.rot || 0) * Math.PI / 180, u = (x - C) * k, v = (y - C) * k; return { x: C + sh.x + u * Math.cos(a) - v * Math.sin(a), y: C + sh.y + u * Math.sin(a) + v * Math.cos(a) }; };
const wrapSh = (sh, inner) => { const t = shTr(sh); return t && inner ? `<g transform="${t}">${inner}</g>` : inner; };
const imgShape = () => S.shapes[0];
const IM = () => S.images.find(i => i.id === sel.slot) || null; // image layer being edited
const setIM = v => { const i = S.images.findIndex(x => x.id === sel.slot); if (!v) { if (i >= 0) S.images.splice(i, 1); return; } if (i >= 0) S.images[i] = v; else S.images.push(v); };
const imgName = im => esc(im.name || 'Image') + (im.behind ? ' · behind' : '') + (im.src ? '' : ' (empty)');
const CLIPS = ['clip', 'clipout', 'outside', 'outin', 'free'];
const clipOf = im => CLIPS.includes(im.clipMode) ? im.clipMode : (im.clip ? 'clip' : 'free');
const clipShapeOf = im => S.shapes.find(x => x.id === im.clipShape) || S.shapes[0];
// Clip outline for a picture: the chosen layer's line, at its inside edge (edge -1) or outside edge (+1) of the line width.
function clipEl(im, edge, attrs) { const sh = clipShapeOf(im); return withShape(sh, () => { const b = SB(), off = (im.clipLine === 'outer' ? 0 : -b.gap) + edge * b.width / 2, tr = shTr(sh);
  return shapeEl(off, (tr ? `transform="${tr}" ` : '') + (attrs || '')) || shapeEl(0, (tr ? `transform="${tr}" ` : '') + (attrs || '')); }); }
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
const FILLET = ['polygon', 'star', 'heart', 'aus', 'auss'];
// Stylised Australia: few points, big rounded corners, no Gulf/Bight notches, so text runs smoothly round it.
const AUSS = (() => { let P = [[142,-11],[145.2,-15.8],[148.5,-20.2],[152.5,-24.5],[153.6,-28.5],[151.8,-33.5],[149,-37.6],[144,-38.8],[139,-37.6],[133,-35],[126,-34.6],[119,-35.3],[115,-34],[113.6,-28],[114.2,-22.5],[118.5,-19.8],[123,-16.5],[126.5,-13.8],[131,-11.6],[136.5,-11.4]];
  for (let it = 0; it < 3; it++) { const Q = []; P.forEach((p, i) => { const q = P[(i + 1) % P.length]; Q.push([.75 * p[0] + .25 * q[0], .75 * p[1] + .25 * q[1]], [.25 * p[0] + .75 * q[0], .25 * p[1] + .75 * q[1]]); }); P = Q; } return P; })(); // Chaikin-smoothed
// Australia (simplified mainland, clockwise from Cape York) + Tasmania, as lon/lat.
const AUS = [[142.5,-10.7],[143.5,-14],[145.4,-15],[146,-18.5],[149,-21],[151,-23.5],[153.2,-25.5],[153.6,-28.5],[153,-31.5],[151.3,-33.8],[150,-37.5],[147.5,-38],[146.3,-39.1],[144.5,-38.3],[141,-38.1],[139.7,-37.2],[138,-35.6],[138.1,-34.1],[137.5,-35.1],[137.4,-34],[137.8,-33],[135.9,-34.8],[134.2,-32.7],[131.2,-31.5],[126,-32.3],[123.6,-33.9],[118,-35],[115,-34.3],[115.7,-32],[115,-29.5],[113.5,-26],[113.7,-22.5],[116.8,-20.6],[121,-19.5],[122.2,-17.5],[125,-14.5],[127.5,-14],[129.5,-15],[130.2,-12.5],[132.5,-11.2],[136,-12],[135.7,-14],[137.7,-16.2],[140.8,-17.5],[141.6,-13]];
const TAS = [[144.6,-40.7],[148.3,-40.9],[148,-43.2],[146.8,-43.6],[145.2,-42.2]];
const ausXY = ([lo, la]) => [(lo - 133.5) / 20.5, (-la - 27.2) / 16.6];
function tasD(d) { const b = SB(); if (b.shape === 'auss') { if (d < -Math.max(b.width, 4)) return ''; const r = Math.max(2, 0.075 * b.rx + d), cx = C + 0.62 * b.rx, cy = C + 0.86 * b.ry; return `M${f2(cx - r)} ${f2(cy)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`; }
  if (b.shape !== 'aus' || d < -Math.max(b.width, 4)) return '';
  const P = TAS.map(q => { const [x, y] = ausXY(q); return [C + b.rx * x, C + b.ry * y]; }), cx = P.reduce((a, q) => a + q[0], 0) / P.length, cy = P.reduce((a, q) => a + q[1], 0) / P.length;
  const r = Math.max(...P.map(q => Math.hypot(q[0] - cx, q[1] - cy))), k = Math.max(0.2, 1 + d / r);
  return 'M' + P.map(q => `${f2(cx + (q[0] - cx) * k)} ${f2(cy + (q[1] - cy) * k)}`).join('L') + 'Z'; }
const P2 = (x, y) => ({ x, y });
function shapeVerts() {
  const b = SB(), rx = b.rx, ry = b.ry, V = [], R = [], fixed = [], cr = b.corner || 0;
  if (b.shape === 'polygon' || b.shape === 'star') {
    const star = b.shape === 'star', n = star ? b.points * 2 : b.sides;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n, k = star && i % 2 ? b.innerRatio : 1;
      V.push(P2(C + rx * k * Math.cos(a), C + ry * k * Math.sin(a))); R.push(cr); fixed.push(false);
    }
    return { V, R, fixed };
  }
  if (b.shape === 'auss') { for (const q of AUSS) { const [x, y] = ausXY(q); V.push(P2(C + rx * x, C + ry * y)); R.push(Math.min(cr, 4)); fixed.push(false); } return { V, R, fixed }; }
  if (b.shape === 'aus') { for (const q of AUS) { const [x, y] = ausXY(q); V.push(P2(C + rx * x, C + ry * y)); R.push(Math.min(cr, 6)); fixed.push(false); } return { V, R, fixed }; }
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
function baseGeo() { const key = JSON.stringify(SB()); if (geoCache.key !== key) geoCache = { key, G: shapeVerts() }; return geoCache.G; }
function maxInnerGap() { if (!FILLET.includes(SB().shape)) return Infinity; return -safeOffset(baseGeo(), -2000, 0).d; }
function ringPts(d, text) {
  const b = SB();
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
  const b = SB();
  if (FILLET.includes(b.shape)) { const r = safeOffset(baseGeo(), d, 0); return `<path d="${filletD(r.g)}${tasD(d)}" ${attrs}/>`; }
  const rx = b.rx + d, ry = (b.shape === 'circle' ? b.rx : b.ry) + d;
  if (rx <= 0 || ry <= 0) return '';
  return `<ellipse cx="${C}" cy="${C}" rx="${f2(rx)}" ry="${f2(ry)}" ${attrs}/>`;
}
// Lay a text layer's glyph outlines along the ring.
function layoutLayer(Ly) { return withShape(shapeOf(Ly), () => layoutLayer0(Ly)); }
function layoutLayer0(Ly) {
  const f = fonts[Ly.font]; if (!f || !Ly.text) return [];
  const sc = Ly.size / f.unitsPerEm, cap = ((f.tables.os2 && f.tables.os2.sCapHeight) || f.unitsPerEm * 0.7) * sc;
  const b = SB(), m = b.width / 2 + 10, gap = Math.min(b.gap, maxInnerGap());
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

// ---- Xmas & music ornaments: closed paths in units of r, centred on 0,0 ----
const ORN_TYPES = ['star', 'dot', 'holly1', 'holly2', 'note', 'notes'];
const ORN_R = { star: 26, dot: 10, holly1: 30, holly2: 34, note: 26, notes: 30 };
function leafPts(len, wid, k) { // spiky holly leaf along +x from 0 to len
  const P = [[0, 0]], top = [], bot = [];
  for (let i = 1; i <= k; i++) { const u = i / (k + 1), w = wid * Math.sin(Math.PI * u) ** 0.7; top.push([u * len, w * 1.12, (u - 0.5 / (k + 1)) * len, w * 0.55]); }
  return { top, len };
}
function leafD(len, wid, cx, cy, ang, vein) {
  const k = 4, c = Math.cos(ang), s = Math.sin(ang), T = (x, y) => f2(cx + x * c - y * s) + ' ' + f2(cy + x * s + y * c);
  const w = u => wid * Math.pow(Math.sin(Math.PI * u), 0.75);
  let d = `M${T(0, 0)}`;
  for (const sg of [1, -1]) {
    const us = []; for (let i = 1; i <= k; i++) us.push(i / (k + 1)); us.push(1);
    let prev = 0; const seq = sg === 1 ? us : us.slice(0, -1).reverse().concat([0]);
    if (sg === 1) { for (const u of seq) { const m = (prev + u) / 2; const tip = u === 1 ? [len, 0] : [u * len, sg * w(u) * 1.15]; d += ` Q${T(m * len, sg * w(m) * 0.55)} ${T(tip[0], tip[1])}`; prev = u; } }
    else { prev = 1; for (const u of seq) { const m = (prev + u) / 2; const tip = u === 0 ? [0, 0] : [u * len, sg * w(u) * 1.15]; d += ` Q${T(m * len, sg * w(m) * 0.55)} ${T(tip[0], tip[1])}`; prev = u; } }
  }
  d += 'Z';
  if (vein) { const a = len * 0.12, b = len * 0.86, h = Math.max(wid * 0.07, 0.6); d += ` M${T(a, 0)} Q${T((a + b) / 2, h)} ${T(b, 0)} Q${T((a + b) / 2, -h)} ${T(a, 0)}Z`; }
  return d;
}
const circD = (x, y, r) => `M${f2(x - r)} ${f2(y)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;
const ellD = (x, y, rx, ry, a) => { const c = Math.cos(a), s = Math.sin(a); return `M${f2(x - rx * c)} ${f2(y - rx * s)}A${f2(rx)} ${f2(ry)} ${f2(a * 180 / Math.PI)} 1 0 ${f2(x + rx * c)} ${f2(y + rx * s)}A${f2(rx)} ${f2(ry)} ${f2(a * 180 / Math.PI)} 1 0 ${f2(x - rx * c)} ${f2(y - rx * s)}Z`; };
// returns {body, berries} path data
function ornParts(o) {
  const r = o.r, D = Math.PI / 180;
  if (o.type === 'holly1') return { body: leafD(r * 1.9, r * 0.42, -r * 0.75, r * 0.55, -35 * D, true), berries: circD(-r * 0.62, r * 0.62, r * 0.24) };
  if (o.type === 'holly2') return { body: leafD(r * 1.5, r * 0.36, -r * 0.08, r * 0.35, -150 * D, true) + leafD(r * 1.5, r * 0.36, r * 0.08, r * 0.35, -30 * D, true), berries: circD(-r * 0.2, r * 0.5, r * 0.2) + circD(r * 0.2, r * 0.5, r * 0.2) + circD(0, r * 0.82, r * 0.2) };
  if (o.type === 'note') { const hx = -r * 0.3, hy = r * 0.62, sw = r * 0.11, sx = hx + r * 0.36; return { body: ellD(hx, hy, r * 0.42, r * 0.3, -22 * D) + `M${f2(sx - sw)} ${f2(hy - r * 0.05)}L${f2(sx - sw)} ${f2(-r)}L${f2(sx)} ${f2(-r)}C${f2(sx + r * 0.1)} ${f2(-r * 0.6)} ${f2(sx + r * 0.75)} ${f2(-r * 0.45)} ${f2(sx + r * 0.45)} ${f2(r * 0.15)}C${f2(sx + r * 0.55)} ${f2(-r * 0.3)} ${f2(sx + r * 0.2)} ${f2(-r * 0.45)} ${f2(sx)} ${f2(-r * 0.55)}L${f2(sx)} ${f2(hy - r * 0.05)}Z`, berries: '' }; }
  if (o.type === 'notes') { const sw = r * 0.11, b = r * 0.22, H = []; let d = ''; for (const [hx, hy] of [[-r * 0.62, r * 0.7], [r * 0.48, r * 0.5]]) { d += ellD(hx, hy, r * 0.34, r * 0.25, -22 * D); H.push([hx + r * 0.29, hy]); } const [a, c] = H, ya = -r * 0.75, yc = -r * 0.95; d += `M${f2(a[0] - sw)} ${f2(a[1] - r * 0.05)}L${f2(a[0] - sw)} ${f2(ya)}L${f2(c[0])} ${f2(yc)}L${f2(c[0])} ${f2(c[1] - r * 0.05)}L${f2(c[0] - sw)} ${f2(c[1] - r * 0.05)}L${f2(c[0] - sw)} ${f2(yc + b)}L${f2(a[0])} ${f2(ya + b)}L${f2(a[0])} ${f2(a[1] - r * 0.05)}Z`; return { body: d, berries: '' }; }
  return null;
}
function ornSvg(o, pic) { // inner markup for one ornament; pic=false => single fill inherited
  if (o.type === 'star') return `<path d="${starD(o.r)}"/>`;
  if (o.type === 'dot') return `<circle r="${o.r}"/>`;
  const p = ornParts(o); if (!p) return '';
  return `<path fill-rule="evenodd" d="${p.body}"/>` + (p.berries ? `<path d="${p.berries}"${pic && o.color2 ? ` fill="${o.color2}"` : ''}/>` : '');
}
function starD(r) {
  let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; d += (i ? 'L' : 'M') + f2(rr * Math.cos(a)) + ' ' + f2(rr * Math.sin(a)); }
  return d + 'Z';
}


// ---------- centre image: silhouette + vector trace ----------
function imgDefaults() { return { mode: 'orig', removeBg: false, tol: 60, flood: true, whiteLvl: 255, bgMode: 'light', threshold: 128, smooth: 2, invert: false, color: '#1a1410' }; }
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
  if (im.mode === 'orig' && !im.removeBg && !(im.whiteLvl < 255)) return null;
  const key = im.mode === 'orig' ? ['o', im.removeBg, im.tol, im.flood, im.whiteLvl] : im.mode === 'sil' ? ['s', im.bgMode, im.threshold, im.smooth, im.invert, im.color] : ['t', im.bgMode, im.threshold, im.smooth, im.invert];
  const ck = srcKey(im.src) + '|' + key.join('|'); if (procCache.has(ck)) return procCache.get(ck);
  const el = loadedImg(im.src); if (!el) return null;
  let res;
  try {
    if (im.mode === 'orig') { // colour-preserving background removal: corners give the background colour
      const g = grab(el, 1600), d = g.id.data, W = g.w, H = g.h, cs = [0, W - 1, (H - 1) * W, H * W - 1].map(i => i * 4), bg = [0, 1, 2].map(c => cs.reduce((a, p) => a + d[p + c], 0) / 4);
      const dst = p => Math.hypot(d[p] - bg[0], d[p + 1] - bg[1], d[p + 2] - bg[2]), wl = im.whiteLvl < 255 ? im.whiteLvl : 999;
      if (im.removeBg && im.flood !== false) { // flood-fill from the edges: only background touching the border goes, light parts inside the subject stay
        const seen = new Uint8Array(W * H), q = []; for (let x = 0; x < W; x++) q.push(x, (H - 1) * W + x); for (let y = 0; y < H; y++) q.push(y * W, y * W + W - 1);
        while (q.length) { const i = q.pop(); if (seen[i]) continue; seen[i] = 1; const p = i * 4, dist = dst(p); if (dist >= im.tol * 1.3) continue;
          d[p + 3] = dist < im.tol ? 0 : Math.round(d[p + 3] * (dist - im.tol) / (im.tol * 0.3)); if (dist >= im.tol) continue; const x = i % W;
          if (x > 0) q.push(i - 1); if (x < W - 1) q.push(i + 1); if (i >= W) q.push(i - W); if (i < W * (H - 1)) q.push(i + W); } }
      else if (im.removeBg) for (let p = 0; p < d.length; p += 4) { const dist = dst(p); if (dist < im.tol) d[p + 3] = 0; else if (dist < im.tol * 1.3) d[p + 3] = Math.round(d[p + 3] * (dist - im.tol) / (im.tol * 0.3)); }
      if (wl < 999) for (let p = 0; p < d.length; p += 4) if (0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2] >= wl) d[p + 3] = 0; // "background to white": light greys become blank (white on the laser)
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


// ---------- centre image: clip geometry + fit/fill ----------
// Inner-line geometry (identical to the drawn inner line), used whether or not the inner line is drawn.
function innerClipEl(tr) { return withShape(imgShape(), () => { const a = tr ? `transform="${tr}"` : ''; return shapeEl(-SB().gap, a) || shapeEl(0, a); }); } // exactly the drawn inner line
function imgAspect(im) { // content width/height of the image as drawn (meet inside the size×size box)
  const pr = procImage(im); if (pr && pr.paths) return pr.w / pr.h;
  const el = loadedImg(im.src); return el ? el.naturalWidth / el.naturalHeight : 1;
}
function innerProbe() { // temporary SVG path of the inner line for hit testing
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('visibility', 'hidden');
  g.innerHTML = innerClipEl(); stage.appendChild(g); const el = g.firstElementChild; return { el, bb: el.getBBox(), done: () => g.remove() };
}
// Largest image (keeping aspect) that sits entirely inside the inner line; returns {x,y,size}.
function fitInside(im) { return mapImg(fitInside0(im)); }
function fillInner(im) { return mapImg(fillInner0(im)); }
function mapImg(r) { const sh = imgShape(), p = shPt(sh, r.x, r.y); return { x: f2(p.x), y: f2(p.y), size: Math.floor(r.size * (sh.scale || 1)) }; }
function fitInside0(im) {
  const a = imgAspect(im), P = innerProbe(), bb = P.bb, sv = stage;
  const pt = sv.createSVGPoint(), inside = (x, y) => { pt.x = x; pt.y = y; return P.el.isPointInFill(pt); };
  const ok = (cx, cy, s) => { const w = a >= 1 ? s : s * a, h = a >= 1 ? s / a : s, n = 24;
    for (let i = 0; i <= n; i++) { const t = i / n, x = cx - w / 2 + w * t, y = cy - h / 2 + h * t;
      if (!inside(x, cy - h / 2) || !inside(x, cy + h / 2) || !inside(cx - w / 2, y) || !inside(cx + w / 2, y)) return false; }
    return true; };
  let best = { x: C, y: C, size: 40 };
  const cx = bb.x + bb.width / 2;
  for (let k = -6; k <= 6; k++) { const cy = bb.y + bb.height / 2 + k * bb.height / 30; if (!inside(cx, cy)) continue;
    let lo = 0, hi = Math.max(bb.width, bb.height) * Math.max(a, 1 / a);
    for (let it = 0; it < 22; it++) { const m = (lo + hi) / 2; if (ok(cx, cy, m)) lo = m; else hi = m; }
    if (lo > best.size) best = { x: cx, y: cy, size: lo }; }
  P.done(); best.size = Math.floor(best.size * 0.97); return best; // small margin off the line
}
// Smallest image that covers the whole inner shape (so the clip crops it neatly to the line).
function fillInner0(im) {
  const a = imgAspect(im), P = innerProbe(), bb = P.bb; P.done();
  const s = Math.ceil(Math.max(bb.width, bb.height, a >= 1 ? bb.height * a : bb.width / a) + 4);
  return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, size: s };
}

// ---------- SVG builder (shared by editor and exports) ----------
function imgWrap(im, el, cid) { const m = clipOf(im);
  if (m === 'clip' || m === 'clipout') return `<defs><clipPath id="${cid}" clipPathUnits="userSpaceOnUse">${clipEl(im, m === 'clip' ? -1 : 1)}</clipPath></defs><g clip-path="url(#${cid})">${el}</g>`;
  if (m === 'outside' || m === 'outin') return `<defs><mask id="${cid}" maskUnits="userSpaceOnUse" x="-6000" y="-6000" width="13000" height="13000"><rect x="-6000" y="-6000" width="13000" height="13000" fill="#fff"/>${clipEl(im, m === 'outside' ? 1 : -1, 'fill="#000"')}</mask></defs><g mask="url(#${cid})">${el}</g>`;
  return el; }
function imgArt(im, editor) { const slot = im.id;
  const pr = procImage(im), ek = editor ? ` data-k="img" data-slot="${slot}"` : '', cid = (editor ? 'wfclip-ed' : 'wfclip-ex') + slot; let el;
  if (pr && pr.paths) { const k = im.size / Math.max(pr.w, pr.h), x0 = im.x - pr.w * k / 2, y0 = im.y - pr.h * k / 2;
    el = `<g transform="translate(${f2(x0)} ${f2(y0)}) scale(${+k.toFixed(5)})" fill="${im.color}" fill-rule="evenodd"${ek}>` +
      (editor ? `<rect width="${pr.w}" height="${pr.h}" fill="none" pointer-events="all"/>` : '') + pr.paths.map(d => `<path d="${d}"/>`).join('') + '</g>';
  } else el = `<image href="${esc(pr && pr.url ? pr.url : im.src)}" x="${f2(im.x - im.size / 2)}" y="${f2(im.y - im.size / 2)}" width="${im.size}" height="${im.size}" preserveAspectRatio="xMidYMid meet"${ek}/>`;
  let o = imgWrap(im, el, cid);
  if (editor && sel.img && sel.slot === slot) o += `<rect x="${im.x - im.size / 2}" y="${im.y - im.size / 2}" width="${im.size}" height="${im.size}" fill="none" stroke="#e0a043" stroke-dasharray="8 6" stroke-width="2" pointer-events="none"/>`;
  return o; }
function buildArt(editor) {
  const out = [], vis = S.shapes.filter(s => s.visible !== false);
  const fills = above => { for (const sh of vis) withShape(sh, () => { const b = sh.base; if (b.fillOn && !!b.fillAbove === above) out.push(wrapSh(sh, shapeEl(0, `fill="${b.fill}"`))); }); };
  const imgs = S.images.filter(i => i.src && i.visible !== false);
  imgs.filter(i => i.behind).forEach(i => out.push(imgArt(i, editor))); // background image layers: behind everything
  fills(false);
  imgs.filter(i => !i.behind).forEach(i => out.push(imgArt(i, editor)));
  fills(true); // fills set to "draw above image" (e.g. a band behind text over the photo)
  for (const sh of vis) withShape(sh, () => {
    const b = sh.base, part = [];
    if (b.width > 0) {
      const st = `fill="none" stroke="${b.stroke}" stroke-width="${b.width}"`;
      if (b.outer) part.push(shapeEl(0, st));
      if (b.inner) part.push(shapeEl(-b.gap, st));
    }
    if (editor) { // fat invisible strokes: tap a line to pick (and drag) this layer
      const hs = `fill="none" stroke="transparent" stroke-width="${Math.max(26, b.width + 16)}" pointer-events="stroke" data-k="sh" data-id="${sh.id}"`;
      part.push(shapeEl(0, hs)); if (b.inner) part.push(shapeEl(-b.gap, hs));
      if (S.shapes.length > 1 && sh === curShape()) part.push(shapeEl(0, 'fill="none" stroke="#e0a043" stroke-width="2" stroke-dasharray="10 7" vector-effect="non-scaling-stroke" pointer-events="none"'));
    }
    for (const L of S.layers) if (shapeOf(L) === sh) part.push(textEl(L, editor));
    out.push(wrapSh(sh, part.join('')));
  });
  for (const o of S.ornaments) {
    const shape = ornSvg(o, true);
    out.push(`<g transform="translate(${f2(o.x)} ${f2(o.y)}) rotate(${o.rot})${o.flip ? ' scale(-1 1)' : ''}" fill="${o.color}"${editor ? ` data-k="orn" data-id="${o.id}"` : ''}>${shape}${editor && sel.orn === o.id ? `<circle r="${o.r * (o.type === 'star' || o.type === 'dot' ? 1 : 1.15) + 8}" fill="none" stroke="#e0a043" stroke-dasharray="6 4" stroke-width="2"/>` : ''}</g>`);
  }
  return out.join('\n');
}
function textEl(L, editor) {
  {
    const g = layoutLayer(L).map(q => {
      if (!editor) return `<path d="${q.d}" transform="${q.tr}"/>`;
      const hi = isSel(L.id, q.i), at = ` data-k="ch" data-l="${L.id}" data-i="${q.i}"`, bb = q.bb, pd = 6;
      // transparent bbox hit-rect: thin strokes, counters and gaps between strokes all grab the letter
      const hit = bb ? `<rect data-hit="1"${at} x="${f2(bb.x1 - pd)}" y="${f2(bb.y1 - pd)}" width="${f2(bb.x2 - bb.x1 + 2 * pd)}" height="${f2(bb.y2 - bb.y1 + 2 * pd)}" pointer-events="all" ${hi ? 'fill="#e0a043" fill-opacity="0.18" stroke="#e0a043" stroke-width="1.5" stroke-dasharray="4 3"' : 'fill="none"'}/>` : '';
      return `<g transform="${q.tr}"><path d="${q.d}"${at}${hi ? ' stroke="#e0a043" stroke-width="3"' : ''}/>${hit}</g>`;
    }).join('');
    return L.style === 'hollow' ? `<g fill="none" stroke="${L.color}" stroke-width="2.5" stroke-linejoin="round">${g}</g>` : `<g fill="${L.color}">${g}</g>`;
  }
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

// ---- ornament movement: linked mirror pairs + follow-a-path ----
const pathCache = new Map();
function pathSamples(shId, which) { // closed polyline of the chosen line, clockwise from the top, in art coords
  const sh = S.shapes.find(x => x.id === shId) || S.shapes[0]; const key = JSON.stringify([sh.x, sh.y, sh.scale, sh.rot, sh.base, which]);
  if (pathCache.has(key)) return pathCache.get(key);
  const gap = sh.base.gap, off = which === 'inner' ? -gap : which === 'mid' ? -gap / 2 : 0;
  const el = withShape(sh, () => shapeEl(off, ''));
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'; svg.innerHTML = el || ''; document.body.appendChild(svg);
  let g = svg.firstElementChild, P = [];
  if (g) { if (g.tagName === 'ellipse') { const cx = +g.getAttribute('cx'), cy = +g.getAttribute('cy'), rx = +g.getAttribute('rx'), ry = +g.getAttribute('ry'); for (let i = 0; i < 720; i++) { const a = i / 720 * 2 * Math.PI; P.push([cx + rx * Math.sin(a), cy - ry * Math.cos(a)]); } }
    else { const L = g.getTotalLength(); for (let i = 0; i < 720; i++) { const q = g.getPointAtLength(L * i / 720); P.push([q.x, q.y]); } } }
  svg.remove();
  P = P.map(([x, y]) => { const q = shPt(sh, x, y); return [q.x, q.y]; });
  if (P.length) { let A = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; A += a[0] * b[1] - b[0] * a[1]; } if (A < 0) P.reverse();
    const cx = C + (sh.x || 0); let bi = 0, bv = Infinity; P.forEach(([x, y], i) => { const v = Math.abs(x - cx) * 3 + y; if (v < bv) { bv = v; bi = i; } }); P = P.slice(bi).concat(P.slice(0, bi)); }
  // re-sample evenly by length
  const cum = [0]; for (let i = 1; i <= P.length; i++) { const a = P[i - 1], b = P[i % P.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const res = { P, cum, len: cum[cum.length - 1] || 1 }; pathCache.set(key, res); if (pathCache.size > 60) pathCache.delete(pathCache.keys().next().value); return res;
}
function pathAt(ps, t) { // t in degrees -180..180 (0 = top, clockwise)
  const { P, cum, len } = ps; if (!P.length) return null; let L = ((t / 360) % 1 + 1) % 1 * len, i = 0; while (i < P.length - 1 && cum[i + 1] < L) i++;
  const a = P[i], b = P[(i + 1) % P.length], k = (L - cum[i]) / ((cum[i + 1] - cum[i]) || 1), tx = b[0] - a[0], ty = b[1] - a[1], n = Math.hypot(tx, ty) || 1;
  return { x: a[0] + tx * k, y: a[1] + ty * k, tx: tx / n, ty: ty / n };
}
function pathNearest(ps, x, y) { let bi = 0, bv = Infinity; ps.P.forEach(([px, py], i) => { const v = (px - x) ** 2 + (py - y) ** 2; if (v < bv) { bv = v; bi = i; } }); let t = ps.cum[bi] / ps.len * 360; if (t > 180) t -= 360; return Math.round(t * 10) / 10; }
function applyFollow(o) { const f = o.follow; if (!f || !f.on) return; const q = pathAt(pathSamples(f.shape, f.path), f.t || 0); if (!q) return;
  o.x = f2(q.x + q.ty * (f.off || 0)); o.y = f2(q.y - q.tx * (f.off || 0)); if (f.turn) o.rot = Math.round(Math.atan2(q.ty, q.tx) * 180 / Math.PI * 10) / 10; }
const partnerOf = o => o && o.pair ? S.ornaments.find(x => x.id === o.pair && x.pair === o.id) || null : null;
function mirrorInto(o, p) { Object.assign(p, { x: f2(ART - o.x), y: o.y, rot: -o.rot, r: o.r, color: o.color, color2: o.color2, flip: !o.flip, type: o.type }); if (o.follow) p.follow = { ...o.follow, t: -(o.follow.t || 0) }; else delete p.follow; }
function syncOrns() { const done = new Set(), lead = curOrn();
  const order = lead ? [lead, ...S.ornaments.filter(x => x !== lead)] : S.ornaments;
  for (const o of order) { if (done.has(o.id)) continue; done.add(o.id); applyFollow(o); const p = partnerOf(o); if (p) { done.add(p.id); mirrorInto(o, p); } } }
function linkMirrors(list) { for (const o of list) { if (o.pair && !list.some(x => x.id === o.pair)) delete o.pair; }
  for (const o of list) { if (o.pair) continue; const p = list.find(x => x !== o && !x.pair && x.type === o.type && Math.abs(x.x - (ART - o.x)) < 0.6 && Math.abs(x.y - o.y) < 0.6 && x.r === o.r && Math.abs((x.rot || 0) + (o.rot || 0)) < 0.6 && Math.abs(o.x - C) > 0.6); if (p) { o.pair = p.id; p.pair = o.id; } } return list; }
function render() {
  const bgFill = S.bg === 'color' ? S.bgColor : 'none';
  syncOrns();
  stage.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  stage.innerHTML = `<rect x="0" y="0" width="${ART}" height="${ART}" fill="${bgFill}" stroke="#6b5f50" stroke-dasharray="6 6" data-k="bg"/>` + buildArt(true) + laserOverlay();
  persist();
}
function syncUI() {
  document.querySelectorAll('[data-b]').forEach(el => {
    const [scope, key] = el.dataset.b.split('.'); const o = target(scope);
    el.disabled = !o; if (!o) return;
    if (el.type === 'checkbox') el.checked = !!o[key]; else el.value = o[key];
    const out = el.nextElementSibling; if (out && out.tagName === 'OUTPUT') out.textContent = o[key];
  });
  const sh = SB().shape;
  document.querySelectorAll('[data-shapes]').forEach(e => e.hidden = !e.dataset.shapes.split(' ').includes(sh));
  const mg = maxInnerGap(); $('gapWarn').hidden = !(SB().gap > mg); $('gapWarn').textContent = `Ring gap limited to ${Math.floor(mg)} for this shape so the inner line can't fold over itself.`;
  const order = S.shapes.slice().reverse();
  $('shapeSel').innerHTML = order.map(s => `<option value="${s.id}"${s === curShape() ? ' selected' : ''}>${s.visible === false ? '🚫 ' : ''}${esc(s.name)} · ${s.base.shape}</option>`).join('');
  $('shapeVis').textContent = curShape().visible === false ? 'Show' : 'Hide'; $('shapeDel').disabled = S.shapes.length < 2;
  $('shapeUp').disabled = curShape() === S.shapes[S.shapes.length - 1]; $('shapeDown').disabled = curShape() === S.shapes[0];
  $('layerSel').innerHTML = S.layers.filter(l => shapeOf(l) === curShape()).map(l => `<option value="${l.id}"${l.id === sel.layer ? ' selected' : ''}>${esc(l.text || '(empty)')} · ${l.side}</option>`).join('');
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
  const im = IM(); if (im) document.querySelectorAll('[data-imgmodes]').forEach(e => e.hidden = !e.dataset.imgmodes.split(' ').includes(im.mode));
  if (im && im.mode === 'trace') { const pr = procImage(im); $('traceInfo').textContent = pr && pr.paths ? `Traced ${pr.paths.length} vector shape${pr.paths.length === 1 ? '' : 's'}; they export as true paths in SVG and PDF.` : 'Tracing…'; }
  const oc = curOrn(); if (oc) { const f = oc.follow || {}, fo = !!f.on;
    document.querySelectorAll('[data-op]').forEach(el => { const k = el.dataset.op, v = k === 'x' ? Math.round(oc.x - C) : k === 'y' ? Math.round(oc.y - C) : k === 't' ? Math.round(f.t || 0) : Math.round(f.off || 0); if (document.activeElement !== el) el.value = v; el.nextElementSibling.textContent = el.value; });
    $('ornFollow').checked = fo; $('ornFree').hidden = fo; $('ornPathF').hidden = !fo; $('ornTurn').checked = !!f.turn; $('ornPath').value = f.path || 'outer'; $('ornRotRow').hidden = fo && !!f.turn;
    $('ornShapeSel').innerHTML = S.shapes.map(x => `<option value="${x.id}">${x.name}</option>`).join(''); $('ornShapeSel').value = f.shape || S.shapes[0].id; $('ornShapeSel').parentElement.hidden = S.shapes.length < 2;
    const pr = partnerOf(oc); $('ornLink').hidden = !pr; $('mirrorOrn').hidden = !!pr; }
  $('ornFields').hidden = !curOrn(); $('ornBerry').hidden = !(curOrn() && /holly/.test(curOrn().type)); $('ornNone').hidden = !!curOrn() || !S.ornaments.length;
  $('imgFields').hidden = !IM(); $('imgClipRow').hidden = false; if (IM()) { const im = IM(); $('imgClipLine').innerHTML = S.shapes.map(x => ['inner', 'outer'].map(l => `<option value="${x.id}|${l}">${esc(x.name)} – ${l} line</option>`).join('')).join(''); $('imgClipLine').value = clipShapeOf(im).id + '|' + (im.clipLine || 'inner'); $('imgClipLine').parentElement.hidden = clipOf(im) === 'free'; } document.querySelectorAll('[data-slotbtn]').forEach(b => b.setAttribute('aria-pressed', String((sel.slot || 1) === +b.dataset.slotbtn)));
  $('imgSel').innerHTML = S.images.length ? S.images.slice().reverse().map(i => `<option value="${i.id}"${i.id === sel.slot ? ' selected' : ''}>${imgName(i)}</option>`).join('') : '<option value="">No image layers yet</option>';
  ['imgRen', 'imgUp', 'imgDown', 'delImg'].forEach(k => $(k).disabled = !IM()); $('imgUploadRow').hidden = !IM(); $('imgDepth').value = IM() && IM().behind ? 'behind' : 'front';
  $('imgSlotHint').textContent = !S.images.length ? 'Tap + Add image layer to add a picture, logo or map. You can add as many as you like.' : !IM() ? 'Pick an image layer above.' : (IM().behind ? 'This layer sits behind everything (good for a map). ' : 'This layer sits inside your design. ') + (IM().src ? '' : 'Tap Upload to choose its picture.');
  $('swatches').innerHTML = S.swatches.map(c => `<button style="background:${c}" data-c="${c}" title="${c}"></button>`).join('');
  laserUI(); if (curLayer()) $('fontSel').style.fontFamily = `'WF ${curLayer().font}'`;
  $('undoBtn').disabled = hist.i <= 0; $('redoBtn').disabled = hist.i >= hist.stack.length - 1;
}
function target(scope) {
  return scope === 'shape' ? curShape() : scope === 'base' ? SB() : scope === 'layer' ? curLayer() : scope === 'orn' ? curOrn() : scope === 'img' ? IM() : scope === 'doc' ? S : null;
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
  const st = { name: typeof o.name === 'string' ? o.name.slice(0, 60) : '', bg: o.bg === 'color' ? 'color' : 'transparent', bgColor: o.bgColor || d.bgColor,
    shapes: Array.isArray(o.shapes) && o.shapes.length ? o.shapes.map((x, i) => Object.assign(newShape('Layer ' + (i + 1)), x, { base: Object.assign(baseDefaults(), x.base || {}) })) : [newShape('Layer 1', o.base)], swatches: Array.isArray(o.swatches) ? o.swatches : d.swatches,
    layers: Array.isArray(o.layers) ? o.layers.map(l => Object.assign(newLayer('', 'top'), l)) : d.layers,
    ornaments: linkMirrors(Array.isArray(o.ornaments) ? o.ornaments.filter(x => x && ORN_TYPES.includes(x.type)) : d.ornaments),
    images: (Array.isArray(o.images) ? o.images : []).filter(x => x && x.src).map((x, i) => Object.assign(imgDefaults(), { id: uid(), name: 'Image ' + (i + 1) }, x)),
    laser: o.laser && typeof o.laser === 'object' ? Object.assign({}, o.laser) : {} };
  for (const sh of st.shapes) { if (!['circle', 'ellipse', 'polygon', 'star', 'heart', 'aus', 'auss'].includes(sh.base.shape)) sh.base.shape = 'circle'; ['x', 'y', 'rot'].forEach(k => { sh[k] = +sh[k] || 0; }); sh.scale = +sh.scale || 1; }
  if (!(Array.isArray(o.images) && o.images.some(x => x && x.src))) { // older projects: centre picture -> image layer 1, background picture -> image layer 2
    const lz = st.laser;
    [[o.image, 'img', 'Image 1', false], [o.image2, 'img2', 'Image 2 (map)', true]].forEach(([x, k, nm, bh]) => { if (!x || !x.src) return; const im = Object.assign(imgDefaults(), x, { id: uid(), name: nm, behind: bh }); st.images.push(im); if (lz[k]) { lz['img:' + im.id] = lz[k]; } delete lz[k]; });
    st.images.reverse(); st.images.sort((a, b) => b.behind - a.behind); }
  for (const im of st.images) { if (!CLIPS.includes(im.clipMode)) im.clipMode = im.clip ? 'clip' : 'free'; if (!im.clipLine) im.clipLine = 'inner'; }
  const ids = new Set(st.shapes.map(x => x.id)); st.layers.forEach(l => { if (!ids.has(l.shape)) l.shape = st.shapes[0].id; });
  return st; // anything else in old data (frames, templates, packs…) is dropped
}
function fixSel() {
  if (!S.shapes.some(s => s.id === sel.shape)) sel.shape = S.shapes[0].id;
  if (!curLayer() || shapeOf(curLayer()) !== curShape()) { const f = S.layers.find(l => shapeOf(l) === curShape()); sel.layer = f ? f.id : null; } if (!curOrn()) sel.orn = null; if (!IM()) { sel.img = false; sel.slot = S.images.length ? S.images[S.images.length - 1].id : null; } sel.letters = sel.letters.filter(s => { const L = S.layers.find(x => x.id === s.l); return L && s.i < L.text.length; }); }
// ---- projects: autosave "last session" + named projects kept in this browser ----
const PROJS = 'wayland-forge-projects-v1', META = 'wayland-forge-session-v1';
// ---- storage: IndexedDB (large quota) with an in-memory copy so reads stay instant ----
const KEYS = [STORE, META, PROJS], mem = {}; let idb = null, kvWarned = 0;
const idbReq = q => new Promise((ok, no) => { q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
async function kvLoad() {
  try { const q = indexedDB.open('wayland-forge', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv');
    idb = await idbReq(q);
    for (const k of KEYS) { const v = await idbReq(idb.transaction('kv').objectStore('kv').get(k)); if (v != null) mem[k] = v; }
    let moved = false; for (const k of KEYS) { const v = localStorage.getItem(k); if (v != null && mem[k] == null) { mem[k] = v; await kvPut(k, v); moved = true; } }
    if (moved) for (const k of KEYS) if (mem[k] != null && localStorage.getItem(k) != null) { const t = await idbReq(idb.transaction('kv').objectStore('kv').get(k)); if (t === mem[k]) localStorage.removeItem(k); }
  } catch (e) { console.warn('IndexedDB unavailable, using localStorage', e); idb = null; for (const k of KEYS) { const v = localStorage.getItem(k); if (v != null) mem[k] = v; } }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* */ }
}
function kvPut(k, v) { if (!idb) { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); return Promise.resolve(); }
  return new Promise((ok, no) => { const t = idb.transaction('kv', 'readwrite'); v == null ? t.objectStore('kv').delete(k) : t.objectStore('kv').put(v, k); t.oncomplete = ok; t.onerror = t.onabort = () => no(t.error); }); }
const kvGet = k => mem[k] == null ? null : mem[k];
function kvSet(k, v) { mem[k] = v; kvPut(k, v).catch(e => { console.warn(e); if (Date.now() - kvWarned > 20000) { kvWarned = Date.now(); alert('This device has run out of storage for Wayland Forge projects (' + mb(v.length) + ' needed). Your design is still open - use Download file in the Projects section to keep a copy, or delete old projects.'); } }); return true; }
function kvDel(k) { delete mem[k]; kvPut(k, null).catch(() => {}); }
const mb = n => (n / 1048576 < 0.1 ? '<0.1' : (n / 1048576).toFixed(1)) + ' MB';
let homeOpen = true, projId = null;
const readProjs = () => { try { const a = JSON.parse(kvGet(PROJS) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const writeProjs = a => { try { return kvSet(PROJS, JSON.stringify(a)); } catch (e) { alert('Not enough space in this browser to save the project (a large picture?). Use Download file instead.'); return false; } };
function saveNow() { nameBtnUI(); if (homeOpen) return; try { kvSet(STORE, JSON.stringify(S)); kvSet(META, JSON.stringify({ projId, t: Date.now() })); } catch (e) { /* storage full (large image) */ }
  if (projId) { const a = readProjs(), x = a.find(q => q.id === projId); if (x) { x.state = S; x.updated = Date.now(); writeProjs(a); } } }
let saveT; function persist() { if (homeOpen) return; clearTimeout(saveT); saveT = setTimeout(saveNow, 300); }

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
$('fontSel').innerHTML = [...new Set(FONTS.map(f => f[2]))].map(g => `<optgroup label="${g}">` + FONTS.filter(f => f[2] === g).map(f => `<option style="font-family:'WF ${f[0]}'">${f[0]}</option>`).join('') + '</optgroup>').join('');
$('fontSel').addEventListener('change', () => { const L = curLayer(); if (L && SCRIPT.has(L.font) && L.spacing > 0) { L.spacing = 0; update(); commit(); } $('fontSel').style.fontFamily = `'WF ${$('fontSel').value}'`; });
$('layerSel').addEventListener('change', e => { sel.layer = e.target.value; update(); });
const act = (id, fn) => $(id).addEventListener('click', () => { fn(); fixSel(); update(); commit(); });
act('addLayer', () => { const L = newLayer('NEW TEXT', 'top'); L.ring = 'outer'; L.shape = curShape().id; S.layers.push(L); sel.layer = L.id; });
act('delLayer', () => { S.layers = S.layers.filter(l => l.id !== sel.layer); });
act('dupOpp', () => { const L = curLayer(); if (!L) return; const c = JSON.parse(JSON.stringify(L)); c.id = uid(); c.side = L.side === 'top' ? 'bottom' : 'top'; c.offset = -L.offset; S.layers.push(c); sel.layer = c.id; });
act('resetLetter', () => { for (const s of sel.letters) { const L = S.layers.find(x => x.id === s.l); if (L) delete L.letters[s.i]; } });
act('resetLetters', () => { const L = curLayer(); if (L) L.letters = {}; });
const addOrn = type => { const o = { id: uid(), type, x: C, y: C, r: ORN_R[type] || 20, rot: 0, color: (type === 'holly1' || type === 'holly2') ? '#1f6b34' : SB().stroke, ...(type === 'holly1' || type === 'holly2' ? { color2: '#c0262d' } : {}) }; S.ornaments.push(o); sel.orn = o.id; };
act('addStar', () => addOrn('star')); act('addDot', () => addOrn('dot')); act('addHolly1', () => addOrn('holly1')); act('addHolly2', () => addOrn('holly2')); act('addNote', () => addOrn('note')); act('addNotes', () => addOrn('notes'));
act('mirrorOrn', () => { const o = curOrn(); if (!o) return; const c = { ...o, id: uid(), follow: o.follow ? { ...o.follow } : undefined }; if (Math.abs(o.x - C) < 1) o.x = C - 120; c.pair = o.id; o.pair = c.id; mirrorInto(o, c); S.ornaments.push(c); sel.orn = c.id; });
act('delOrn', () => { const p = partnerOf(curOrn()); if (p) delete p.pair; S.ornaments = S.ornaments.filter(o => o.id !== sel.orn); });
act('clearOrn', () => { S.ornaments = []; });
act('centreImg', () => { const im = IM(); if (im) { im.x = C; im.y = C; } });
act('fitImg', () => { const im = IM(); if (im) Object.assign(im, fitInside(im)); });
act('fillImg', () => { const im = IM(); if (im) Object.assign(im, fillInner(im), { clipMode: 'clip', clip: true }); });
$('imgClipLine').addEventListener('change', e => { const im = IM(); if (!im) return; const [id, l] = e.target.value.split('|'); im.clipShape = id; im.clipLine = l; update(); commit(); });
$('imgSel').addEventListener('change', e => { sel.slot = e.target.value; sel.img = !!(IM() && IM().src); sel.orn = null; sel.letters = []; update(); });
$('imgDepth').addEventListener('change', e => { const im = IM(); if (!im) return; im.behind = e.target.value === 'behind'; update(); commit(); });
function addImageLayer(behind) { const n = S.images.length + 1, im = Object.assign(imgDefaults(), { id: uid(), name: 'Image ' + n + (behind ? ' (map)' : ''), behind: !!behind, src: null });
  S.images.push(im); sel.slot = im.id; sel.img = false; sel.orn = null; sel.letters = []; $('addPicMenu').hidden = true; openSec('sec-img'); update(); commit(); $('imgFile').click(); }
$('addPicBtn').onclick = () => { $('addPicMenu').hidden = !$('addPicMenu').hidden; };
document.querySelectorAll('[data-addpicopen]').forEach(b => b.onclick = () => { $('addPicMenu').hidden = false; $('addPicMenu').scrollIntoView({ block: 'nearest' }); });
document.querySelectorAll('[data-addpic]').forEach(b => b.onclick = () => { const v = b.dataset.addpic; if (v === '0') { $('addPicMenu').hidden = true; return; } addImageLayer(v === '2'); });
act('imgRen', () => { const im = IM(); if (!im) return; const n = prompt('Name this image layer', im.name || ''); if (n) im.name = n.slice(0, 40); });
const imgMove = d => { const i = S.images.findIndex(x => x.id === sel.slot), j = i + d; if (i < 0 || j < 0 || j >= S.images.length) return; [S.images[i], S.images[j]] = [S.images[j], S.images[i]]; };
act('imgUp', () => imgMove(1)); act('imgDown', () => imgMove(-1));
act('delImg', () => { const im = IM(); if (!im) return; if (im.src && !confirm(`Delete image layer "${im.name || 'Image'}"?`)) return; setIM(null); sel.slot = null; });
act('addSwatch', () => { const c = $('swatchPick').value; if (!S.swatches.includes(c)) S.swatches.push(c); });
act('newProj', () => { if (confirm('Start a new design? (Your current one stays in Projects.)')) { archiveSession(); openState(defaults(), null); } });
function archiveSession() { // keep an unnamed last session so starting fresh never loses work
  try { const m = JSON.parse(kvGet(META) || '{}'), raw = kvGet(STORE); if (!raw || m.projId) return;
    const st = JSON.parse(raw), d = defaults(); if (JSON.stringify(st.layers.map(l => l.text)) === JSON.stringify(d.layers.map(l => l.text)) && !(st.images || []).length && !st.image && st.shapes && st.shapes.length === 1 && JSON.stringify(st.shapes[0].base) === JSON.stringify(d.shapes[0].base)) return;
    const a = readProjs(); a.unshift({ id: uid(), name: 'Untitled ' + new Date(m.t || Date.now()).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), updated: m.t || Date.now(), state: st }); writeProjs(a); kvSet(META, JSON.stringify({ projId: null, archived: true })); } catch (e) { /* ignore */ } }
function openState(st, id, keepLast) { if (!keepLast) archiveSession(); S = sanitize(st); projId = id; sel = { layer: null, shape: S.shapes[0].id, letters: [], orn: null, img: false }; fixSel(); hist.stack = []; hist.i = -1; closeHome(); update(); commit(); fitView(); saveNow(); }
const slug = t => (String(t || '').normalize('NFKD').replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('') || '').slice(0, 20);
function designName() { return projName() || S.name || ''; }
function nameBtnUI() { const b = $('nameBtn'); if (b) { const n = designName(); b.textContent = (n || 'Untitled') + ' ✎'; b.title = 'Design name (used for file names). Tap to rename.'; } }
function setDesignName(n) { n = String(n || '').trim().slice(0, 60); if (!n) return false;
  if (projId) { const a = readProjs(), x = a.find(q => q.id === projId); if (x) { x.name = n; x.updated = Date.now(); writeProjs(a); } }
  else { const a = readProjs(), id = uid(); a.unshift({ id, name: n, updated: Date.now(), state: S }); if (writeProjs(a)) projId = id; }
  S.name = n; saveNow(); return true; }
function fileBase() { let n = designName();
  if (!n) { const top = slug(S.layers[0] && S.layers[0].text) || 'MyBadge'; const a = prompt('Name this design (used for file names):', top); if (a == null) throw new Error('Export cancelled - no design name.'); setDesignName(slug(a) || top); n = designName(); }
  return slug(n) || 'MyBadge'; }
function projName() { const x = projId && readProjs().find(q => q.id === projId); return x ? x.name : null; }
$('nameBtn') && $('nameBtn').addEventListener('click', () => { const n = prompt('Design name (used for file names):', designName() || slug(S.layers[0] && S.layers[0].text) || 'MyBadge'); if (n != null && setDesignName(n)) toast('Name: ' + designName()); });
act('saveToProjects', () => { const n = projName(); if (n) { saveNow(); toast('Saved to Projects: ' + n); return; }
  const name = prompt('Name this project:', (S.layers[0] && S.layers[0].text) || 'My badge'); if (!name) return; const a = readProjs(), id = uid(); a.unshift({ id, name: name.trim().slice(0, 60), updated: Date.now(), state: S }); if (writeProjs(a)) { projId = id; saveNow(); toast('Saved to Projects: ' + name); } });
// ---- home / start screen ----
function showHome(view) { saveNow(); homeOpen = true; document.body.classList.add('home'); $('home').hidden = false; homeView(view || 'main'); }
function closeHome() { homeOpen = false; nameBtnUI(); document.body.classList.remove('home'); $('home').hidden = true; }
function homeView(v) { $('homeMain').hidden = v !== 'main'; $('homeProjs').hidden = v !== 'projs'; if (v === 'projs') listProjs(); }
const ago = t => { if (!t) return ''; const d = new Date(t); return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
function listProjs() { const a = readProjs(); let m = {}; try { m = JSON.parse(kvGet(META) || '{}'); } catch (e) { /* */ }
  const last = !m.projId && !m.archived && kvGet(STORE);
  const row = (id, name, t, extra) => `<li data-pid="${id}"><button class="po grow" data-pa="open"><b>${esc(name)}</b><span class="dim">${extra || ''}${ago(t)}</span></button>${id === 'last' ? '' : '<button data-pa="ren" title="Rename" aria-label="Rename">✎</button>'}<button data-pa="del" class="danger" title="Delete" aria-label="Delete">✕</button></li>`;
  const sz = x => JSON.stringify(x).length, tot = a.reduce((t, x) => t + sz(x.state), 0) + (last ? last.length : 0);
  const html = (last ? row('last', 'Last session', m.t, 'Not saved by name · ' + mb(last.length) + ' · ') : '') + a.map(x => row(x.id, x.name, x.updated, mb(sz(x.state)) + ' · ')).join('') + (a.length || last ? `<li class="hint">Total used: ${mb(tot)}${idb ? '' : ' (old storage, about 5 MB limit)'}</li>` : '');
  $('projList').innerHTML = html || '<li class="hint">No saved projects yet. Start a New design and tap <b>Save to Projects</b>.</li>'; }
$('projList').addEventListener('click', e => { const b = e.target.closest('[data-pa]'); if (!b) return; const id = b.closest('li').dataset.pid, a = readProjs(), x = a.find(q => q.id === id);
  if (b.dataset.pa === 'open') { if (id === 'last') { try { openState(JSON.parse(kvGet(STORE)), null, true); } catch (er) { alert('Could not open the last session.'); } } else if (x) openState(x.state, x.id); }
  else if (b.dataset.pa === 'ren' && x) { const n = prompt('Rename project:', x.name); if (n) { x.name = n.trim().slice(0, 60); writeProjs(a); listProjs(); } }
  else if (b.dataset.pa === 'del') { if (!confirm('Delete "' + (x ? x.name : 'Last session') + '"? This cannot be undone.')) return; if (id === 'last') { kvDel(STORE); kvDel(META); } else { writeProjs(a.filter(q => q.id !== id)); if (projId === id) projId = null; } listProjs(); } });
$('homeNew').onclick = () => { archiveSession(); openState(defaults(), null); window.dispatchEvent(new Event('wf-newdesign')); };
$('homeProjects').onclick = () => homeView('projs');
$('homeBack').onclick = () => homeView('main');
$('homeTour').onclick = () => { if (homeOpen && !$('homeTour').dataset.keep) { archiveSession(); openState(defaults(), null); } window.dispatchEvent(new Event('wf-tutorial')); };
$('homeLoad').addEventListener('change', e => { $('loadProj').files = e.target.files; $('loadProj').dispatchEvent(new Event('change')); });
$('homeBtn').onclick = () => showHome('main');
function toast(t) { let el = $('wfToast'); if (!el) { el = document.createElement('div'); el.id = 'wfToast'; document.body.appendChild(el); } el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 2200); }
// ---------- shape layers ----------
$('shapeSel').addEventListener('change', e => { sel.shape = e.target.value; sel.letters = []; fixSel(); update(); });
$('addShape').addEventListener('change', e => { const t = e.target.value; e.target.value = ''; if (!t) return;
  const sh = newShape('Layer ' + (S.shapes.length + 1), { shape: t, rx: 200, ry: t === 'circle' ? 200 : 160, gap: 70, width: 6 });
  S.shapes.push(sh); const L = newLayer('NEW TEXT', 'top'); L.size = 40; L.spacing = 2; L.shape = sh.id; S.layers.push(L);
  sel.shape = sh.id; sel.layer = L.id; sel.letters = []; fixSel(); update(); commit(); openSec('sec-shape'); });
act('shapeDup', () => { const o = curShape(), c = JSON.parse(JSON.stringify(o)); c.id = uid(); c.name = o.name + ' copy'; c.x = o.x + 40; c.y = o.y + 40;
  S.shapes.splice(S.shapes.indexOf(o) + 1, 0, c);
  S.layers.filter(l => shapeOf(l) === o).forEach(l => { const n = JSON.parse(JSON.stringify(l)); n.id = uid(); n.shape = c.id; S.layers.push(n); });
  sel.shape = c.id; sel.letters = []; });
act('shapeDel', () => { if (S.shapes.length < 2) return; const o = curShape(); if (!confirm(`Delete "${o.name}" and its text?`)) return;
  S.layers = S.layers.filter(l => shapeOf(l) !== o); S.shapes = S.shapes.filter(s => s !== o); sel.letters = []; });
act('shapeRen', () => { const o = curShape(), n = prompt('Name for this layer:', o.name); if (n && n.trim()) o.name = n.trim().slice(0, 30); });
act('shapeVis', () => { const o = curShape(); o.visible = o.visible === false; });
const moveShape = d => { const a = S.shapes, i = a.indexOf(curShape()), j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; };
act('shapeUp', () => moveShape(1)); act('shapeDown', () => moveShape(-1));
act('shapeCentre', () => { const o = curShape(); o.x = 0; o.y = 0; });
$('swatches').addEventListener('click', e => {
  const c = e.target.dataset && e.target.dataset.c; if (!c) return;
  if (curOrn()) curOrn().color = c; else if (curLayer()) curLayer().color = c; else SB().stroke = c;
  update(); commit();
});
$('imgFile').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const el = new Image(); let src = r.result;
    el.onload = () => { if (!el.dataset.shrunk) { const out = shrinkImg(el, file); if (out) { el.dataset.shrunk = 1; src = out; el.src = out; return; } } imgEls.set(src, el); if (!IM()) { addImageLayer.noPick = 1; const im = Object.assign(imgDefaults(), { id: uid(), name: 'Image ' + (S.images.length + 1), behind: false, src: null }); S.images.push(im); sel.slot = im.id; } const old = IM(), bgp = !!old.behind, ni = Object.assign(imgDefaults(), { id: old.id, name: old.name, behind: bgp, src, x: C, y: C, size: bgp ? 900 : 200, clip: !bgp, clipMode: bgp ? 'free' : 'clip' }); setIM(ni); if (!bgp) Object.assign(ni, fitInside(ni)); sel.img = true; sel.orn = null; procCache.clear(); update(); commit(); };
    el.onerror = () => alert('Could not read that image.'); el.src = src;
  };
  r.readAsDataURL(file); e.target.value = '';
});
function shrinkImg(el, file) { // keep imported pictures to a sensible size: 2400 px long side (300 dpi at ~200 mm)
  const M = 2400, w = el.naturalWidth, h = el.naturalHeight, k = Math.min(1, M / Math.max(w, h)), W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'); cx.drawImage(el, 0, 0, W, H);
  let alpha = false; try { const d = cx.getImageData(0, 0, W, H).data; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 250) { alpha = true; break; } } catch (e) { return null; }
  const out = alpha ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.92);
  el.dataset.shrunk = 1; return out.length < el.src.length || k < 1 ? out : null;
}

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
function nudge(x, y, step) { // x,y are screen directions: map them into the letter's layer (undo layer turn and scale)
  const L = S.layers.find(q => sel.letters[0] && q.id === sel.letters[0].l), sh = L ? shapeOf(L) : null; let ux = x * step, uy = y * step;
  if (sh) { const a = -(sh.rot || 0) * Math.PI / 180, k = sh.scale || 1; [ux, uy] = [(ux * Math.cos(a) - uy * Math.sin(a)) / k, (ux * Math.sin(a) + uy * Math.cos(a)) / k]; }
  for (const o of selObjs()) { o.dx = f2(o.dx + ux); o.dy = f2(o.dy + uy); } update(); commit(); }
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
document.querySelectorAll('[data-op]').forEach(el => {
  el.addEventListener('input', () => { const o = curOrn(); if (!o) return; const k = el.dataset.op, v = +el.value;
    if (k === 'x') o.x = C + v; else if (k === 'y') o.y = C + v; else if (o.follow) { if (k === 't') o.follow.t = v; else o.follow.off = v; }
    el.nextElementSibling.textContent = el.value; render(); });
  el.addEventListener('change', () => { commit(); syncUI(); });
});
document.querySelectorAll('[data-onudge]').forEach(bt => bt.addEventListener('click', () => { const o = curOrn(); if (!o) return; const [x, y] = bt.dataset.onudge.split(',').map(Number); if (o.follow && o.follow.on) { o.follow.t = Math.round(((o.follow.t || 0) + x + 540) % 360 - 180); o.follow.off = (o.follow.off || 0) - y * 2; } else { o.x = f2(o.x + x * 2); o.y = f2(o.y + y * 2); } update(); commit(); }));
act('centreOrn', () => { const o = curOrn(); if (!o) return; if (o.follow && o.follow.on) { o.follow.t = 0; o.follow.off = 0; } else { o.x = C; o.y = C; } });
const followFrom = o => ({ on: true, shape: (o.follow && o.follow.shape) || curShape().id, path: (o.follow && o.follow.path) || 'outer', t: 0, off: 0, turn: !!(o.follow && o.follow.turn) });
$('ornFollow').addEventListener('change', e => { const o = curOrn(); if (!o) return; if (e.target.checked) { const f = followFrom(o); const ps = pathSamples(f.shape, f.path); f.t = pathNearest(ps, o.x, o.y); o.follow = f; } else if (o.follow) o.follow.on = false; update(); commit(); });
$('ornPath').addEventListener('change', e => { const o = curOrn(); if (o && o.follow) { o.follow.path = e.target.value; update(); commit(); } });
$('ornShapeSel').addEventListener('change', e => { const o = curOrn(); if (o && o.follow) { o.follow.shape = e.target.value; update(); commit(); } });
$('ornTurn').addEventListener('change', e => { const o = curOrn(); if (o && o.follow) { o.follow.turn = e.target.checked; if (!o.follow.turn) o.rot = 0; update(); commit(); } });
act('ornLink', () => { const o = curOrn(), p = partnerOf(o); if (p) { delete o.pair; delete p.pair; } });
$('multiBtn').onclick = $('multiBtn2').onclick = () => { mode.multi = !mode.multi; syncUI(); };
$('dragMode').onclick = () => { mode.pan = !mode.pan; syncUI(); };
$('clearSel').onclick = () => { sel.letters = []; update(); };
act('selAll', () => { const L = curLayer(); if (!L) return; const add = layoutLayer(L).filter(q => q.bb && !isSel(L.id, q.i)).map(q => ({ l: L.id, i: q.i })); sel.letters = sel.letters.concat(add); openSec('sec-letter'); });
const additive = e => e.shiftKey || e.ctrlKey || e.metaKey || mode.multi;
function startLetterDrag(p) { const L = S.layers.find(x => sel.letters[0] && x.id === sel.letters[0].l); drag = { letters: selObjs().map(o => ({ o, x0: o.dx, y0: o.dy })), p, sh: L ? shapeOf(L) : null }; }
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
    const l = t.dataset.l, i = +t.dataset.i; sel.layer = l; sel.orn = null; { const L0 = S.layers.find(x => x.id === l); if (L0) sel.shape = shapeOf(L0).id; }
    if (additive(e)) {
      if (isSel(l, i)) { sel.letters = sel.letters.filter(s => !(s.l === l && s.i === i)); drag = { none: true }; }
      else { sel.letters.push({ l, i }); startLetterDrag(p); }
    } else if (isSel(l, i)) { startLetterDrag(p); drag.collapse = { l, i }; } // drag the whole group; a plain click narrows to this one
    else { sel.letters = [{ l, i }]; startLetterDrag(p); }
    openSec('sec-letter');
  } else if (k === 'sh') { const sh = S.shapes.find(s => s.id === t.dataset.id); sel.shape = sh.id; sel.orn = null; sel.letters = []; fixSel(); drag = { obj: sh, x0: sh.x, y0: sh.y, p }; if (S.shapes.length > 1) openSec('sec-shape'); }
  else if (k === 'orn') { sel.orn = t.dataset.id; sel.letters = []; const o = curOrn(); drag = { obj: o, x0: o.x, y0: o.y, p, orn: true }; openSec('sec-orn'); }
  else if (k === 'img') { sel.slot = t.dataset.slot || (t.closest('[data-slot]') || { dataset: {} }).dataset.slot || null; sel.img = true; sel.orn = null; sel.letters = []; const im = IM(); drag = { obj: im, x0: im.x, y0: im.y, p }; openSec('sec-img'); }
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
  if (drag.letters) { let ux = dx, uy = dy; if (drag.sh) { const a = -(drag.sh.rot || 0) * Math.PI / 180, k = drag.sh.scale || 1; ux = (dx * Math.cos(a) - dy * Math.sin(a)) / k; uy = (dx * Math.sin(a) + dy * Math.cos(a)) / k; }
    for (const q of drag.letters) { q.o.dx = f2(q.x0 + ux); q.o.dy = f2(q.y0 + uy); } }
  else if (drag.orn && drag.obj.follow && drag.obj.follow.on) { const f = drag.obj.follow; f.t = pathNearest(pathSamples(f.shape, f.path), drag.x0 + dx, drag.y0 + dy); }
  else { drag.obj.x = f2(drag.x0 + dx); drag.obj.y = f2(drag.y0 + dy); }
  render(); if (drag.orn) syncUI();
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
  const name = fileBase() + ' print';
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
  download(blob, (pf ? name.replace(/ print$/, ' printify') : name) + '.png'); return `PNG ${pw}×${ph}px${pf ? ' (Printify)' : ` @ ${dpi} DPI`}`;
}
$('exportBtn').addEventListener('click', async () => {
  $('exInfo').textContent = 'Exporting…';
  try { $('exInfo').textContent = 'Saved: ' + await doExport(); } catch (err) { console.warn(err); $('exInfo').textContent = 'Export failed: ' + err.message; }
});
$('saveProj').onclick = () => download(new Blob([JSON.stringify({ app: 'wayland-forge', version: 1, state: S }, null, 1)], { type: 'application/json' }), (designName() ? fileBase() : 'MyBadge') + ' project.json');
$('loadProj').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return; e.target.value = '';
  try { const j = JSON.parse(await file.text()); if (!j.state || !Array.isArray(j.state.layers)) throw new Error('Not a Wayland Forge project'); if (homeOpen) { archiveSession(); openState(j.state, null); } else { S = sanitize(j.state); fixSel(); update(); commit(); } }
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

// ---------- laser pack (LaserGRBL): one file per job, all on the same mm page ----------
const ROLES = [['off', 'Skip'], ['image', 'Image (photo engrave)'], ['etch', 'Etch (fill)'], ['cutin', 'Cut inside edge'], ['cutout', 'Cut outside edge']];
function laserItems() {
  const it = [], many = S.shapes.length > 1;
  S.shapes.forEach((sh, i) => { if (sh.visible === false) return; const b = sh.base, pre = i ? sh.id + ':' : '', nm = many ? sh.name + ' – ' : '';
    if (b.outer) it.push({ key: pre + 'outer', part: 'outer', sh, name: nm + 'Outer line', def: i ? 'etch' : 'cutout' });
    if (b.inner) it.push({ key: pre + 'inner', part: 'inner', sh, name: nm + 'Inner line', def: 'etch' });
    if (b.fillOn) it.push({ key: pre + 'fill', part: 'fill', sh, name: nm + 'Shape fill', def: 'off' });
    for (const L of S.layers) if (L.text && shapeOf(L) === sh) it.push({ key: 't:' + L.id, sh, name: nm + 'Text: ' + L.text, def: 'etch' }); });
  if (S.ornaments.length) it.push({ key: 'orn', name: 'Ornaments', def: 'etch' });
  S.images.filter(im => im.src && im.visible !== false).forEach(im => it.push({ key: 'img:' + im.id, im, name: (im.name || 'Image') + (im.mode === 'trace' ? ' (trace)' : im.mode === 'sil' ? ' (silhouette)' : ''), def: im.mode === 'orig' ? 'image' : 'etch' }));
  const z = x => x.im ? (x.im.behind ? 0 : 2) : x.part === 'fill' && !x.sh.base.fillAbove ? 1 : x.part === 'fill' ? 3 : 4; // same stacking as the design
  return it.map((x, i) => [x, i]).sort((p, q) => z(p[0]) - z(q[0]) || p[1] - q[1]).map(p => p[0]);
}
const roleOf = it => S.laser[it.key] || it.def;
function ringD(d) {
  const b = SB();
  if (FILLET.includes(b.shape)) return filletD(safeOffset(baseGeo(), d, 0).g) + tasD(d);
  const rx = b.rx + d, ry = (b.shape === 'circle' ? b.rx : b.ry) + d; if (rx <= 0.5 || ry <= 0.5) return '';
  return `M${f2(C - rx)} ${C}A${f2(rx)} ${f2(ry)} 0 1 0 ${f2(C + rx)} ${C}A${f2(rx)} ${f2(ry)} 0 1 0 ${f2(C - rx)} ${C}Z`;
}
function imgBox(im) { const a = imgAspect(im), w = a >= 1 ? im.size : im.size * a, h = a >= 1 ? im.size / a : im.size; return `M${f2(im.x - w / 2)} ${f2(im.y - h / 2)}h${f2(w)}v${f2(h)}h${f2(-w)}Z`; }
// Markup (artwork units) for one item. kind: 'pic' (as it looks), 'fill' (solid black shapes), 'cutout' / 'cutin' (outline paths, no style).
function laserPart(it, kind) { const sh = it.sh || imgShape(); const r = withShape(sh, () => laserPart0(it, kind)); return it.sh ? wrapSh(sh, r) : r; }
function laserPart0(it, kind) {
  const b = SB(), k = it.part || it.key, cut = kind === 'cutout' || kind === 'cutin';
  if (k === 'outer' || k === 'inner') {
    const d0 = k === 'outer' ? 0 : -b.gap, w = b.width / 2;
    if (cut) { const d = ringD(kind === 'cutout' ? d0 + w : d0 - w); return d ? `<path d="${d}"/>` : ''; }
    return w > 0 ? `<path d="${ringD(d0 + w)}${ringD(d0 - w)}" fill-rule="evenodd"${kind === 'pic' ? ` fill="${b.stroke}"` : ''}/>` : '';
  }
  if (k === 'fill') return `<path d="${ringD(0)}"${kind === 'pic' ? ` fill="${b.fill}"` : ''}/>`;
  if (k === 'orn') return S.ornaments.map(o => `<g transform="translate(${f2(o.x)} ${f2(o.y)}) rotate(${o.rot})${o.flip ? ' scale(-1 1)' : ''}"${kind === 'pic' ? ` fill="${o.color}"` : ''}>${ornSvg(o, kind === 'pic')}</g>`).join('');
  if (k.startsWith('t:')) { const L = S.layers.find(l => 't:' + l.id === k); if (!L) return ''; return `<g${kind === 'pic' ? (L.style === 'hollow' ? ` fill="none" stroke="${L.color}" stroke-width="2.5"` : ` fill="${L.color}"`) : ''}>` + layoutLayer(L).map(q => `<path d="${q.d}" transform="${q.tr}"/>`).join('') + '</g>'; }
  if (k.startsWith('img:') && (it.im || S.images.find(i => 'img:' + i.id === k))) {
    const im = it.im || S.images.find(i => 'img:' + i.id === k), pr = procImage(im), vec = pr && pr.paths;
    const cm = clipOf(im); if (cut && (cm === 'clip' || cm === 'clipout' || !vec)) return cm === 'clip' || cm === 'clipout' ? clipEl(im, cm === 'clip' ? -1 : 1) : `<path d="${imgBox(im)}"/>`;
    if (vec && (cut || kind === 'fill')) { const s = im.size / Math.max(pr.w, pr.h);
      return imgWrap(cut ? { clipMode: 'free' } : im, `<g transform="translate(${f2(im.x - pr.w * s / 2)} ${f2(im.y - pr.h * s / 2)}) scale(${+s.toFixed(5)})" fill-rule="evenodd">${pr.paths.map(d => `<path d="${d}"/>`).join('')}</g>`, 'wflz' + uid()); }
    const cid = 'wflz' + uid(); // raster picture (also used for "etch" of a photo/silhouette: it goes in the etch PNG)
    const el = `<image href="${esc(pr && pr.url ? pr.url : im.src)}" x="${f2(im.x - im.size / 2)}" y="${f2(im.y - im.size / 2)}" width="${im.size}" height="${im.size}" preserveAspectRatio="xMidYMid meet"/>`;
    return imgWrap(im, el, cid);
  }
  return '';
}
function lzPage(W, H) { const s = Math.min(W, H), k = ART / s, vw = W * k, vh = H * k; return { k, vx: C - vw / 2, vy: C - vh / 2, vw, vh }; }
function lzMarks(P, style) { const m = 0.4 * P.k, xs = [P.vx, P.vx + P.vw - m], ys = [P.vy, P.vy + P.vh - m];
  return xs.flatMap(x => ys.map(y => `<path d="M${f2(x)} ${f2(y)}h${f2(m)}v${f2(m)}h${f2(-m)}Z"${style}/>`)).join(''); }
// Flatten markup (artwork units, any transforms) into plain absolute polylines in mm: LaserGRBL's SVG reader mis-handles nested/combined transforms.
function lzFlat(W, H, body) { const P = lzPage(W, H), NS = 'http://www.w3.org/2000/svg', host = document.createElementNS(NS, 'svg');
  host.setAttribute('viewBox', `${P.vx} ${P.vy} ${P.vw} ${P.vh}`); host.setAttribute('width', '1000'); host.setAttribute('height', '1000');
  host.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden'; host.innerHTML = body; document.body.appendChild(host);
  const out = [], step = 0.08 * P.k, tol = 0.01 * P.k, R = n => +n.toFixed(3);
  try { const inv = host.getScreenCTM().inverse();
    for (const el of host.querySelectorAll('path,circle,ellipse,rect,polygon,polyline,line')) { if (el.closest('defs,clipPath')) continue;
      const len = el.getTotalLength(); if (!(len > 0)) continue; const m = inv.multiply(el.getScreenCTM()), pt = host.createSVGPoint();
      const n = Math.max(8, Math.ceil(len / step)), ds = len / n, subs = []; let cur = [], prev = null;
      for (let i = 0; i <= n; i++) { const q = el.getPointAtLength(Math.min(len, i * ds)); if (prev && Math.hypot(q.x - prev.x, q.y - prev.y) > ds * 1.05 + 1e-6) { if (cur.length > 1) subs.push(cur); cur = []; }
        pt.x = q.x; pt.y = q.y; const g = pt.matrixTransform(m); cur.push([g.x, g.y]); prev = q; }
      if (cur.length > 1) subs.push(cur);
      for (const sp of subs) { const k = rdp(sp, tol); out.push('M' + k.map(([x, y]) => `${R((x - P.vx) / P.k)} ${R((y - P.vy) / P.k)}`).join('L')); } }
  } finally { host.remove(); }
  return out; }
function rdp(pts, e) { if (pts.length < 3) return pts; const [a, b] = [pts[0], pts[pts.length - 1]]; let mi = 0, md = 0; const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  for (let i = 1; i < pts.length - 1; i++) { const d = L < 1e-6 ? Math.hypot(pts[i][0] - a[0], pts[i][1] - a[1]) : Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > md) { md = d; mi = i; } }
  return md > e ? rdp(pts.slice(0, mi + 1), e).slice(0, -1).concat(rdp(pts.slice(mi), e)) : [a, b]; }
// Vector file in true mm: viewBox 0 0 W H with width/height in mm (LaserGRBL maps that 1:1 to mm), all paths already flattened.
function lzVec(W, H, body, title) { const ds = lzFlat(W, H, body);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${f2(W)}mm" height="${f2(H)}mm" viewBox="0 0 ${f2(W)} ${f2(H)}">\n<title>${esc(title)}</title>\n<g fill="none" stroke="#000" stroke-width="0.1">\n${ds.map(d => `<path d="${d}"/>`).join('\n')}\n</g>\n</svg>\n`; }
function lzSVG(W, H, body, title) { const P = lzPage(W, H);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${f2(W)}mm" height="${f2(H)}mm" viewBox="${f2(P.vx)} ${f2(P.vy)} ${f2(P.vw)} ${f2(P.vh)}">\n<title>${esc(title)}</title>\n${body}\n</svg>\n`; }
// Filled etch as vector scan lines (0.1 mm apart) in true mm. LaserGRBL places SVG by the page itself (no offset/size boxes),
// so this lines up exactly with the cut files - no raster wizard numbers to get wrong.
async function lzHatch(W, H, body, title, gap) { gap = gap || 0.1; const pxmm = Math.min(20, Math.floor(7900 / Math.max(W, H))), step = Math.max(1, Math.round(gap * pxmm));
  const { id, pw, ph } = await lzRaster(W, H, pxmm * 25.4, body, true), d = id.data, R = n => +n.toFixed(2), rows = [];
  for (let y = Math.floor(step / 2), r = 0; y < ph; y += step, r++) { const segs = []; let st = -1;
    for (let x = 0; x <= pw; x++) { const on = x < pw && d[(y * pw + x) * 4] < 128; if (on && st < 0) st = x; else if (!on && st >= 0) { segs.push([st, x]); st = -1; } }
    if (!segs.length) continue; const yy = R((y + 0.5) / pxmm); if (r % 2) segs.reverse();
    rows.push(segs.map(([a, b]) => r % 2 ? `M${R(b / pxmm)} ${yy}L${R(a / pxmm)} ${yy}` : `M${R(a / pxmm)} ${yy}L${R(b / pxmm)} ${yy}`).join('')); }
  const paths = []; for (let i = 0; i < rows.length; i += 40) paths.push(`<path d="${rows.slice(i, i + 40).join('')}"/>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${f2(W)}mm" height="${f2(H)}mm" viewBox="0 0 ${f2(W)} ${f2(H)}">\n<title>${esc(title)}</title>\n<g fill="none" stroke="#000" stroke-width="0.1">\n${paths.join('\n')}\n</g>\n</svg>\n`; }
async function lzPNG(W, H, dpi, body, crisp) { const { cv } = await lzRaster(W, H, dpi, body, crisp);
  return new Uint8Array(await (await new Promise(r => cv.toBlob(r, 'image/png'))).arrayBuffer()); }
async function lzRaster(W, H, dpi, body, crisp) { // greyscale-looking PNG on white, full page size (LaserGRBL uses the whole image)
  const pw = Math.round(W / 25.4 * dpi), ph = Math.round(H / 25.4 * dpi);
  if (Math.max(pw, ph) > 8000) throw new Error('Laser image too big: lower the size or detail.');
  const P = lzPage(W, H), svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${pw}" height="${ph}" viewBox="${f2(P.vx)} ${f2(P.vy)} ${f2(P.vw)} ${f2(P.vh)}">${body}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), img = new Image();
  await new Promise((ok, bad) => { img.onload = ok; img.onerror = () => bad(new Error('Could not draw the laser image.')); img.src = url; });
  const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph; const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, pw, ph); cx.drawImage(img, 0, 0, pw, ph); URL.revokeObjectURL(url);
  const id = cx.getImageData(0, 0, pw, ph), d = id.data;
  for (let p = 0; p < d.length; p += 4) { const g = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]); d[p] = d[p + 1] = d[p + 2] = crisp ? (g < 128 ? 0 : 255) : g; d[p + 3] = 255; }
  cx.putImageData(id, 0, 0);
  return { cv, id, pw, ph };
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u) { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files) { // plain "stored" zip: opens in Windows Explorer with no extra software
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(10, 0, true); h.setUint16(12, 0x5821, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
    parts.push(h.buffer, name, data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(14, 0x5821, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    cen.push(c.buffer, name); off += 30 + name.length + data.length;
  }
  const cl = cen.reduce((a, b) => a + b.byteLength, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cl, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, e.buffer], { type: 'application/zip' });
}
function pngDpi(u, dpi) { // insert a pHYs chunk (pixels per metre) right after IHDR so LaserGRBL knows the real size
  const ppm = Math.round(dpi / 0.0254), c = new Uint8Array(21), v = new DataView(c.buffer);
  v.setUint32(0, 9); c.set([112, 72, 89, 115], 4); v.setUint32(8, ppm); v.setUint32(12, ppm); c[16] = 1; v.setUint32(17, crc32(c.subarray(4, 17)));
  const o = new Uint8Array(u.length + 21); o.set(u.subarray(0, 33)); o.set(c, 33); o.set(u.subarray(33), 54); return o;
}
// Build the list of steps (one file each). Every file is the same W x H mm page, origin = bottom-left corner.
async function imgReady() { for (const im of S.images) if (im.src) await imgReady1(im); }
async function imgReady1(im) { if (!im) return; const need = !(im.mode === 'orig' && !im.removeBg && !(im.whiteLvl < 255));
  for (let i = 0; i < 100; i++) { const el = loadedImg(im.src); if (el && (!need || procImage(im))) return; await new Promise(r => setTimeout(r, 100)); }
  throw new Error('A picture is still loading - try again in a moment.'); }
async function laserSteps() { await imgReady();
  const W = +$('lzW').value, H = +$('lzH').value, dpi = +$('lzDpi').value || 254, marks = $('lzMarks').checked;
  if (!(W >= 5 && H >= 5)) throw new Error('Enter the size in mm.');
  const B = fileBase();
  const P = lzPage(W, H), hair = f2(0.1 * P.k), items = laserItems(), by = r => items.filter(it => roleOf(it) === r);
  const imgItems = by('image'), etch = by('etch'), cin = by('cutin'), cout = by('cutout');
  if (!imgItems.length && !etch.length && !cin.length && !cout.length) throw new Error('Every part is set to Skip.');
  const mk = st => marks ? lzMarks(P, st) : '', st = [], lpm = Math.round(dpi / 25.4 * 10) / 10, sz = `${f2(W)}x${f2(H)}mm`;
  const nm = l => l.map(x => x.name.replace(/^.* – /, '')).join(', ');
  if (imgItems.length) st.push({ kind: 'ENGRAVE', what: 'photo', type: 'png', items: imgItems, mode: `Line To Line Tracing, ${lpm} lines/mm`,
    warn: 'PHOTO = LOW POWER, HIGH SPEED. Start with S-MAX about 20-30% of your max and a fast engraving speed. Full power burns straight through.',
    data: async () => pngDpi(await lzPNG(W, H, dpi, imgItems.map(it => laserPart(it, 'pic')).join('') + mk(' fill="#000"')), dpi) });
  const isLine = it => it.key === 'orn' || (it.key.startsWith('t:') && (S.layers.find(l => 't:' + l.id === it.key) || {}).style === 'hollow');
  const eLine = etch.filter(isLine), eFill = etch.filter(it => !isLine(it)), edpi = Math.min(Math.max(dpi * 2, 508), Math.floor(7900 * 25.4 / Math.max(W, H)));
  const what = l => [...new Set(l.map(x => x.key === 'orn' ? 'ornaments' : x.key.startsWith('img') ? 'image' : x.key.includes('t:') ? 'text' : 'lines'))].join('+');
  if (eFill.length) st.push({ kind: 'ETCH', what: what(eFill), short: 'etch fill', type: 'svg', items: eFill, mode: 'Vector (SVG) fill lines 0.1 mm apart - opens straight into the speed/power box, no size or offset to set',
    warn: 'Solid filled letters/shapes, burned as tight lines. Normal etch power. Use a fast speed (it is many short lines).',
    data: async () => lzHatch(W, H, `<g fill="#000">${eFill.map(it => laserPart(it, 'fill')).join('')}</g>` + mk(' fill="#000"'), 'etch fill') });
  if (eLine.length) st.push({ kind: 'ETCH', what: what(eLine) + ' outline', short: 'etch lines', type: 'svg', items: eLine, mode: 'Vector (SVG) smooth outlines - LaserGRBL takes the size from the file',
    warn: 'Outline etch (hollow letters, ornaments). Etch power, 1 pass.',
    data: async () => lzVec(W, H, eLine.map(it => laserPart(it, 'fill')).join('') + mk(''), 'etch lines') });
  const cut = (list, kind, label, warn) => st.push({ kind: 'CUT', what: label, type: 'svg', items: list, mode: 'Vector (SVG) - LaserGRBL takes the size from the file', warn,
    data: async () => lzVec(W, H, list.map(it => laserPart(it, kind)).join('') + mk(''), 'cut ' + label) });
  if (cin.length) cut(cin, 'cutin', 'inside', 'Cutting power. Run passes until it goes through.');
  if (cout.length) cut(cout, 'cutout', 'outside', 'Always LAST - the piece is free after this.');
  st.forEach((s, i) => { s.n = i + 1; s.W = W; s.H = H; s.dpi = s.dpi || dpi; s.px = s.type === 'png' ? [Math.round(W / 25.4 * s.dpi), Math.round(H / 25.4 * s.dpi)] : null;
    s.short = s.short || (s.kind === 'ENGRAVE' ? 'photo' : 'cut ' + s.what); s.file = `${B} ${s.n} ${s.short}.${s.type}`; });
  return st;
}
let lzLast = null;
const lzBlob = s => new Blob([s.bytes], { type: s.type === 'png' ? 'image/png' : 'image/svg+xml' });
async function laserPack(asZip) {
  const st = await laserSteps(), files = [];
  for (const s of st) { s.bytes = await s.data(); files.push({ name: s.file, data: s.bytes }); }
  lzLast = st; lzStepsUI(st);
  if (asZip) { files.push({ name: `${st[0].file.replace(/ 1 .*$/, '')} 0 read me.txt`, data: lzReadme(st, $('lzMarks').checked) }); const blob = makeZip(files);
    const zn = st[0].file.replace(/ 1 .*$/, '') + ' laser.zip'; download(blob, zn); return `${zn} (${st.length} steps) is in your Downloads folder. Right-click it > Extract All > Extract before opening in LaserGRBL.`; }
  for (const s of st) { download(lzBlob(s), s.file); await new Promise(r => setTimeout(r, 900)); }
  return `${st.length} files saved to your Downloads folder: ${st.map(s => s.file).join(' · ')}. If the browser asks to allow multiple downloads, tap Allow.`;
}
function lzStepText(s) {
  const L = [`STEP ${s.n}: ${s.kind} ${s.what}`, `  File: ${s.file}`];
  if (s.type === 'png') L.push(`  Photo picture, ${f2(s.W)} x ${f2(s.H)} mm (${s.px[0]} x ${s.px[1]} px at ${s.dpi} DPI).`,
    `  LaserGRBL: File > Open File > pick it > choose Line To Line Tracing > Next.`,
    `  In "Target image": tick Autosize, press the DPI button, type 0 in both Offset boxes (X 0, Y 0).`,
    `  W must read ${f2(s.W)}, H ${f2(s.H)}. Then set speed and S-MAX > Create!`,
    `  (This is the ONLY file that has size and offset boxes. Do the photo FIRST so you can check them before anything burns.)`);
  else L.push(`  LaserGRBL: File > Open File > pick it > set speed and S-MAX > Create!  Nothing else to set - it lines up by itself.`);
  L.push(`  ${s.warn}`, `  Your settings:  speed ________  S-MAX ________  passes ____  result ______________`, ``);
  return L.join('\r\n');
}
function lzReadme(st, marks) {
  const s0 = st[0], L = [`WAYLAND FORGE - LASER PACK`, `Every file is the same ${f2(s0.W)} x ${f2(s0.H)} mm page with its corner at the laser's 0,0 (front-left / home).`,
    `Run the files in number order, one at a time, without moving the wood. For each file: File > Open File > pick it > speed and power > Create! > Start.`,
    `All letter, ornament and cut files are vector (SVG): LaserGRBL places them by the page itself, so they always line up. Only a photo (PNG) has size/offset boxes.`,
    `Unzip first (right-click > Extract All). Don't use "Reload Last File" between steps.`, ``];
  st.forEach(s => L.push(lzStepText(s)));
  L.push(`Use the Frame button before the first file if you want to see where it goes.`, `Test on scrap first: a photo on 1-4 mm wood needs very little power.`,
    marks ? `Corner marks are ON: tiny 0.4 mm squares at each page corner in every file.` : ``, `Cut lines are 0.1 mm hairlines; no kerf offset. Power, speed and passes are not in the files - you type them per step.`);
  return L.join('\r\n') + '\r\n';
}
function lzStepsUI(st) {
  const box = $('lzSteps'); if (!box) return;
  const s0 = st[0];
  box.innerHTML = `<b>Laser steps</b> <span class="dim">— run in order, one file at a time</span>
    <div class="lzhow">Files go to your <b>Downloads</b> folder. In LaserGRBL: <b>File &gt; Open File</b>, click <b>Downloads</b> on the left, pick the next file.
    Every file is the same ${f2(s0.W)} × ${f2(s0.H)} mm page and lines up by itself. Don't move the wood between files. For each file just set <b>speed</b> and <b>power</b>, then <b>Create!</b>${st.some(x => x.type === 'png') ? ' Only the photo has size boxes: tick Autosize, press DPI, type 0 in both Offset boxes.' : ''}</div>` + st.map((s, i) => {
    const url = URL.createObjectURL(new Blob([s.bytes], { type: s.type === 'png' ? 'image/png' : 'image/svg+xml' })); s.url = url;
    return `<div class="lzstep"><img src="${url}" alt="Step ${s.n} preview"><div><b>${s.n}. ${esc(s.kind)} ${esc(s.what)}</b><div class="dim">${esc(s.file)}</div>
      <div>${f2(s.W)} × ${f2(s.H)} mm${s.px ? ` · ${s.px[0]}×${s.px[1]} px @ ${s.dpi} DPI` : ''}</div>
      <div class="dim">${s.type === 'png' ? `Line To Line Tracing → Next. Tick Autosize, press DPI, Offset X 0 and Y 0 → W ${f2(s.W)}, H ${f2(s.H)}, X 0, Y 0. Speed, S-MAX, Create!` : 'Open → speed and S-MAX → Create! Lines up by itself.'}</div><div class="${s.kind === 'ENGRAVE' ? 'lzwarn' : 'dim'}">${esc(s.warn)}</div>
      <label class="dim">Your settings <input data-lzset="${i}" placeholder="speed / power / passes"></label>
      <button data-lzdl="${i}">⬇ Download step ${s.n} only</button></div></div>`; }).join('');
  box.hidden = false;
}
$('lzSteps') && $('lzSteps').addEventListener('click', e => { const i = e.target.dataset.lzdl; if (i == null || !lzLast) return; const s = lzLast[+i];
  download(lzBlob(s), s.file); });
function laserKeyOfSel() { return sel.img ? 'img:' + sel.slot : sel.orn ? 'orn' : sel.letters.length ? 't:' + sel.letters[0].l : null; }
function laserUI() {
  const box = $('laserList'); if (!box || box.contains(document.activeElement)) return;
  const sk = laserKeyOfSel();
  box.innerHTML = laserItems().map(it => `<label class="lrow${it.key === sk ? ' on' : ''}"><span title="${esc(it.name)}">${esc(it.name)}</span><select data-lk="${it.key}">${ROLES.map(([v, t]) => `<option value="${v}"${roleOf(it) === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`).join('') || '<div class="hint">Nothing to laser yet.</div>';
}
function laserOverlay() {
  if (!$('laserPrev') || !$('laserPrev').checked) return '';
  const it = laserItems(), sw = 'stroke-width="3" vector-effect="non-scaling-stroke" fill="none" pointer-events="none"';
  return `<g stroke="#e0302a" ${sw}>${it.filter(x => roleOf(x) === 'cutout').map(x => laserPart(x, 'cutout')).join('')}</g><g stroke="#2a6fe0" ${sw}>${it.filter(x => roleOf(x) === 'cutin').map(x => laserPart(x, 'cutin')).join('')}</g>`;
}
$('laserList').addEventListener('change', e => { const k = e.target.dataset.lk; if (!k) return; S.laser[k] = e.target.value; e.target.blur(); update(); commit(); });
$('laserPrev').addEventListener('change', () => render());
$('laserZip').addEventListener('click', async () => { $('lzInfo').textContent = 'Building zip…';
  try { $('lzInfo').textContent = await laserPack(true); } catch (err) { $('lzInfo').textContent = 'Laser export failed: ' + err.message; } });
$('laserBtn').addEventListener('click', async () => {
  $('lzInfo').textContent = 'Building laser pack…';
  try { $('lzInfo').textContent = await laserPack(false); } catch (err) { console.warn(err); $('lzInfo').textContent = 'Laser export failed: ' + err.message; }
});
['lzW', 'lzH'].forEach(id => $(id).addEventListener('change', () => { try { localStorage.setItem('wf-lz', JSON.stringify([$('lzW').value, $('lzH').value])); } catch (e) { /* */ } }));
try { const z = JSON.parse(localStorage.getItem('wf-lz') || 'null'); if (z) { $('lzW').value = z[0]; $('lzH').value = z[1]; } } catch (e) { /* */ }

// ---------- install / offline ----------
let deferred = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('installBtn').hidden = false; });
$('installBtn').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('installBtn').hidden = true; };
window.addEventListener('appinstalled', () => { $('installBtn').hidden = true; });
const APP_VERSION = 'v27';
$('homeVer').textContent = 'Wayland Forge ' + APP_VERSION;
$('updBtn').onclick = () => location.reload();
if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) $('updBar').hidden = false; });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    const chk = () => reg.update().catch(() => {}); chk(); setInterval(chk, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') chk(); });
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) $('updBar').hidden = false; }); });
  }).catch(err => console.warn('SW failed', err));
});

// ---------- boot ----------
window.WF = { showHome, closeHome, openState, newDesign: () => $('homeNew').click(), get projId() { return projId; }, openSec: id => openSec(id), setSnap: n => setSnap(n), isSheet: () => isSheet(), fitView: () => fitView(), fitInside, fillInner, get sel() { return sel; }, mode, procImage, get state() { return S; }, set state(v) { S = sanitize(v); fixSel(); update(); commit(); }, exportSVG, layoutLayer, buildArt, curShape, doExport, update, maxInnerGap, laserPack, laserItems };
(async () => {
  await kvLoad();
  await Promise.all(FONTS.map(async ([name, file]) => { const buf = window.WF_FONTS ? Uint8Array.from(atob(window.WF_FONTS[file]), c => c.charCodeAt(0)).buffer : await (await fetch('fonts/' + file)).arrayBuffer(); fonts[name] = opentype.parse(buf); try { const ff = new FontFace('WF ' + name, buf.slice(0)); document.fonts.add(ff); ff.load(); } catch (e) { /* preview only */ } }));
  // start on the home screen; projects open only from Projects
  $('loading').remove(); update(); commit();
  document.body.dataset.ready = '1';
})().catch(err => { $('loading').textContent = 'Failed to load fonts: ' + err.message; console.error(err); });
})();
