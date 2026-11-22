/* Audit probe (package): the in-game Credits screen (js/credits.js HT.Credits.CREDITS, shown by index.html showCredits) vs the declared
   single source of truth assets/credits/credits.txt (docs/steam/LICENCES.md:65). Normalises (c)/© and the STUDIO placeholder only.
   Run: node dev/audit/saves/credits-diff.js */
'use strict';
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '../../..');
global.window = global; require(path.join(R, 'js/credits.js'));
const C = window.HT.Credits; const norm = s => s.replace(/\(c\)/g, '©').replace(/\r/g, '').trim().split('\n').map(l => l.replace(/\s+$/, ''));
const game = norm(C.CREDITS), file = norm(fs.readFileSync(path.join(R, 'assets/credits/credits.txt'), 'utf8'));
console.log('STUDIO =', JSON.stringify(C.STUDIO), '| in-game lines', game.length, '| credits.txt lines', file.length);
/* simple LCS line diff */
const n = game.length, m = file.length, T = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i][j] = game[i] === file[j] ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
let i = 0, j = 0, d = 0; while (i < n || j < m) { if (i < n && j < m && game[i] === file[j]) { i++; j++ } else if (j < m && (i >= n || T[i][j + 1] >= T[i + 1][j])) { console.log('+ credits.txt only : ' + file[j++]); d++ } else { console.log('- in-game only     : ' + game[i++]); d++ } }
console.log(d ? d + ' differing lines' : 'identical'); process.exitCode = d ? 1 : 0;
