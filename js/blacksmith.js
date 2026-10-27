// Wayland the blacksmith: tiny inline-SVG mascot with a few poses. No external assets.
(function () {
  const SK = '#f1c49a', SKD = '#d99a6c', BE = '#b5562a', BED = '#8a3b1a', AP = '#6e4223', APL = '#8c5a33', SH = '#e8d6b4', SHD = '#cdb48c', BD = '#e0a043', INK = '#2b1d14', MET = '#8d939a', METD = '#5c6168';
  const arm = (d, w, c) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const hand = (x, y, r = 7.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/>`;
  // right (viewer-right) arm variants: upper sleeve + forearm + hand/prop
  const POSES = {
    wave: () => arm('M110 112 Q124 104 128 92', 15, SH) + arm('M128 92 Q134 78 136 64', 12, SK) +
      `<g transform="translate(137 56) rotate(12)"><rect x="-8" y="-9" width="16" height="16" rx="7" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/>` +
      [-6, -2, 2, 6].map(x => `<rect x="${x - 1.8}" y="-17" width="3.6" height="10" rx="1.8" fill="${SK}" stroke="${SKD}" stroke-width="1.2"/>`).join('') +
      `<rect x="7" y="-4" width="8" height="4" rx="2" fill="${SK}" stroke="${SKD}" stroke-width="1.2" transform="rotate(-30 7 -2)"/></g>` +
      `<path d="M150 44 q6 8 2 18 M156 38 q9 12 3 26" fill="none" stroke="${BD}" stroke-width="2.5" stroke-linecap="round"/>`,
    point: () => arm('M110 112 Q126 108 136 102', 15, SH) + arm('M136 102 L150 96', 12, SK) +
      `<g transform="translate(153 95) rotate(-20)"><rect x="-6" y="-7" width="13" height="14" rx="6" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/>` +
      `<rect x="3" y="-6" width="15" height="4.6" rx="2.3" fill="${SK}" stroke="${SKD}" stroke-width="1.2"/></g>`,
    hammer: () => `<g transform="rotate(-18 136 68)"><rect x="133" y="24" width="6" height="56" rx="3" fill="#9a6a3c" stroke="#5e3b1c" stroke-width="1.5"/>` +
      `<rect x="118" y="14" width="36" height="17" rx="3" fill="${MET}" stroke="${METD}" stroke-width="2"/><rect x="118" y="14" width="8" height="17" rx="2" fill="${METD}"/>` +
      `<path d="M150 17 h3 M150 28 h3" stroke="#c6ccd2" stroke-width="1.5"/></g>` +
      arm('M110 112 Q124 102 128 90', 15, SH) + arm('M128 90 Q132 80 133 72', 12, SK) + hand(134, 68, 8) +
      `<path d="M156 6 l4 -5 M163 14 l6 -2 M160 24 l6 3" stroke="${BD}" stroke-width="2.5" stroke-linecap="round"/>`,
    thumbs: () => arm('M110 112 Q126 118 130 128', 15, SH) + arm('M130 128 Q138 120 138 110', 12, SK) +
      `<rect x="129" y="96" width="17" height="16" rx="6" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/>` +
      `<path d="M131 99 h13 M131 104 h13" stroke="${SKD}" stroke-width="1.1"/>` +
      `<rect x="131" y="80" width="6.5" height="19" rx="3.2" fill="${SK}" stroke="${SKD}" stroke-width="1.4"/>` +
      `<path d="M152 72 l3 -6 l3 6 l6 1 l-5 4 l2 6 l-6 -3 l-6 3 l2 -6 l-5 -4 z" fill="${BD}"/><path d="M150 92 l6 -2 M152 100 l6 1" stroke="${BD}" stroke-width="2.5" stroke-linecap="round"/>`,
  };
  // expressions: brows + mouth
  const FACE = {
    happy: { brow: 'M62 48 q7 -5 13 -1 M85 47 q6 -4 13 1', mouth: `<path d="M71 82 q9 9 18 0 q-9 4 -18 0z" fill="#7a2a1a"/>` },
    talk: { brow: 'M62 47 q7 -6 13 -2 M85 45 q6 -4 13 2', mouth: `<ellipse cx="80" cy="84" rx="6" ry="5" fill="#7a2a1a"/><ellipse cx="80" cy="86.5" rx="3.5" ry="2" fill="#d76b5a"/>` },
    proud: { brow: 'M62 46 q7 -7 13 -2 M85 44 q6 -5 13 2', mouth: `<path d="M69 80 q11 13 22 0 q-11 5 -22 0z" fill="#7a2a1a"/><path d="M72 81.5 q8 3 16 0" stroke="#fff" stroke-width="2" fill="none"/>` },
  };
  const FACE_FOR = { wave: 'happy', point: 'talk', hammer: 'proud', thumbs: 'proud' };
  function svg(pose = 'wave', face) {
    const f = FACE[face || FACE_FOR[pose] || 'happy'], P = POSES[pose] || POSES.wave;
    return `<svg class="wf-smith" viewBox="0 0 170 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<ellipse cx="82" cy="182" rx="44" ry="6" fill="#000" opacity=".18"/>
<rect x="60" y="160" width="17" height="20" rx="4" fill="#3a2a1e"/><rect x="83" y="160" width="17" height="20" rx="4" fill="#3a2a1e"/>
<path d="M55 178 h24 v-6 h-20 q-5 0 -4 6z M81 178 h24 q1 -6 -4 -6 h-20z" fill="${INK}"/>
${arm('M50 112 Q38 126 42 146', 15, SH)}${arm('M42 146 L44 152', 12, SK)}${hand(44, 154, 8)}
<path d="M48 104 q32 -14 64 0 l4 58 q-36 8 -72 0z" fill="${SH}" stroke="${SHD}" stroke-width="1.5"/>
<path d="M56 108 L64 100 M104 108 L96 100" stroke="${AP}" stroke-width="5" stroke-linecap="round"/>
<path d="M58 106 h44 l6 60 q-28 7 -56 0z" fill="${AP}" stroke="#4b2c16" stroke-width="2"/>
<path d="M60 112 h40" stroke="${APL}" stroke-width="2"/>
<rect x="68" y="132" width="24" height="16" rx="3" fill="${APL}" stroke="#4b2c16" stroke-width="1.5"/>
<path d="M80 132 v16" stroke="#4b2c16" stroke-width="1.2"/>
<circle cx="61" cy="110" r="2.3" fill="${BD}"/><circle cx="99" cy="110" r="2.3" fill="${BD}"/>
${P()}
<ellipse cx="50" cy="64" rx="6" ry="8" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/><ellipse cx="110" cy="64" rx="6" ry="8" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/>
<circle cx="80" cy="60" r="31" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/>
<path d="M49 54 q-1 -24 31 -27 q32 3 31 27 q-6 -12 -31 -13 q-25 1 -31 13z" fill="${BED}"/>
<path d="M49 40 q31 -20 62 0 l-1 9 q-30 -14 -60 0z" fill="${BD}" stroke="#a8701f" stroke-width="1.5"/>
<path d="M110 44 q10 -2 12 6 q-7 -1 -11 3z" fill="${BD}" stroke="#a8701f" stroke-width="1.2"/>
<path d="M50 62 q-4 30 14 44 q8 8 16 8 q8 0 16 -8 q18 -14 14 -44 q-4 10 -12 12 q-6 -8 -18 -8 q-12 0 -18 8 q-8 -2 -12 -12z" fill="${BE}" stroke="${BED}" stroke-width="1.5"/>
<path d="M60 86 q4 10 8 14 M72 92 q2 9 4 15 M88 92 q-2 9 -4 15 M100 86 q-4 10 -8 14" stroke="${BED}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
${f.mouth}
<path d="M80 72 q-10 -2 -18 6 q8 2 18 -1 q10 3 18 1 q-8 -8 -18 -6z" fill="${BE}" stroke="${BED}" stroke-width="1.5"/>
<ellipse cx="80" cy="67" rx="7" ry="6" fill="#e9a47c" stroke="${SKD}" stroke-width="1.3"/><ellipse cx="78" cy="65" rx="2" ry="1.4" fill="#fff" opacity=".6"/>
<ellipse cx="69" cy="57" rx="3.6" ry="4.4" fill="${INK}"/><ellipse cx="91" cy="57" rx="3.6" ry="4.4" fill="${INK}"/>
<circle cx="70.2" cy="55.6" r="1.3" fill="#fff"/><circle cx="92.2" cy="55.6" r="1.3" fill="#fff"/>
<ellipse cx="61" cy="68" rx="5" ry="3" fill="#e8907a" opacity=".45"/><ellipse cx="99" cy="68" rx="5" ry="3" fill="#e8907a" opacity=".45"/>
<path d="${f.brow}" stroke="${BED}" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;
  }
  window.WFSmith = { svg, poses: Object.keys(POSES) };
})();
