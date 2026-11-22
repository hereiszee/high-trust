/* Audit probe (settings): the Frame rate cap gate from index.html frame() — `if(cap>0&&now-last<1000/cap-2){requestAnimationFrame(frame);return}`
   with `last` set to the rAF timestamp of each rendered frame — simulated against common display refresh rates.
   Run: node dev/audit/saves/fpscap-sim.js */
'use strict';
const src = require('fs').readFileSync(require('path').join(__dirname, '../../../index.html'), 'utf8');
const m = /const cap=\+CFG\.fpsCap\|\|0;if\(cap>0&&now-last<1000\/cap-2\)/.exec(src);
/* after the SAV-03 fix index.html gates with HT.FrameCap (js/fpscap.js): simulate whichever gate is in index.html */
const FC = /HT\.FrameCap/.test(src) ? require('../../../js/fpscap.js') : null;
console.log('gate in index.html:', m ? 'old vsync-skipping gate (as simulated)' : FC ? 'HT.FrameCap accumulator (js/fpscap.js)' : 'NOT FOUND - re-check before trusting this');
const sim = (hz, cap, secs = 10) => { const dt = 1000 / hz; let last = 0, n = 0; const g = FC && !m ? FC.make() : null;
  for (let now = dt; now <= secs * 1000; now += dt) { if (g) { if (!g.gate(now, cap)) continue } else if (cap > 0 && now - last < 1000 / cap - 2) continue; last = now; n++ } return n / secs };
for (const hz of [60, 75, 90, 120, 144, 165, 240]) console.log(`${String(hz).padStart(3)} Hz display:`, [30, 60, 120, 144].map(c => `cap ${c} -> ${sim(hz, c).toFixed(0)} fps`).join(' | '));
