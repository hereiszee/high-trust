/* fix/jobs: reload the page in the middle of every job.  node dev/audit/jobs/reload-sweep.js [ids...] [--frames=900]
   Per job, in its own browser: new game, unlock, snapshot the save in the hub, start the job, its own bot plays --frames,
   the page reloads (a crash or Alt-F4 looks the same to the save), the title's Continue is clicked for real, then:
   - Continue is offered and lands in the hub, no job running, no night/overlay/stealth left over
   - what the job had earned is not in the save (SAV-04: zip-ties, trust only on a win); done/day unchanged
   - the loadout is the locker's, every slot a real gun; no page errors
   Prints one line per job; exit 1 if any job fails. */
const {boot,click,live}=require('./lib.js');
const ALL='porch talk blitz tow mower taxi overwatch hoa tail sabotage cargo moving cones crossing brake bike arrest pawn heist carwash patrol roundup finale'.split(' ');
const ids=process.argv.slice(2).filter(x=>!x.startsWith('--'));const FR=+((process.argv.find(x=>x.startsWith('--frames='))||'').split('=')[1]||900);
const save=p=>p.evaluate(()=>{const s=window.__A.SV();const H=window.__ht;return{cash:s.cash,day:s.day,trust:Math.round(s.prog.trust),trustR:Math.round(s.prog.trustR||0),cuffed:s.prog.cuffed|0,
  done:Object.keys(s.jobs).filter(k=>s.jobs[k].done).sort().join(','),loadout:JSON.stringify(s.loadout)}});
(async()=>{let bad=0;
  for(const id of(ids.length?ids:ALL)){let b;const out={id};try{const r=await boot();b=r.b;const p=r.p,errs=r.errs,ev=(f,a)=>p.evaluate(f,a);
    await ev(j=>window.__A.unlock(j),id);await ev(j=>window.__A.cast(j),id);await ev(()=>{const H=window.__ht;H.enterHub();H.step(10)});await live(p,600);
    await ev(()=>{try{window.HT.Save.saveNow()}catch(_){}});const s0=await save(p);
    await ev(j=>{window.__ht.jobs.start(j);window.__ht.step(3)},id);const mid=await ev(([j,f])=>window.__A.play(j,{},f),[id,FR]);await live(p,500);
    out.mid={state:mid.state,stage:mid.stage};out.midSave=await save(p);
    await p.reload();await p.waitForFunction(()=>window.__ht&&window.__ht.assets&&window.__ht.assets.done,null,{timeout:90000});await p.evaluate(()=>{window.__rafOn=false});
    const btns=await ev(()=>[...document.querySelectorAll('.ht-title [data-act]')].map(e=>e.dataset.act));out.title=btns.slice(0,2);
    const c=await click(p,'continue');await p.waitForTimeout(500);await ev(async()=>{await window.__ht.jobs.ready;window.__ht.step(10)});await ev(()=>{});
    const {install}=require('./lib.js');await ev(install);await live(p,800);
    const hub=await ev(()=>{const H=window.__ht,P=H.P;const ov=[...document.querySelectorAll('.ht-ovl > *')].filter(e=>!e.classList.contains('out')).map(e=>e.dataset.ov||e.className);
      return{mode:H.mode,M:H.M?H.M.def.id+':'+H.M.state:null,night:+(H.night.k||0).toFixed(2),overlays:ov,loadout:Object.assign({},P.loadout),weapons:P.weapons.slice()}});
    const s1=await save(p);out.hub=hub;
    const pe=errs.filter(e=>!/favicon/.test(e));const why=[];
    if(!c)why.push('no Continue on the title ('+btns.join(',')+')');
    if(hub.mode!=='hub')why.push('mode '+hub.mode);if(hub.M&&!/:(lost|won|abandoned)$/.test(hub.M))why.push('job running '+hub.M);if(hub.night>.05)why.push('night '+hub.night);if(hub.overlays.length)why.push('overlays '+hub.overlays.join(','));
    if(Object.keys(hub.loadout).some(k=>!['side','p1','p2','p3'].includes(k))||hub.weapons.some(w=>!w))why.push('loadout '+JSON.stringify(hub.loadout));
    if(s1.cuffed>s0.cuffed||s1.trust>s0.trust||s1.trustR>s0.trustR)why.push('job gains kept: '+JSON.stringify({before:s0,after:s1}));
    if(s1.done!==s0.done||s1.day!==s0.day)why.push('done/day changed');/* starting a later story job hands over Rick's carbine for good (metaLoadout): only a gun going missing counts */{const g=x=>Object.values(JSON.parse(x)).filter(Boolean);const lost=g(s0.loadout).filter(x=>!g(s1.loadout).includes(x));if(lost.length)why.push('locker lost '+lost.join(','))}
    if(s1.cash!==s0.cash)out.cashNote=s0.cash+' -> '+s1.cash;
    if(pe.length)why.push('page errors '+JSON.stringify(pe.slice(0,2)));
    out.ok=!why.length;out.why=why;if(why.length)bad++}catch(e){out.ok=false;out.why=['harness: '+String(e&&e.message).slice(0,200)];bad++}
    console.log(JSON.stringify(out));try{await b.close()}catch(_){} }
  console.log(bad?'FAIL reload sweep: '+bad+' job(s)':'PASS reload sweep');process.exit(bad?1:0)})();
