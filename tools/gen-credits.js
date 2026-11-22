/* node tools/gen-credits.js : writes the in-game Credits text (HT.Credits.CREDITS in js/credits.js) from assets/credits/credits.txt,
   the single source of truth (docs/steam/LICENCES.md). "(c)" becomes "©". --check exits 1 instead of writing when they differ.
   dev/audit/saves/credits-diff.js is the drift test (run by dev/check-build.js). No dependencies. */
'use strict';
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..');
const JS = path.join(ROOT, 'js/credits.js'), TXT = path.join(ROOT, 'assets/credits/credits.txt');
const BEGIN = '/* BEGIN generated from assets/credits/credits.txt by tools/gen-credits.js: do not edit by hand */', END = '/* END generated */';
const txt = fs.readFileSync(TXT, 'utf8').replace(/\r/g, '').replace(/\(c\)/g, '©').replace(/\s+$/, '');
const lit = txt.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const js = fs.readFileSync(JS, 'utf8'), a = js.indexOf(BEGIN), b = js.indexOf(END);
if (a < 0 || b < a) { console.error('markers not found in js/credits.js'); process.exit(2) }
const out = js.slice(0, a) + BEGIN + '\nconst CREDITS=`' + lit + '`;\n' + js.slice(b);
if (out === js) { console.log('js/credits.js is up to date with credits.txt'); process.exit(0) }
if (process.argv.includes('--check')) { console.log('js/credits.js differs from assets/credits/credits.txt: run node tools/gen-credits.js'); process.exit(1) }
fs.writeFileSync(JS, out); console.log('wrote js/credits.js from credits.txt');
