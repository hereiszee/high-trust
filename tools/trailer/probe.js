/* Staging helper: boot the game at 960x540 and run a page-side async script file, print what it returns, optionally save a screenshot.
   node tools/trailer/probe.js <script.js> [out.jpg] [--w 1920] */
'use strict';const T=require('./lib.js'),fs=require('fs');
(async()=>{const f=process.argv[2],out=process.argv[3]&&!process.argv[3].startsWith('--')?process.argv[3]:null;const wi=process.argv.indexOf('--w');const W=wi>0?+process.argv[wi+1]:960;
  const s=await T.boot({w:W,h:Math.round(W*9/16)});await s.p.evaluate(T.helpers);
  const src=fs.readFileSync(f,'utf8');const r=await s.p.evaluate('(async()=>{'+src+'\n})()').catch(e=>'ERR '+e.message);
  console.log(typeof r==='string'?r:JSON.stringify(r,null,1));
  if(out){await s.p.evaluate(()=>{window.__vt.start();window.__vt.advance(2)});await s.p.screenshot({path:out,type:'jpeg',quality:85})}
  if(s.errs.length)console.log('errors:',s.errs.slice(0,5));await T.close(s)})();
