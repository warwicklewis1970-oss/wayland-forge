// v53 Image frame: a separate, adjustable shape that trims a picture (clipMode 'frame').
// im.frame = { n: [{x,y,ix,iy,ox,oy,c}] (local, unrotated, relative to x,y; handles relative to their node), x, y, rot, show, kind, start }
// app.js calls FRmake(X) with its own S, sel, view and helpers (app.js lives inside its own closure).
window.FRmake = X => { const $ = id => document.getElementById(id), { stage, render, update, commit, IM, imgAspect, mmPerArt, pathSamples, clipShapeOf, toast } = X;
  const st = { edit: false, n: -1 }; // editing on the picture; picked point
  const K8 = 4 / 3 * Math.tan(Math.PI / 16); // handle length for an 8-point circle
  const r2 = v => Math.round(v * 100) / 100;
  const nd = (x, y, ix = 0, iy = 0, ox = 0, oy = 0, c = false) => ({ x: r2(x), y: r2(y), ix: r2(ix), iy: r2(iy), ox: r2(ox), oy: r2(oy), c });
  const W2A = (fr, x, y) => { const a = (fr.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [fr.x + x * c - y * s, fr.y + x * s + y * c]; }; // local -> art
  const A2W = (fr, x, y) => { const a = -(fr.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), u = x - fr.x, v = y - fr.y; return [u * c - v * s, u * s + v * c]; }; // art -> local
  const on = im => !!(im && im.clipMode === 'frame' && im.frame && im.frame.n && im.frame.n.length >= 3);
  const f = v => (Math.round(v * 100) / 100).toString();
  // ----- geometry -----
  function d(fr) { const N = fr.n, P = q => W2A(fr, q[0], q[1]); if (!N || N.length < 3) return ''; let s = '';
    N.forEach((a, i) => { const p = P([a.x, a.y]); if (!i) s += `M${f(p[0])} ${f(p[1])}`; });
    for (let i = 0; i < N.length; i++) { const a = N[i], b = N[(i + 1) % N.length], q = P([b.x, b.y]);
      if (!a.ox && !a.oy && !b.ix && !b.iy) s += `L${f(q[0])} ${f(q[1])}`;
      else { const c1 = P([a.x + a.ox, a.y + a.oy]), c2 = P([b.x + b.ix, b.y + b.iy]); s += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(q[0])} ${f(q[1])}`; } }
    return s + 'Z'; }
  const seg = (N, i) => { const a = N[i], b = N[(i + 1) % N.length]; return [[a.x, a.y], [a.x + a.ox, a.y + a.oy], [b.x + b.ix, b.y + b.iy], [b.x, b.y]]; };
  const bez = (P, t) => { const u = 1 - t; return [u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0], u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]]; };
  function pts(fr, k = 24) { const out = []; for (let i = 0; i < fr.n.length; i++) { const P = seg(fr.n, i); for (let j = 0; j < k; j++) out.push(bez(P, j / k)); } return out; } // local
  function box(fr) { const p = pts(fr); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }; }
  function auto(N, i) { const a = N[i]; if (a.c) { a.ix = a.iy = a.ox = a.oy = 0; return; } const p = N[(i - 1 + N.length) % N.length], q = N[(i + 1) % N.length];
    const tx = (q.x - p.x) / 6, ty = (q.y - p.y) / 6; a.ox = r2(tx); a.oy = r2(ty); a.ix = r2(-tx); a.iy = r2(-ty); }
  function recentre(fr) { const b = box(fr), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; if (Math.abs(cx) < 0.01 && Math.abs(cy) < 0.01) return; const [ax, ay] = W2A(fr, cx, cy); for (const a of fr.n) { a.x = r2(a.x - cx); a.y = r2(a.y - cy); } fr.x = r2(ax); fr.y = r2(ay); }
  // ----- start shapes -----
  function picBox(im) { const a = imgAspect(im) || 1, w = a >= 1 ? im.size : im.size * a, h = a >= 1 ? im.size / a : im.size; return { x: im.x, y: im.y, w, h }; }
  function shape(kind, im) { const b = picBox(im), rx = b.w / 2 * 0.92, ry = b.h / 2 * 0.92; let n = [];
    if (kind === 'oval') for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4 - Math.PI / 2, c = Math.cos(t), s = Math.sin(t); n.push(nd(rx * c, ry * s, K8 * rx * s, -K8 * ry * c, -K8 * rx * s, K8 * ry * c)); }
    else if (kind === 'rect') [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].forEach(([u, v]) => n.push(nd(u * rx, v * ry, 0, 0, 0, 0, true)));
    else if (kind === 'round') { const r = Math.min(rx, ry) * 0.35, k = r * 0.5523; // two points per corner, straight sides between
      const C4 = [[-rx, -ry], [rx, -ry], [rx, ry], [-rx, ry]];
      for (let i = 0; i < 4; i++) { const c = C4[i], pv = C4[(i + 3) % 4], nx = C4[(i + 1) % 4], u1 = [Math.sign(pv[0] - c[0]), Math.sign(pv[1] - c[1])], u2 = [Math.sign(nx[0] - c[0]), Math.sign(nx[1] - c[1])];
        const a = [c[0] + u1[0] * r, c[1] + u1[1] * r], z = [c[0] + u2[0] * r, c[1] + u2[1] * r];
        n.push(nd(a[0], a[1], 0, 0, -u1[0] * k, -u1[1] * k), nd(z[0], z[1], -u2[0] * k, -u2[1] * k, 0, 0)); } }
    else if (kind === 'path') { const sh = clipShapeOf(im), ps = pathSamples(sh.id, im.clipLine === 'outer' ? 'outer' : 'inner'), P = ps.P; if (!P || P.length < 12) return shape('oval', im);
      let cx = 0, cy = 0; for (const [x, y] of P) { cx += x; cy += y; } cx /= P.length; cy /= P.length; const M = 12, idx = [];
      for (let i = 0; i < M; i++) { const L = ps.len * i / M; let j = ps.cum.findIndex(v => v >= L); if (j < 0) j = 0; idx.push(Math.min(j, P.length - 1)); }
      n = idx.map(j => nd(P[j][0] - cx, P[j][1] - cy)); n.forEach((a, i) => { const p = n[(i - 1 + M) % M], q = n[(i + 1) % M], v1 = [a.x - p.x, a.y - p.y], v2 = [q.x - a.x, q.y - a.y], ang = Math.abs(Math.atan2(v1[0] * v2[1] - v1[1] * v2[0], v1[0] * v2[0] + v1[1] * v2[1])) * 180 / Math.PI; a.c = ang > 50; });
      n.forEach((a, i) => auto(n, i)); return { n, x: r2(cx), y: r2(cy), rot: 0 }; }
    return { n, x: r2(b.x), y: r2(b.y), rot: 0 }; }
  function make(kind, im) { const g = shape(kind, im), fr = Object.assign({ show: true, kind }, g); fr.start = JSON.parse(JSON.stringify({ n: g.n, x: g.x, y: g.y, rot: g.rot, kind })); return fr; }
  // ----- actions (from the panel) -----
  const cur = () => { const im = typeof IM === 'function' ? IM() : null; return on(im) ? im : null; };
  const done = () => { update(); commit(); };
  function start(kind) { const im = IM(); if (!im) return; if (im.frame && im.frame.n && im.frame.n.length && !confirm('Replace your frame with a new ' + ({ oval: 'oval', rect: 'rectangle', round: 'rounded rectangle', path: 'path-shaped' })[kind] + ' frame?')) return;
    const keepShow = im.frame ? im.frame.show !== false : true; im.frame = make(kind, im); im.frame.show = keepShow; im.clipMode = 'frame'; st.edit = true; st.n = -1; done(); }
  function reset() { const im = cur(); if (!im || !im.frame.start) return; const s = JSON.parse(JSON.stringify(im.frame.start)); Object.assign(im.frame, { n: s.n, x: s.x, y: s.y, rot: s.rot }); st.n = -1; done(); toast('Frame back to how it started'); }
  function mm() { return typeof mmPerArt === 'function' ? mmPerArt() : 1; }
  function setSize(v, axis) { const im = cur(); if (!im || !(v > 0)) return; const fr = im.frame, b = box(fr), k = mm(), cw = axis === 'w' ? b.w * k : b.h * k; if (!(cw > 0)) return; const s = v / cw;
    for (const a of fr.n) { if (axis === 'w') { a.x = r2(a.x * s); a.ix = r2(a.ix * s); a.ox = r2(a.ox * s); } else { a.y = r2(a.y * s); a.iy = r2(a.iy * s); a.oy = r2(a.oy * s); } } done(); }
  function setRot(v) { const im = cur(); if (!im || !isFinite(v)) return; im.frame.rot = r2(((v % 360) + 540) % 360 - 180); done(); }
  function addPt() { const im = cur(); if (!im) return; const N = im.frame.n; let i = st.n;
    if (i < 0) { let best = -1, bl = -1; for (let j = 0; j < N.length; j++) { const P = seg(N, j); let L = 0; for (let t = 1; t <= 8; t++) { const a = bez(P, (t - 1) / 8), b = bez(P, t / 8); L += Math.hypot(b[0] - a[0], b[1] - a[1]); } if (L > bl) { bl = L; best = j; } } i = best; }
    const P = seg(N, i), m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], a1 = m(P[0], P[1]), b1 = m(P[1], P[2]), c1 = m(P[2], P[3]), a2 = m(a1, b1), b2 = m(b1, c1), mid = m(a2, b2); // exact split at the middle
    const A = N[i], B = N[(i + 1) % N.length], straight = !A.ox && !A.oy && !B.ix && !B.iy;
    const nn = straight ? nd(mid[0], mid[1], 0, 0, 0, 0, A.c && B.c) : nd(mid[0], mid[1], a2[0] - mid[0], a2[1] - mid[1], b2[0] - mid[0], b2[1] - mid[1], false);
    if (!straight) { A.ox = r2(a1[0] - A.x); A.oy = r2(a1[1] - A.y); B.ix = r2(c1[0] - B.x); B.iy = r2(c1[1] - B.y); }
    N.splice(i + 1, 0, nn); st.n = i + 1; done(); toast('Point added - drag the new dot to change the frame'); }
  function delPt() { const im = cur(); if (!im) return; const N = im.frame.n; if (st.n < 0) { toast('Tap a dot on the frame first'); return; } if (N.length <= 3) { toast('A frame needs at least 3 points'); return; }
    N.splice(st.n, 1); st.n = Math.min(st.n, N.length - 1); done(); }
  function smooth() { const im = cur(); if (!im) return; const N = im.frame.n; if (st.n < 0) { toast('Tap a dot on the frame first'); return; } const a = N[st.n]; a.c = !a.c; auto(N, st.n); done(); }
  function allSmooth(v) { const im = cur(); if (!im) return; const N = im.frame.n; N.forEach(a => { a.c = !v; }); N.forEach((a, i) => auto(N, i)); done(); }
  function centre() { const im = cur(); if (!im) return; const b = picBox(im), fr = im.frame, bb = box(fr), [cx, cy] = W2A(fr, (bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2); fr.x = r2(fr.x + b.x - cx); fr.y = r2(fr.y + b.y - cy); done(); }
  // ----- editor drawing -----
  const upx = () => { const r = stage.getBoundingClientRect(); return X.view.w / Math.max(1, Math.min(r.width, r.height)); };
  function handles(fr) { const b = box(fr), u = upx(), pad = 10 * u, x0 = b.x0 - pad, x1 = b.x1 + pad, y0 = b.y0 - pad, y1 = b.y1 + pad, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const H = { nw: [x0, y0], n: [mx, y0], ne: [x1, y0], e: [x1, my], se: [x1, y1], s: [mx, y1], sw: [x0, y1], w: [x0, my], rot: [mx, y0 - 44 * u] };
    return { b, H, box: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], u }; }
  function overlay() { const im = typeof IM === 'function' ? IM() : null, out = [];
    for (const m of X.S.images) { if (!on(m) || m.visible === false || !m.src) continue; const edit = st.edit && m === im && X.sel.img !== false;
      if (!edit && m.frame.show !== false) out.push(`<path d="${d(m.frame)}" fill="none" stroke="#2a9d8f" stroke-width="2" stroke-dasharray="7 5" vector-effect="non-scaling-stroke" pointer-events="none"/>`); }
    if (!(st.edit && on(im))) return out.join('');
    const fr = im.frame, hd = handles(fr), u = hd.u, P = q => W2A(fr, q[0], q[1]), poly = hd.box.map(P), dd = d(fr), sq = 9 * u, rr = 12 * u;
    out.push(`<g data-k="frm" data-h="body"><path d="${dd}" fill="rgba(42,157,143,0.10)" stroke="none" pointer-events="fill"/></g>`);
    out.push(`<path d="${dd}" fill="none" stroke="#2a9d8f" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
    out.push(`<path d="M${poly.map(q => f(q[0]) + ' ' + f(q[1])).join('L')}Z" fill="none" stroke="#2a9d8f" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
    const top = P(hd.H.n), rot = P(hd.H.rot); out.push(`<path d="M${f(top[0])} ${f(top[1])}L${f(rot[0])} ${f(rot[1])}" stroke="#2a9d8f" stroke-width="1.5" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
    for (const k of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) { const q = P(hd.H[k]); out.push(`<rect data-k="frm" data-h="${k}" x="${f(q[0] - sq)}" y="${f(q[1] - sq)}" width="${f(2 * sq)}" height="${f(2 * sq)}" fill="#fff" stroke="#2a9d8f" stroke-width="2" vector-effect="non-scaling-stroke" transform="rotate(${fr.rot || 0} ${f(q[0])} ${f(q[1])})"/>`); }
    out.push(`<g data-k="frm" data-h="rot"><circle cx="${f(rot[0])}" cy="${f(rot[1])}" r="${f(rr * 1.15)}" fill="#2a9d8f"/><text x="${f(rot[0])}" y="${f(rot[1] + rr * 0.5)}" font-size="${f(rr * 1.5)}" text-anchor="middle" fill="#fff" pointer-events="none">⟳</text></g>`);
    fr.n.forEach((a, i) => { const q = P([a.x, a.y]); out.push(`<circle data-k="frm" data-h="p${i}" cx="${f(q[0])}" cy="${f(q[1])}" r="${f(rr)}" fill="${i === st.n ? '#e0a043' : '#fff'}" stroke="${a.c ? '#7a3b00' : '#2a9d8f'}" stroke-width="3" vector-effect="non-scaling-stroke"/>`); });
    return out.join(''); }
  // ----- dragging -----
  function down(t, p) { const im = cur(); if (!im) return null; const h = t.dataset.h || (t.closest('[data-h]') || { dataset: {} }).dataset.h || 'body', fr = im.frame;
    if (h[0] === 'p') st.n = +h.slice(1);
    const hd = handles(fr); return { frm: true, h, im, f0: JSON.parse(JSON.stringify(fr)), p, b0: hd.b, l0: A2W(fr, p.x, p.y) }; }
  function move(g, p) { const fr = g.im.frame, f0 = g.f0, h = g.h;
    if (h === 'body') { fr.x = r2(f0.x + p.x - g.p.x); fr.y = r2(f0.y + p.y - g.p.y); }
    else if (h[0] === 'p') { const i = +h.slice(1), l = A2W(f0, p.x, p.y), a = fr.n[i]; a.x = r2(l[0]); a.y = r2(l[1]); const N = fr.n, L = N.length; [i, (i - 1 + L) % L, (i + 1) % L].forEach(j => { if (!N[j].c) auto(N, j); }); }
    else if (h === 'rot') { const a0 = Math.atan2(g.p.y - f0.y, g.p.x - f0.x), a1 = Math.atan2(p.y - f0.y, p.x - f0.x); let r = (f0.rot || 0) + (a1 - a0) * 180 / Math.PI; const sn = Math.round(r / 15) * 15; if (Math.abs(r - sn) < 3) r = sn; fr.rot = r2(((r % 360) + 540) % 360 - 180); }
    else { const l = A2W(f0, p.x, p.y), b = g.b0, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, pad = 10 * upx(); let sx = 1, sy = 1;
      const fx = Math.max(0.05, (Math.abs(l[0] - cx) - pad) / Math.max(1e-6, b.w / 2)), fy = Math.max(0.05, (Math.abs(l[1] - cy) - pad) / Math.max(1e-6, b.h / 2));
      if (h === 'e' || h === 'w') sx = fx; else if (h === 'n' || h === 's') sy = fy; else { const k = Math.max(fx, fy); sx = sy = k; } // corners keep the shape, sides stretch one way
      fr.n = f0.n.map(a => nd(cx + (a.x - cx) * sx, cy + (a.y - cy) * sy, a.ix * sx, a.iy * sy, a.ox * sx, a.oy * sy, a.c)); }
    render(); fields(); }
  function up(g, moved) { if (moved && g.h[0] === 'p') recentre(g.im.frame); }
  // ----- panel -----
  function fields() { const im = cur(), box0 = $('imgFrameBox'); if (!box0) return; const set = (id, v) => { const el = $(id); if (el && document.activeElement !== el) el.value = v; };
    if (!im) return; const b = box(im.frame), k = mm(); set('frW', r2(b.w * k)); set('frH', r2(b.h * k)); set('frRot', r2(im.frame.rot || 0));
    const np = st.n >= 0 && st.n < im.frame.n.length; $('frDel').disabled = !np; $('frSmooth').disabled = !np; $('frSmooth').textContent = np && im.frame.n[st.n].c ? '◠ Make smooth' : '⌃ Make corner';
    $('frEdit').textContent = st.edit ? '✓ Done editing frame' : '✎ Edit frame on the picture'; $('frEdit').classList.toggle('accent', !st.edit); $('frEditRows').hidden = !st.edit; $('frShow').checked = im.frame.show !== false;
    const r = (X.S.laser && X.S.laser['frm:' + im.id]) || 'off'; if (document.activeElement !== $('frBurn')) $('frBurn').value = r;
    $('frBurnHint').textContent = r === 'off' ? 'Not burned: the frame only trims the picture. Nothing extra goes in the laser files.' : r === 'etch' ? 'The frame line is etched as a thin line (Etch lines step). Check the files before you burn.' : r === 'cutin' ? 'The frame line is CUT (Cut inside step, before the outside cut). This cuts a hole in the wood - check before you burn.' : 'The frame line is CUT in the outside cut step (last). Check before you burn.'; }
  function sync() { const im = typeof IM === 'function' ? IM() : null, box0 = $('imgFrameBox'); if (!box0) return; const show = !!(im && im.clipMode === 'frame'); box0.hidden = !show; if (!show) { if (!im || im.clipMode !== 'frame') st.edit = false; return; }
    if (!on(im)) { im.frame = make('oval', im); st.edit = true; st.n = -1; X.sel.img = true; render(); } if (st.n >= im.frame.n.length) st.n = -1; fields(); }
  function init() { const b = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    document.querySelectorAll('[data-frstart]').forEach(el => el.addEventListener('click', () => start(el.dataset.frstart)));
    b('frEdit', () => { st.edit = !st.edit; st.n = -1; if (st.edit) X.sel.img = true; update(); }); b('frReset', reset); b('frAdd', addPt); b('frDel', delPt); b('frSmooth', smooth); b('frCentre', centre);
    b('frAllSmooth', () => allSmooth(true)); b('frAllCorner', () => allSmooth(false));
    const ch = (id, fn) => { const el = $(id); if (!el) return; el.addEventListener('change', () => { fn(parseFloat(el.value)); fields(); }); el.addEventListener('keydown', e => { if (e.key === 'Enter') el.blur(); }); };
    ch('frW', v => setSize(v, 'w')); ch('frH', v => setSize(v, 'h')); ch('frRot', setRot);
    $('frShow').addEventListener('change', () => { const im = cur(); if (im) { im.frame.show = $('frShow').checked; done(); } });
    $('frBurn').addEventListener('change', () => { const im = cur(); if (!im) return; X.S.laser['frm:' + im.id] = $('frBurn').value; if (X.S.laser['frm:' + im.id] === 'off') delete X.S.laser['frm:' + im.id]; done(); }); }
  return { st, on, d, box, make, shape, start, reset, setSize, setRot, addPt, delPt, smooth, centre, overlay, down, move, up, sync, init, fields, W2A, A2W, picBox };
};
