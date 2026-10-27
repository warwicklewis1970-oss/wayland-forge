// Guided tour + tips with Wayland the blacksmith. Self-contained; uses window.WF and window.WFSmith.
(function () {
  const $ = id => document.getElementById(id), KEY = 'wf-help';
  const cfg = Object.assign({ icon: true, tips: true, offered: false, tipSeen: {} }, (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } };
  const smith = (pose, cls) => WFSmith.svg(pose).replace('class="wf-smith"', `class="wf-smith ${cls || ''}"`);
  const head = () => WFSmith.svg('wave').replace('viewBox="0 0 170 190"', 'viewBox="38 22 84 84"').replace('class="wf-smith"', 'class="wf-smith head"');
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; for (let e = el; e; e = e.parentElement) { if (e.hidden) return false; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
  const pick = (...sels) => { for (const s of sels) { const e = typeof s === 'function' ? s() : document.querySelector(s); if (e && (e.getBoundingClientRect || e.rect)) { if (e.rect || vis(e)) return e; } } return null; };
  const lbl = s => () => { const e = document.querySelector(s); return e && (e.closest('label') || e); };
  const lettersBox = () => { // union of all glyph boxes on the stage (the ring of text)
    const ps = [...document.querySelectorAll('#stage path[data-k="ch"]')]; if (!ps.length) return null;
    let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9; ps.forEach(p => { const r = p.getBoundingClientRect(); x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom); });
    const st = $('stage').getBoundingClientRect(); x1 = Math.max(x1, st.left); y1 = Math.max(y1, st.top); x2 = Math.min(x2, st.right); y2 = Math.min(y2, st.bottom);
    return { rect: { left: x1, top: y1, right: x2, bottom: y2, width: x2 - x1, height: y2 - y1 } };
  };
  // ---- the steps (plain English, short) ----
  const STEPS = [
    { topic: 'start', pose: 'wave', title: "Hi, I'm Wayland!", text: "I'm the smith of this forge. I'll show you round in a minute or two. Tap <b>Next</b> to go on, or <b>Skip</b> any time." },
    { topic: 'shape', sec: 'sec-shape', t: [lbl('[data-b="base.shape"]')], pose: 'point', title: 'Pick a shape', text: 'Choose a circle, ellipse, polygon, star or heart. That is the badge your words will wrap round.' },
    { topic: 'shape', sec: 'sec-shape', t: [lbl('[data-b="base.gap"]')], pose: 'point', title: 'Ring and lines', text: '<b>Ring gap</b> is the space between the two lines where text sits. <b>Line width</b> makes the lines thicker or thinner (0 hides them).' },
    { topic: 'text', sec: 'sec-text', t: [lbl('[data-b="layer.text"]'), '#addLayer'], pose: 'point', title: 'Type your words', text: 'Type in the <b>Text</b> box and it bends round the badge straight away.' },
    { topic: 'text', sec: 'sec-text', t: [lbl('[data-b="layer.side"]'), '#addLayer'], pose: 'point', title: 'Top and bottom text', text: 'Each line of text is a <b>layer</b>. Set <b>Side</b> to Top or Bottom. <b>+ Add</b> makes a new layer; <b>Duplicate to opposite side</b> copies it underneath.' },
    { topic: 'text', sec: 'sec-text', t: [lbl('#fontSel'), '#addLayer'], pose: 'point', title: 'Fonts', text: 'Pick a <b>Font</b> and <b>Colour</b> for this layer. <b>Sits</b> puts the text between the lines, outside or inside.' },
    { topic: 'text', sec: 'sec-text', t: [lbl('[data-b="layer.size"]'), '#addLayer'], pose: 'point', title: 'Size and spacing', text: '<b>Size</b> makes letters bigger, <b>Rotate</b> slides them round, <b>Spacing</b> spreads them out and <b>Lift</b> moves them in or out.' },
    { topic: 'letters', t: [lettersBox, '#stage'], pose: 'point', try: 'letters', title: 'Try it: tap a letter', text: 'Tap (or click) any single letter on the badge to select it, then drag it to move it. Have a go, or just tap Next.' },
    { topic: 'letters', t: ['#multiBtn'], pose: 'point', title: 'Select several letters', text: 'Turn on <b>Multi-select</b>, then each tap adds or removes a letter, even ones far apart. On a computer you can also hold Shift or Ctrl while clicking.' },
    { topic: 'letters', sec: 'sec-letter', t: ['#multiBtn2'], pose: 'point', title: 'Letter edit', text: 'Here you can rotate, resize or nudge the selected letters with the arrows. <b>Reset</b> puts them back.' },
    { topic: 'image', sec: 'sec-img', t: ['#sec-img .filebtn'], pose: 'point', title: 'Centre picture', text: 'Tap <b>Upload…</b> to put a picture or logo in the middle of the badge.' },
    { topic: 'image', sec: 'sec-img', t: ['#fitImg', '#sec-img .filebtn'], pose: 'hammer', title: 'Fit inside or Fill & clip', text: () => (WF.state.image ? '' : 'Once you have a picture you get these: ') + '<b>Fit inside line</b> shrinks the whole picture to sit inside the inner line. <b>Fill &amp; clip</b> fills the shape and trims the edges neatly.' },
    { topic: 'image', sec: 'sec-img', t: [lbl('[data-b="img.mode"]'), '#sec-img .filebtn'], pose: 'hammer', title: 'Silhouette and vector trace', text: '<b>Style</b> can turn a photo into a solid <b>Silhouette</b>, or a <b>Vector trace</b> made of real paths that are great for cutting machines and print.' },
    { topic: 'decor', sec: 'sec-orn', t: ['#addStar'], pose: 'point', title: 'Ornaments', text: 'Add stars or dots, then drag them where you like. <b>Mirror copy</b> makes a matching one on the other side.' },
    { topic: 'decor', sec: 'sec-col', t: ['#sec-col > .body'], pose: 'point', title: 'Colours and background', text: 'Choose a see-through or solid background. Tap a swatch to colour the selected text or ornament, and save your own colours.' },
    { topic: 'finish', t: ['#undoBtn'], pose: 'point', title: 'Oops? Undo!', text: 'Made a mistake? <b>Undo</b> steps back, <b>Redo</b> steps forward again. Nothing is lost.' },
    { topic: 'finish', sec: 'sec-export', t: [lbl('#exPreset')], pose: 'point', title: 'Export for Printify', text: 'For Printify choose the <b>Printify 4500px</b> preset: it makes a big transparent PNG ready to upload.' },
    { topic: 'finish', sec: 'sec-export', t: [lbl('#exFmt')], pose: 'point', title: 'PDF or SVG for print', text: 'For a printer or a cutting machine pick <b>PDF vector</b> or <b>SVG vector</b>: sharp at any size. Then tap <b>Export</b>.' },
    { topic: 'finish', sec: 'sec-proj', t: ['#saveProj'], pose: 'point', title: 'Save your project', text: 'Your work saves itself in this browser. <b>Save</b> also downloads a project file you can <b>Load</b> later or on another device.' },
    { topic: 'install', t: ['#installBtn', '#helpBtn'], pose: 'thumbs', title: 'Install the app', text: () => vis($('installBtn')) ? 'Tap <b>Install</b> to put Wayland Forge on your home screen or desktop. It works offline too.' : 'To install: in Chrome tap the <b>⋮</b> menu and choose <b>Install app</b> (or <b>Add to Home screen</b>). On a computer, use the install icon in the address bar.' },
    { topic: 'end', t: ['#helpBtn'], pose: 'thumbs', title: "That's the lot!", text: () => (vis($('helpBtn')) ? 'Tap my face up here any time to see the tour again or learn one topic.' : 'Open <b>Project → Help &amp; tutorial</b> any time to see the tour again.') + ' Happy forging!' },
  ];
  const TOPICS = [['shape', 'Shapes and lines'], ['text', 'Typing text, fonts and size'], ['letters', 'Selecting and moving letters'], ['image', 'Centre picture, fit and trace'], ['decor', 'Ornaments and colours'], ['finish', 'Undo, export and save'], ['install', 'Installing the app']];
  // ---- DOM ----
  const ov = document.createElement('div'); ov.id = 'wfTour'; ov.hidden = true;
  ov.innerHTML = '<div id="wfDim"></div><div id="wfSpot"></div><div id="wfBubble" role="dialog" aria-live="polite"><div class="sm"></div><div class="tx"><div class="hd"><b></b><span class="ct"></span></div><div class="bd"></div><div class="ok" hidden></div><div class="bt"><button class="skip">Skip</button><span class="grow"></span><button class="back">Back</button><button class="next accent">Next</button></div></div></div>';
  document.body.appendChild(ov);
  const spot = ov.querySelector('#wfSpot'), dim = ov.querySelector('#wfDim'), bub = ov.querySelector('#wfBubble'), q = s => bub.querySelector(s);
  let run = null, tick = null;
  function start(topic) {
    closeCard(); const list = STEPS.filter(s => !topic || s.topic === topic);
    run = { list, i: 0, topic }; ov.hidden = false; document.body.classList.add('wf-touring'); show();
    clearInterval(tick); tick = setInterval(() => { if (run) { position(); tryCheck(); } }, 350);
  }
  function stop() { run = null; ov.hidden = true; document.body.classList.remove('wf-touring'); clearInterval(tick); cfg.offered = true; save(); }
  function target(st) { return st.t ? pick(...st.t) : null; }
  function show() {
    const st = run.list[run.i];
    if (st.sec) { WF.openSec(st.sec); }
    if (WF.isSheet()) { const inSheet = st.sec || (st.t || []).some(t => typeof t === 'string' && t.startsWith('#sec')); WF.setSnap(inSheet ? 'small' : 'collapsed'); if (!inSheet) WF.setSnap('small'); }
    q('.sm').innerHTML = smith(st.pose);
    q('.hd b').textContent = st.title; q('.ct').textContent = `${run.i + 1} / ${run.list.length}`;
    q('.bd').innerHTML = typeof st.text === 'function' ? st.text() : st.text;
    q('.ok').hidden = true; run.base = st.try === 'letters' ? WF.sel.letters.length : null;
    q('.back').disabled = run.i === 0; q('.next').textContent = run.i === run.list.length - 1 ? 'Done' : 'Next';
    const el = target(st); run.el = el;
    if (el && !el.rect) { const pan = document.getElementById('panel'); if (pan.contains(el)) el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    position(); setTimeout(position, 60); setTimeout(position, 320);
  }
  function rectOf(el) { return el.rect || el.getBoundingClientRect(); }
  function position() {
    if (!run) return; const st = run.list[run.i]; let el = run.el;
    if (el && !el.rect && !vis(el)) el = run.el = target(st); else if (el && el.rect) el = run.el = target(st);
    const vw = innerWidth, vh = innerHeight, m = 8, gap = 12;
    bub.style.width = Math.min(380, vw - 2 * m) + 'px';
    const bw = bub.offsetWidth, bh = bub.offsetHeight;
    if (!el) { spot.hidden = true; dim.hidden = false; bub.style.left = (vw - bw) / 2 + 'px'; bub.style.top = Math.max(m, (vh - bh) / 2) + 'px'; bub.dataset.place = 'centre'; return; }
    const r0 = rectOf(el), pad = 6, r = { left: r0.left - pad, top: r0.top - pad, right: r0.right + pad, bottom: r0.bottom + pad };
    r.width = r.right - r.left; r.height = r.bottom - r.top;
    spot.hidden = false; dim.hidden = true;
    Object.assign(spot.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const clampX = x => Math.max(m, Math.min(vw - bw - m, x)), clampY = y => Math.max(m, Math.min(vh - bh - m, y));
    const cx = clampX(r.left + r.width / 2 - bw / 2), cy = clampY(r.top + r.height / 2 - bh / 2);
    const C = [['below', cx, r.bottom + gap], ['above', cx, r.top - gap - bh], ['left', r.left - gap - bw, cy], ['right', r.right + gap, cy]];
    const order = WF.isSheet() ? ['above', 'below', 'left', 'right'] : ['left', 'below', 'above', 'right'];
    const fits = ([, x, y]) => x >= m - 0.5 && y >= m - 0.5 && x + bw <= vw - m + 0.5 && y + bh <= vh - m + 0.5;
    let c = order.map(n => C.find(k => k[0] === n)).find(fits);
    if (!c) { // nothing fits cleanly (huge target): use the biggest free side, clamped
      const space = { below: vh - r.bottom, above: r.top, left: r.left, right: vw - r.right };
      const n = Object.keys(space).sort((a, b) => space[b] - space[a])[0], k = C.find(z => z[0] === n); c = [n, clampX(k[1]), clampY(k[2])];
    }
    bub.style.left = c[1] + 'px'; bub.style.top = c[2] + 'px'; bub.dataset.place = c[0];
  }
  function tryCheck() {
    const st = run.list[run.i];
    if (st.try === 'letters' && run.base !== null && WF.sel.letters.length > run.base) { run.base = null; q('.ok').hidden = false; q('.ok').textContent = 'Nice one! You can drag it to move it. Tap Next when ready.'; q('.sm').innerHTML = smith('thumbs'); }
  }
  q('.next').onclick = () => { if (run.i < run.list.length - 1) { run.i++; show(); } else stop(); };
  q('.back').onclick = () => { if (run.i > 0) { run.i--; show(); } };
  q('.skip').onclick = stop;
  document.addEventListener('keydown', e => { if (!run) return; if (e.key === 'Escape') stop(); else if (e.key === 'ArrowRight' && !e.target.matches('input,select,textarea')) q('.next').click(); else if (e.key === 'ArrowLeft' && !e.target.matches('input,select,textarea')) q('.back').click(); }, true);
  addEventListener('resize', () => { if (run) setTimeout(position, 50); });
  // ---- cards: welcome offer + help menu ----
  const card = document.createElement('div'); card.id = 'wfCard'; card.hidden = true; card.setAttribute('role', 'dialog'); document.body.appendChild(card);
  function closeCard() { card.hidden = true; }
  function openCard(kind) {
    const topics = TOPICS.map(([k, n]) => `<button data-topic="${k}">${n}</button>`).join('');
    card.innerHTML = `<div class="sm">${smith(kind === 'welcome' ? 'wave' : 'hammer')}</div><div class="tx">` + (kind === 'welcome'
      ? `<b>Hi, I'm Wayland, the blacksmith!</b><p>New to the forge? Want a quick tour? It takes about two minutes.</p>
         <div class="row"><button class="accent" data-a="tour">Yes, show me round</button><button data-a="topics">Pick a topic</button><button data-a="close">Not now</button></div>
         <label class="chk"><input type="checkbox" data-a="never">Don't show this again</label>`
      : kind === 'topics' ? `<b>What would you like to learn?</b><div class="topics">${topics}</div><div class="row"><button data-a="tour" class="accent">Whole tour</button><button data-a="close">Close</button></div>`
      : `<b>Help &amp; tutorial</b><div class="row"><button class="accent" data-a="tour">▶ Full tour</button><button data-a="topics">Pick a topic</button></div>
         <label class="chk"><input type="checkbox" data-a="tips"${cfg.tips ? ' checked' : ''}>Show tips</label>
         <label class="chk"><input type="checkbox" data-a="icon"${cfg.icon ? ' checked' : ''}>Show this help button</label>
         <p class="dim">If you hide the button, you can bring it back in <b>Project → Help &amp; tutorial</b>.</p>
         <div class="row"><button data-a="close">Close</button></div>`) + '</div>';
    card.hidden = false; card.dataset.kind = kind;
  }
  card.addEventListener('click', e => {
    const a = e.target.dataset.a, tp = e.target.dataset.topic;
    if (tp) { start(tp); return; }
    if (a === 'tour') start(); else if (a === 'topics') openCard('topics'); else if (a === 'close') { closeCard(); cfg.offered = true; save(); }
  });
  card.addEventListener('change', e => {
    const a = e.target.dataset.a;
    if (a === 'never') { cfg.tips = !e.target.checked; cfg.offered = true; }
    if (a === 'tips') cfg.tips = e.target.checked;
    if (a === 'icon') cfg.icon = e.target.checked;
    save(); applyCfg();
  });
  // ---- tips: one short hint the first time each section is opened ----
  const TIPS = { 'sec-shape': 'Tip: change the Type to try a star or a heart.', 'sec-text': 'Tip: each line of words is a layer. Use Side to put it on top or bottom.', 'sec-letter': 'Tip: tap a letter on the badge first, then fine-tune it here.', 'sec-orn': 'Tip: add a star, then drag it into place on the badge.', 'sec-img': 'Tip: after uploading, tap Fit inside line to make the picture fit.', 'sec-col': 'Tip: tap a swatch to colour the selected text.', 'sec-export': 'Tip: Printify 4500px is ready for Printify; PDF is best for printers.', 'sec-proj': 'Tip: Save downloads a project file you can load later.' };
  const toast = document.createElement('div'); toast.id = 'wfTip'; toast.hidden = true; document.body.appendChild(toast); let tT;
  function tip(id) {
    if (!cfg.tips || run || !card.hidden || cfg.tipSeen[id] || !TIPS[id]) return;
    cfg.tipSeen[id] = 1; save();
    toast.innerHTML = `<span class="sm">${head()}</span><span>${TIPS[id]}</span><button aria-label="Close tip">✕</button>`; toast.hidden = false;
    toast.querySelector('button').onclick = () => { toast.hidden = true; };
    clearTimeout(tT); tT = setTimeout(() => { toast.hidden = true; }, 7000);
  }
  document.querySelectorAll('aside details').forEach(d => d.addEventListener('toggle', () => { if (d.open && document.body.dataset.ready === '1') setTimeout(() => tip(d.id), 150); }));
  // ---- toolbar button + Project section controls ----
  const hb = $('helpBtn'); hb.innerHTML = head(); hb.onclick = () => (card.hidden ? openCard('menu') : closeCard());
  $('helpTour').onclick = () => start(); $('helpTopics').onclick = () => openCard('topics');
  $('helpIconChk').onchange = e => { cfg.icon = e.target.checked; save(); applyCfg(); };
  $('helpTipsChk').onchange = e => { cfg.tips = e.target.checked; save(); applyCfg(); };
  function applyCfg() { hb.hidden = !cfg.icon; $('helpIconChk').checked = cfg.icon; $('helpTipsChk').checked = cfg.tips; document.body.classList.toggle('wf-nohelp', !cfg.icon); }
  applyCfg();
  // first ever visit: friendly offer once the app is ready
  const offer = () => { if (!cfg.offered && cfg.tips) openCard('welcome'); };
  if (document.body.dataset.ready === '1') setTimeout(offer, 400);
  else new MutationObserver((_, o) => { if (document.body.dataset.ready === '1') { o.disconnect(); setTimeout(offer, 400); } }).observe(document.body, { attributes: true, attributeFilter: ['data-ready'] });
  window.WFTour = { start, stop, openCard, closeCard, steps: STEPS, topics: TOPICS, cfg, get running() { return run; }, target: i => run && run.el };
})();
