/* audit/jobs: shared page helpers for the fail-path probes.
   boot() opens the game through dev/ai-ingame-lib.js (rAF paused; only __ht.step advances), presses New game with a real click,
   waits for the job files and installs window.__A:
     snap()            a fingerprint of the world state that a finished/abandoned job must leave clean
     unlock(id)        unlock gates + the job's test.give (same as dev/jobs-check.js)
     cast(id)          preload the job's cast (async)
     play(id,o,max,until)  run the job's own scripted player until `until(M)` is true or the job ends
     card()            the result card as the player sees it (buttons + data-act)
   Node side: click(p,act) clicks a HUD button with a real mouse click; live(p,ms) lets the real rAF loop run. */
const {open}=require('../../ai-ingame-lib.js');
async function boot(o={}){
  const r=await open(o);const {p}=r;
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(400);
  await p.evaluate(async()=>{await window.__ht.jobs.ready;window.__ht.step(2)});
  await p.evaluate(install);
  return r}
function install(){const H=window.__ht,A=window.__A={};const k=H.keys;
  A.api=()=>H.jobs.api;A.SV=()=>H.jobs.api.SV();
  A.snap=()=>{const L=H.L,M=H.M,a=H.jobs.api,O=H.ow;let traffic=null;try{traffic=O&&O.trafficCars?O.trafficCars().length:null}catch(e){}
    const ov=[...document.querySelectorAll('.ht-ovl > *')].filter(e=>!e.classList.contains('out')).map(e=>e.dataset.ov||e.className);
    const vis=s=>{const e=document.querySelector(s);return!!(e&&!e.hidden&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&+getComputedStyle(e).opacity>0.05)};
    const cars=L&&L.cars||[];
    return{mode:H.mode,running:H.running,M:M?{id:M.def.id,state:M.state,stage:M.stage,replay:!!M.replay,retried:!!M.retried,noGuns:!!M.noGuns,item:M.item||null}:null,JOB:H.JOB,
      night:{target:+(H.night.target||0).toFixed(2),k:+(H.night.k||0).toFixed(2)},jrsNight:!!H.jobs.JRS.night,
      hp:Math.round(H.P.hp),loadout:JSON.stringify(H.P.loadout),cur:H.P.cur,gunShown:!!(H.P.dude&&H.P.dude.gun&&H.P.dude.gun.visible!==false),
      CV:H.CV?(H.CV===H.VAN?'van':H.CV.type||'car'):null,vanOn:!!H.VAN.on,vanVisible:!!(H.VAN.mesh?H.VAN.mesh.visible:true),cars:cars.length,carsHidden:cars.filter(c=>c.mesh&&!c.mesh.visible).length,
      wmObjs:H.WM.objs.length,wmInScene:H.WM.objs.filter(o=>{let p=o;while(p.parent)p=p.parent;return p===H.scene}).length,
      lgroup:L&&L.group?L.group.children.length:0,scene:H.scene.children.length,solids:L&&L.solids?L.solids.length:0,cols:L&&L.colliders?L.colliders.length:0,
      enemies:H.enemies.length,allies:H.allies.length,fov:+H.camera.fov.toFixed(1),zoom:H.camera.zoom,
      keysHeld:Object.keys(k).filter(x=>k[x]),overlays:ov,screen:H.HUD.screen||null,obj:H.HUD&&window.__ht.jobs&&(document.querySelector('.ht-obj h3,.ht-obj .t')||{}).textContent||null,
      noTraffic:!!H.OWS.noTraffic,traffic,timeScale:H.timeScale||null,pos:[Math.round(H.P.pos.x),Math.round(H.P.pos.z)],
      widgets:document.querySelectorAll('.ht-wg > *, .ht-mt > *').length,cp:H.jobs.JRS.cp?H.jobs.JRS.cp.id:null,
      vm:!!(window.__ht.dude&&H.P&&H.P.vmVisible),cash:(A.SV()||{}).cash,flags:JSON.stringify((A.SV()||{}).flags||{}).length,borrowed:JSON.stringify(H.BORROW&&H.BORROW.list?H.BORROW.list:null),prompt:(document.querySelector('.ht-prompt')||{}).textContent||null}};
  A.unlock=id=>{const j=H.jobs.registry.get(id),u=j.def.unlock||{},s=A.SV();for(const d of[].concat(u.done||[])){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true;if(s&&window.HT.Save.jobRec)window.HT.Save.jobRec(s,d).done=true}
    if(u.trust)H.prog.trust=Math.max(H.prog.trust,u.trust);if(u.trustR)H.prog.trustR=Math.max(H.prog.trustR||0,u.trustR);if(u.cuffed)H.prog.cuffed=Math.max(H.prog.cuffed||0,u.cuffed);/* the Act 2 card would pop over the job (a give() that rebuilds the hub sets its timer): mark it seen first */try{const sv=A.SV();if(H.prog.done[1]||(u.done||[]).length){if(sv&&sv.flags)sv.flags.act2Intro=true;H.WM.beat=true;H.prog.act=Math.max(H.prog.act||1,2)}H.WM.finaleSeen=true/* the 9-job end card */}catch(e){}if(j.test&&j.test.give)j.test.give(A.api());
    return H.jobs.lock(id)};
  A.cast=async id=>{const pm=window.HT&&HT.People;if(!pm||!pm.preload)return;const want=H.jobs.castKeys(id);await Promise.race([pm.preload(want).catch(()=>{}),new Promise(r=>setTimeout(r,25000))])};
  A.play=(id,o,max,untilSrc)=>{const j=H.jobs.registry.get(id),a=A.api(),until=untilSrc?new Function('M','H','return ('+untilSrc+')'):null;let t=0;A.f=A.f||0;
    for(;t<max&&H.M&&H.M.state==='go';t++){if(until&&until(H.M,H))break;if(j.test&&j.test.step)j.test.step(a,A.f++,o||{});if(!(o&&o.hurt))H.P.hp=Math.max(H.P.hp,60);H.step(1);if(t%150===149)H.draw()/* a real frame now and then: hud() runs job safety nets */}
    for(const x of['w','a','s','d','e',' ','shift'])k[x]=false;return{t,state:H.M&&H.M.state,stage:H.M&&H.M.stage,el:H.M&&Math.round(H.M.elapsed)}};
  A.card=()=>{const c=document.querySelector('.ht-result');if(!c)return null;const btns=[...c.querySelectorAll('[data-act]')].map(b=>({act:b.dataset.act,label:b.textContent.trim()}));
    return{shown:H.HUD.screen==='result',stamp:(c.querySelector('.stamp,.ht-stamp')||{}).textContent||null,title:(c.querySelector('h2')||{}).textContent||null,btns,acts:Object.keys(H.UIacts||{})}};
}
async function click(p,act){const sel='[data-act="'+act+'"]';const el=await p.$(sel);if(!el)return false;
  const v=await el.isVisible();if(!v)return false;const ok=await el.click({timeout:5000}).then(()=>true).catch(async()=>p.evaluate(s=>{const e=document.querySelector(s);if(!e)return false;e.click();return true},sel));return ok}
async function live(p,ms){await p.evaluate(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(ms);await p.evaluate(()=>{window.__rafOn=false})}
/* wait for the fail/win card: it is shown by a 0.9-1.2 s setTimeout */
async function waitCard(p,ms=4000){await p.evaluate(()=>window.__ht.step(40));const t0=Date.now();while(Date.now()-t0<ms){const s=await p.evaluate(()=>window.__ht.HUD.screen);if(s==='result')break;await p.waitForTimeout(200)}return p.evaluate(()=>window.__A.card())}
module.exports={boot,click,live,waitCard,install};
