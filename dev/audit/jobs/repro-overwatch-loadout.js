/* JOBS-AUDIT (pending item): Higher Ground abandoned on the roof corrupts the next job's loadout through its returnRifle safety net.
   node dev/audit/jobs/repro-overwatch-loadout.js [next=finale]
   1. play Higher Ground to the roof (the borrowed rifle), real Escape -> Abandon job (real click)
   2. the real rAF loop runs in the hub, then the next job starts and runs
   PASS when the hub and the next job have the loadouts the game gave them (no undefined slot, no stale weapon list, no roof overlay) */
const {boot,click,live}=require('./lib.js');const NEXT=process.argv.slice(2).find(x=>!x.startsWith('--'))||'finale';
(async()=>{const {b,p,errs}=await boot();const ev=(f,a)=>p.evaluate(f,a);const warns=[];p.on('console',m=>{if(m.type()==='warning'||m.type()==='error')warns.push(m.text().slice(0,300))});
  await ev(n=>{window.__A.unlock('overwatch');window.__A.unlock(n)},NEXT);await ev(()=>window.__A.cast('overwatch'));await ev(n=>window.__A.cast(n),NEXT);
  const S=()=>ev(()=>{const H=window.__ht,P=H.P;const ov=[...document.querySelectorAll('.ht-ovl > *')].filter(e=>!e.classList.contains('out')).map(e=>e.dataset.ov||e.className);
    return{simT:+H.simT.toFixed(2),mode:H.mode,M:H.M&&H.M.def.id,state:H.M&&H.M.state,stage:H.M&&H.M.stage,loadout:Object.assign({},P.loadout),weapons:P.weapons.slice(),cur:P.cur,roof:!!(H.M&&H.M.ow&&H.M.ow.roof&&H.M.ow.roof.on),scopedClass:document.body.classList.contains('ow-scoped'),overlays:ov}});
  const sane=s=>{const keys=Object.keys(s.loadout);const lw=['side','p1','p2'].map(k=>s.loadout[k]).filter(Boolean);
    return keys.every(k=>['side','p1','p2','p3'].includes(k))&&JSON.stringify(lw)===JSON.stringify(s.weapons.filter(w=>w!==s.loadout.p3))&&(!s.cur||s.weapons.includes(s.cur))&&!s.overlays.includes('overwatch')&&!s.scopedClass};
  await ev(()=>{window.__ht.jobs.start('overwatch');window.__ht.step(3)});
  const FR=+((process.argv.find(x=>x.startsWith('--frames='))||'').split('=')[1]||1500);const adv=await ev(f=>window.__A.play('overwatch',{},f),FR);console.log('on the roof',JSON.stringify(await S()),JSON.stringify(adv));
  /* --scoped: abandon while looking through the scope (right mouse = aim toggle) */if(process.argv.includes('--scoped')){await ev(()=>{const H=window.__ht;const R=H.M.ow.rifle;if(H.M.ow&&H.M.ow.rifle)try{H.P.ads=true;H.P.aim=true}catch(_){}});}
  await live(p,600);console.log('before abandon',JSON.stringify(await S()));await p.keyboard.press('Escape');await p.waitForTimeout(400);console.log('abandon clicked',await click(p,'abandon'));
  const h0=await S();await live(p,1500);const h1=await S();console.log('hub simT across 1.5 s of real frames',h0.simT,'->',h1.simT);await ev(()=>window.__ht.step(10));await live(p,600);const hub=await S();console.log('hub after abandoning',JSON.stringify(hub));
  await ev(n=>{window.__ht.jobs.start(n);window.__ht.step(5)},NEXT);await live(p,1200);await ev(()=>window.__ht.step(60));await live(p,600);const nx=await S();console.log(NEXT+' after',JSON.stringify(nx));
  const pe=errs.filter(e=>!/favicon/.test(e));console.log('page errors',JSON.stringify(pe.slice(0,3)));console.log('console warnings',JSON.stringify([...new Set(warns)].slice(0,8)));
  const ok=hub.mode==='hub'&&sane(hub)&&nx.M===NEXT&&sane(nx)&&!pe.length;console.log(ok?'PASS overwatch: no loadout or overlay leak after abandoning on the roof':'FAIL overwatch leak');
  await b.close();process.exit(ok?0:1)})().catch(e=>{console.error(e);process.exit(1)});
