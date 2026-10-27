// Wayland the master smith (bald, big white beard, dark shirt, leather apron): tiny inline-SVG mascot with a few poses. No external assets.
(function () {
  const SK = '#eebd92', SKD = '#cf8f62', BE = '#f2f2f4', BED = '#a3a6b0', BR = '#8f939c', AP = '#6e4223', APL = '#8c5a33', SH = '#2b2d34', SHD = '#15161a', BD = '#e0a043', INK = '#2b1d14', MET = '#8d939a', METD = '#5c6168';
  const arm = (d, w, c) => (c === SH ? `<path d="${d}" fill="none" stroke="#55596a" stroke-width="${w + 3}" stroke-linecap="round" stroke-linejoin="round"/>` : '') + `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const hand = (x, y, r = 7.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/>`;
  // right (viewer-right) arm variants: upper sleeve + forearm + hand/prop
  const POSES = {
    wave: () => arm('M114 112 Q124 104 128 92', 15, SH) + arm('M128 92 Q134 78 136 64', 12, SK) +
      `<g transform="translate(137 56) rotate(12)"><rect x="-8" y="-9" width="16" height="16" rx="7" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/>` +
      [-6, -2, 2, 6].map(x => `<rect x="${x - 1.8}" y="-17" width="3.6" height="10" rx="1.8" fill="${SK}" stroke="${SKD}" stroke-width="1.2"/>`).join('') +
      `<rect x="7" y="-4" width="8" height="4" rx="2" fill="${SK}" stroke="${SKD}" stroke-width="1.2" transform="rotate(-30 7 -2)"/></g>` +
      `<path d="M150 44 q6 8 2 18 M156 38 q9 12 3 26" fill="none" stroke="${BD}" stroke-width="2.5" stroke-linecap="round"/>`,
    point: () => arm('M114 112 Q126 108 136 102', 15, SH) + arm('M136 102 L150 96', 12, SK) +
      `<g transform="translate(153 95) rotate(-20)"><rect x="-6" y="-7" width="13" height="14" rx="6" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/>` +
      `<rect x="3" y="-6" width="15" height="4.6" rx="2.3" fill="${SK}" stroke="${SKD}" stroke-width="1.2"/></g>`,
    hammer: () => `<g transform="rotate(-18 136 68)"><rect x="133" y="24" width="6" height="56" rx="3" fill="#9a6a3c" stroke="#5e3b1c" stroke-width="1.5"/>` +
      `<rect x="118" y="14" width="36" height="17" rx="3" fill="${MET}" stroke="${METD}" stroke-width="2"/><rect x="118" y="14" width="8" height="17" rx="2" fill="${METD}"/>` +
      `<path d="M150 17 h3 M150 28 h3" stroke="#c6ccd2" stroke-width="1.5"/></g>` +
      arm('M114 112 Q124 102 128 90', 15, SH) + arm('M128 90 Q132 80 133 72', 12, SK) + hand(134, 68, 8) +
      `<path d="M156 6 l4 -5 M163 14 l6 -2 M160 24 l6 3" stroke="${BD}" stroke-width="2.5" stroke-linecap="round"/>`,
    thumbs: () => arm('M114 112 Q126 118 130 128', 15, SH) + arm('M130 128 Q138 120 138 110', 12, SK) +
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
${arm('M46 112 Q34 126 42 146', 15, SH)}${arm('M42 146 L44 152', 12, SK)}${hand(44, 154, 8)}
<path d="M42 106 q38 -18 76 0 l2 56 q-40 9 -80 0z" fill="${SH}" stroke="#55596a" stroke-width="1.5"/>
<path d="M56 108 L64 100 M104 108 L96 100" stroke="${AP}" stroke-width="5" stroke-linecap="round"/>
<path d="M58 106 h44 l6 60 q-28 7 -56 0z" fill="${AP}" stroke="#4b2c16" stroke-width="2"/>
<path d="M60 112 h40" stroke="${APL}" stroke-width="2"/>
<rect x="68" y="132" width="24" height="16" rx="3" fill="${APL}" stroke="#4b2c16" stroke-width="1.5"/>
<path d="M80 132 v16" stroke="#4b2c16" stroke-width="1.2"/>
<circle cx="61" cy="110" r="2.3" fill="${BD}"/><circle cx="99" cy="110" r="2.3" fill="${BD}"/>
${P()}
<ellipse cx="50" cy="64" rx="6" ry="8" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/><ellipse cx="110" cy="64" rx="6" ry="8" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/>
<circle cx="80" cy="60" r="31" fill="${SK}" stroke="${SKD}" stroke-width="1.5"/>
<path d="M49 52 q-4 8 -2 18 q5 -2 7 -9 q-2 -6 -5 -9z M111 52 q4 8 2 18 q-5 -2 -7 -9 q2 -6 5 -9z" fill="#dcdde2" stroke="${BED}" stroke-width="1.2"/>
<ellipse cx="70" cy="38" rx="11" ry="5" fill="#fff" opacity=".45" transform="rotate(-18 70 38)"/>
<path d="M49 60 q-8 26 4 44 q5 6 11 10 q6 6 16 8 q10 -2 16 -8 q6 -4 11 -10 q12 -18 4 -44 q-4 12 -14 14 q-6 -6 -17 -6 q-11 0 -17 6 q-10 -2 -14 -14z" fill="${BE}" stroke="${BED}" stroke-width="1.6"/>
<path d="M58 86 q3 10 8 16 M68 94 q2 10 5 18 M80 96 v22 M92 94 q-2 10 -5 18 M102 86 q-3 10 -8 16" stroke="#c4c7cf" stroke-width="1.6" fill="none" stroke-linecap="round"/>
${f.mouth}
<path d="M80 71 q-12 -3 -22 8 q-2 4 2 4 q10 -2 20 -5 q10 3 20 5 q4 0 2 -4 q-10 -11 -22 -8z" fill="#e2e3e8" stroke="${BED}" stroke-width="1.5"/>
<ellipse cx="80" cy="66" rx="7.5" ry="6.5" fill="#e9a47c" stroke="${SKD}" stroke-width="1.3"/><ellipse cx="78" cy="65" rx="2" ry="1.4" fill="#fff" opacity=".6"/>
<ellipse cx="69" cy="57" rx="3.4" ry="3.6" fill="${INK}"/><ellipse cx="91" cy="57" rx="3.4" ry="3.6" fill="${INK}"/><path d="M64 61.5 q5 -3 10 0 M86 61.5 q5 -3 10 0" stroke="${SKD}" stroke-width="2" fill="none" stroke-linecap="round"/>
<circle cx="70.2" cy="55.6" r="1" fill="#fff"/><circle cx="92.2" cy="55.6" r="1" fill="#fff"/>
<ellipse cx="61" cy="68" rx="5" ry="3" fill="#e8907a" opacity=".45"/><ellipse cx="99" cy="68" rx="5" ry="3" fill="#e8907a" opacity=".45"/>
<path d="${f.brow}" stroke="${BR}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
</svg>`;
  }
  window.WFSmith = { svg, poses: Object.keys(POSES) };
})();
