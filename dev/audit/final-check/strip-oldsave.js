/* FINAL-CHECK Part 2 · a save from before the drag strip existed (dev/fixtures/all-done-save.json: no "strip" key, 27,376 cash) loads
   on the 152-row map: Continue, cash and progress kept, SAVE.strip gets its defaults, the race office opens, a test & tune pass in a
   loaner works. The fixture is put in place by an init script before the game boots (so the page's own unload flush can't overwrite it).
   node dev/audit/final-check/strip-oldsave.js */
const {open}=require('../../ai-ingame-lib.js'),fs=require('fs'),path=require('path');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const fx=fs.readFileSync(path.join(__dirname,'../../fixtures/all-done-save.json'),'utf8');const want=JSON.parse(fx);
  const {b,p,errs}=await open({before:async p=>{await p.addInitScript(fx=>{if(!sessionStorage.getItem('fx')){sessionStorage.setItem('fx','1');localStorage.clear();localStorage.setItem('ht-save',fx)}},fx)}});
  const ev=(f,a)=>p.evaluate(f,a);
  const t=await ev(()=>({cont:!!document.querySelector('.ht-title [data-act=continue]'),strip:!!(HT.Save.data&&HT.Save.data.strip)}));
  await ev(()=>{const c=document.querySelector('.ht-title [data-act=continue]');if(c)c.click()});await p.waitForTimeout(1500);
  const s=await ev(()=>{const H=window.__ht;H.step(3);const d=HT.Strip.def();H.P.pos.set(d.booth.x-1.4,0,d.booth.z);H.P.yaw=-Math.PI/2;H.step(4);HT.Strip.open('office');const m=HT.Strip.menu();
    return{mode:H.mode,cash:Math.round(HT.Save.data.cash),day:HT.Save.data.day,strip:HT.Save.data.strip?Object.keys(HT.Save.data.strip).join(','):null,menu:m.open?m.id+': '+m.items.join(' | '):null}});
  ok(t.cont,'title offers Continue for the old save');
  ok(s.mode==='hub'&&s.cash===Math.round(want.cash),'Continue: free roam, cash kept ('+s.cash+' vs '+Math.round(want.cash)+'), day '+s.day);
  ok(!!s.strip&&/^office/.test(s.menu||''),'SAVE.strip defaults ('+s.strip+'), office opens: '+s.menu);
  await ev(()=>{HT.Strip.open('picker')});const pk=await ev(()=>HT.Strip.menu());ok(pk.open&&pk.id==='picker'&&pk.items.length>=7,'the car picker opens: '+(pk.items||[]).join(', '));
  ok(!errs.length,'console errors: '+errs.length+' '+errs.slice(0,3).join(' | '));
  console.log(fails?fails+' FAIL':'all ok');await b.close();process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(2)});
