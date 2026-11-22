// Wayland design file (.wayland.json) – shared by Forge, Path and a future third app.
// Schema 1. See SPEC.md. This file is a library only: it does not change laser output by itself.
'use strict';
(function (root, factory) {
  const WD = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = WD;
  root.WD = WD;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  const FORMAT = 'wayland-design', SCHEMA = 1;
  const clone = v => JSON.parse(JSON.stringify(v));
  const safeName = s => String(s || 'Untitled').replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Untitled';
  const nowIso = () => new Date().toISOString();
  const isDesign = j => !!(j && j.format === FORMAT && +j.schema >= 1 && (j.layers || j.apps));

  function nodeMm(nd, k) {
    if (!nd) return null;
    const o = { x: nd.x * k, y: nd.y * k };
    if (nd.i) o.i = [nd.i[0] * k, nd.i[1] * k];
    if (nd.o) o.o = [nd.o[0] * k, nd.o[1] * k];
    if (nd.s != null) o.s = nd.s;
    return o;
  }
  function nodeU(nd, k) {
    if (!nd) return null;
    const o = { x: nd.x / k, y: nd.y / k };
    if (nd.i) o.i = [nd.i[0] / k, nd.i[1] / k];
    if (nd.o) o.o = [nd.o[0] / k, nd.o[1] / k];
    if (nd.s != null) o.s = nd.s;
    return o;
  }
  // a compact SVG path in mm from Path Bezier nodes (other apps can draw this)
  function nodesToD(nodes, closed, k) {
    if (!nodes || !nodes.length) return '';
    const sc = k || 1, p = (x, y) => `${+(x * sc).toFixed(4)} ${+(y * sc).toFixed(4)}`;
    let d = `M${p(nodes[0].x, nodes[0].y)}`;
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1], o = a.o, inn = b.i;
      if (o && inn) d += `C${p(o[0], o[1])} ${p(inn[0], inn[1])} ${p(b.x, b.y)}`;
      else d += `L${p(b.x, b.y)}`;
    }
    if (closed) {
      const a = nodes[nodes.length - 1], b = nodes[0], o = a.o, inn = b.i;
      if (o && inn) d += `C${p(o[0], o[1])} ${p(inn[0], inn[1])} ${p(b.x, b.y)}`;
      d += 'Z';
    }
    return d;
  }

  function roleOfPath(p, isOuter) {
    if (!p) return 'etch';
    if (p.cut) return isOuter ? 'cut-outer' : 'cut-inner';
    return 'etch';
  }

  function fromPath(S, opts) {
    opts = opts || {};
    const k = opts.kmm || 1;
    const paths = (S && S.paths) || [];
    const bb = opts.bbox || null;
    const widthMm = +(S && S.widthMm) || 0;
    const heightMm = bb && bb.h > 0 && k ? bb.h * k : widthMm;
    const items = paths.map((p, i) => {
      const closed = !!p.z;
      const isOuter = !!(opts.isOuter && opts.isOuter(p));
      const item = {
        id: 'p' + i,
        type: 'path',
        role: roleOfPath(p, isOuter),
        closed,
        strokeMm: p.w != null ? p.w : (S && S.lineMm) || undefined,
        d: nodesToD(p.n, closed, k)
      };
      if (p.hole) item.hole = clone(p.hole);
      if (p.slot) item.slot = clone(p.slot);
      if (p.tabs) item.tabs = clone(p.tabs);
      return item;
    });
    const doc = {
      format: FORMAT,
      schema: SCHEMA,
      name: (S && S.name) || 'Untitled',
      units: 'mm',
      artboard: { width: +(+widthMm).toFixed(4), height: +(+heightMm).toFixed(4) },
      origin: 'top-left',
      created: nowIso(),
      source: { app: 'waylands-path', version: (opts.version || '') },
      layers: [{ id: 'L1', name: 'Lines', visible: true, items }],
      settings: { lineMm: S && S.lineMm, cutOn: !!(S && S.cutOn) },
      apps: {
        'waylands-path': {
          project: clone(S || {})
        }
      }
    };
    return doc;
  }

  function toPath(doc) {
    if (!isDesign(doc)) throw new Error('Not a Wayland design file');
    const bag = doc.apps && doc.apps['waylands-path'] && doc.apps['waylands-path'].project;
    if (bag && Array.isArray(bag.paths)) return clone(bag);
    // build a Path project from the common layers (mm → design units, 1 unit = 1 mm)
    const items = [];
    (doc.layers || []).forEach(L => (L.items || []).forEach(it => {
      if (it.type === 'text-paths' && Array.isArray(it.items)) it.items.forEach(p => items.push(p));
      else if (it.type === 'path') items.push(it);
    }));
    const widthMm = (doc.artboard && doc.artboard.width) || 100;
    const paths = items.map(it => {
      const p = { n: [], z: !!it.closed };
      if (Array.isArray(it.nodes) && it.nodes.length) p.n = it.nodes.map(nd => nodeU(nd, 1));
      else if (it.d && typeof Path2D === 'undefined') { /* path d is parsed by the host app if needed */ }
      if (it.role === 'cut-outer' || it.role === 'cut-inner') { p.cut = true; p.uc = 1; }
      if (it.hole) p.hole = clone(it.hole);
      if (it.slot) p.slot = clone(it.slot);
      if (it.tabs) p.tabs = clone(it.tabs);
      if (it.strokeMm) p.w = it.strokeMm;
      return p;
    }).filter(p => p.n && p.n.length >= 2);
    return {
      name: doc.name || 'Untitled',
      paths,
      widthMm,
      lineMm: (doc.settings && doc.settings.lineMm) || 0.3,
      cutOn: doc.settings && doc.settings.cutOn != null ? !!doc.settings.cutOn : paths.some(p => p.cut),
      src: { kind: 'wayland-design' }
    };
  }

  function fromForge(S, opts) {
    opts = opts || {};
    const W = +(opts.W) || 100, H = +(opts.H) || 100;
    const items = Array.isArray(opts.items) ? opts.items : [];
    const doc = {
      format: FORMAT,
      schema: SCHEMA,
      name: (opts.name || (S && S.name) || 'Untitled'),
      units: 'mm',
      artboard: { width: +(+W).toFixed(4), height: +(+H).toFixed(4) },
      origin: 'top-left',
      created: nowIso(),
      source: { app: 'wayland-forge', version: (opts.version || '') },
      layers: [{ id: 'L1', name: 'Artwork', visible: true, items }],
      apps: { 'wayland-forge': { project: clone(S || {}) } }
    };
    if (opts.svg) doc.apps['wayland-forge'].svg = opts.svg;
    if (opts.photos) doc.apps['wayland-forge'].photos = opts.photos;
    return doc;
  }

  function toForge(doc) {
    if (!isDesign(doc)) throw new Error('Not a Wayland design file');
    const bag = doc.apps && doc.apps['wayland-forge'] && doc.apps['wayland-forge'].project;
    if (bag && (Array.isArray(bag.layers) || Array.isArray(bag.shapes))) return { kind: 'project', state: clone(bag) };
    const W = (doc.artboard && doc.artboard.width) || 100;
    const H = (doc.artboard && doc.artboard.height) || 100;
    const imports = [];
    (doc.layers || []).forEach(L => (L.items || []).forEach((it, i) => {
      if (it.type === 'text-paths' && Array.isArray(it.items)) {
        it.items.forEach((p, j) => { if (p.d) imports.push({ id: 'imp' + i + '-' + j, name: (L.name || 'Lines') + ' ' + (j + 1), role: p.role || it.role || 'etch', d: p.d, closed: !!p.closed }); });
      } else if (it.type === 'path' && it.d) {
        imports.push({ id: it.id || ('imp' + i), name: L.name || 'Line', role: it.role || 'etch', d: it.d, closed: !!it.closed });
      }
    }));
    const images = [];
    (doc.layers || []).forEach(L => (L.items || []).forEach(it => {
      if (it.type === 'image' && it.href) images.push(clone(it));
    }));
    return { kind: 'imports', artboard: { width: W, height: H }, name: doc.name || 'Untitled', imports, images };
  }

  function parse(text) {
    const j = typeof text === 'string' ? JSON.parse(text) : text;
    if (!isDesign(j)) throw new Error('Not a Wayland design file');
    return j;
  }
  function fileName(doc) { return safeName(doc && doc.name) + '.wayland.json'; }
  function stringify(doc) { return JSON.stringify(doc, null, 2); }

  return { FORMAT, SCHEMA, isDesign, fromPath, toPath, fromForge, toForge, parse, fileName, stringify, nodesToD, safeName };
}));
