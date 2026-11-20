/* State leaks after a job (QA item 4): takes a free-roam baseline, then for each job runs its scripted player to a WIN and to a FAIL
   (opts.fail), goes back to free roam through the result card ("result:go") and compares free roam against the baseline:
   gun in hand / loadout / P.aim / crouch / first person, camera FOV, night preset, M.noCars/holster/noGuns/item, the driving HUD
   (.ht-drv) and prompt, overlays and body classes jobs add, window/document/canvas listeners (counted from load), the canvas cursor,
   held keys, the hub's scene children count (props a job forgot to remove).
   node dev/state-leaks.js [ids...]     (default: every shipped registered job)
   Exit code 1 on any leak. */
const {open}=require('./ai-ingame-lib.js');
const ALL=['porch','talk','blitz','tow','mower','mowertt','taxi','overwatch','hoa','tail','sabotage','cargo','moving','cones','crossing','brake','bike','arrest','pawn'];
const IDS=process.argv.slice(2).filter((a,i,A)=>!a.startsWith('--')&&A[i-1]!=='--dump');const LIST=IDS.length?IDS:ALL;
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  /* count listeners from here on (job files add theirs at mission start) */
  await ev(()=>{const cnt=window.__lc={};const wrap=(o,name)=>{const add=o.addEventListener,rem=o.removeEventListener,set=new Map();
      o.addEventListener=function(t,f,opt){const k=name+':'+t;if(!set.has(f+k)){set.set(f+k,1);cnt[k]=(cnt[k]||0)+1}return add.call(this,t,f,opt)};
      o.removeEventListener=function(t,f,opt){const k=name+':'+t;if(set.has(f+k)){set.delete(f+k);cnt[k]=(cnt[k]||0)-1}return rem.call(this,t,f,opt)}};
    wrap(window,'win');wrap(document,'doc');const cv=document.querySelector('canvas');if(cv)wrap(cv,'cv')});
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(5);
    window.__snap=()=>{try{window.__ht.draw()}catch(e){}/* step() doesn't refresh the HUD */const H=window.__ht,P=H.P,M=H.M,vis=e=>!!e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&+getComputedStyle(e).opacity>0;
      const drv=document.querySelector('.ht-drv');const cv=document.querySelector('canvas');
      return{mode:H.mode,gunInHand:!!(P.dude&&P.dude.gun),weapons:(P.weapons||[]).join(','),cur:P.cur,aim:!!P.aim,crouch:!!P.crouch,fp:!!P.fp,fov:Math.round(H.camera.fov),
        night:+(H.night?H.night.target:0).toFixed(2),noCars:!!(M&&M.noCars&&M.state==='go'),drvHud:vis(drv)===!!H.CV,prompt:!!(H.prompt&&H.prompt.text)&&!H.prompt.text.match(/Talk to|Drive|Borrow|Go inside|Get out|Open the|Pull into|Hardware|Auto/)?H.prompt.text:null,
        body:[...document.body.classList].sort().join(' '),cursor:cv?cv.style.cursor||'':'',keysHeld:Object.keys(H.keys).filter(k=>H.keys[k]).join(','),
        fixed:[...document.body.children].filter(e=>vis(e)&&getComputedStyle(e).position==='fixed'&&!/ht-|hud|bino|title/.test(e.className+' '+e.id)).map(e=>(e.id||e.className||e.tagName).toString().slice(0,30)).sort().join('|'),
        listeners:Object.entries(window.__lc).filter(([k,v])=>v>0).map(([k,v])=>k+'='+v).sort().join(' '),sceneN:H.scene.children.length}};
    /* the same unlock the job harness does (deps done, same person's earlier jobs done), then the job's own give() */
    window.__unlock=id=>{const j=H.jobs.registry.get(id),u=j.def.unlock||{},s=H.jobs.api.SV();for(const d of[].concat(u.done||[])){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true;if(s)window.HT.Save.jobRec(s,d).done=true}
      if(u.trust)H.prog.trust=Math.max(H.prog.trust,u.trust);if(u.trustR)H.prog.trustR=Math.max(H.prog.trustR||0,u.trustR);if(u.cuffed)H.prog.cuffed=Math.max(H.prog.cuffed,u.cuffed);
      if(j.test&&j.test.give)j.test.give(H.jobs.api);try{if(s&&s.flags&&H.prog.done[1]){s.flags.act2Intro=true;s.flags.finale2=true}}catch(e){}return H.jobs.lock(id)}});
  const base=await ev(()=>window.__snap());console.log('     baseline '+JSON.stringify(base));
  const cmp=(a,b_)=>Object.keys(a).filter(k=>k!=='sceneN'&&k!=='listeners'&&String(a[k])!==String(b_[k])).map(k=>k+': '+JSON.stringify(b_[k])+' -> '+JSON.stringify(a[k]));
  let lastBase=base;
  for(const id of LIST){for(const how of['win','fail']){
      const r=await p.evaluate(async([id,how])=>{const H=window.__ht;if(H.mode!=='hub'){H.enterHub();H.step(3)}const lk=window.__unlock(id);if(lk)return{err:'locked '+lk};
        const pm=window.HT&&HT.People;if(pm&&pm.preload)await Promise.race([pm.preload(H.jobs.castKeys(id)).catch(()=>{}),new Promise(r=>setTimeout(r,20000))]);
        H.enterHub();H.step(5);const before=window.__snap();/* after the unlock: the hub loadout follows progress (Gary done = shotgun), so compare with this */H.jobs.start(id);if(H.jobs.castWait)await H.jobs.castWait;H.step(3);if(!H.M||H.M.def.id!==id)return{err:'did not start',mode:H.mode};
        const j=H.jobs.registry.get(id),a=H.jobs.api;let t=0;for(;t<14000&&H.M&&H.M.state==='go';t++){if(j.test&&j.test.step)j.test.step(a,t,how==='fail'?{fail:true}:{});H.P.hp=Math.max(H.P.hp,60);H.step(1)}
        if(H.M&&H.M.state==='go')H.jobs.finish(how==='win');for(const k of['w','a','s','d','e','shift'])H.keys[k]=false;H.mouse=false;
        const end=H.M&&H.M.state;H.step(60);await new Promise(r=>setTimeout(r,1500));/* the card shows on a timer */
        /* the result card: payout lines add up to the total, no fight words on a peaceful job, a headline */
        const pay=H.M&&H.M.pay,sum=pay?pay.lines.reduce((t,l)=>t+l.amount,0):null,card=document.querySelector('.ht-result .col');
        const cardTxt=card?card.innerText:'',stats=card?[...card.querySelectorAll('.ht-stats > div b')].map(x=>x.textContent.trim()):[];
        const card_={total:pay&&pay.total,sum,lines:pay?pay.lines.map(l=>l.label+' '+l.amount):[],head:(card&&card.querySelector('h2')||{}).textContent||'',stats,peaceful:!!(H.M.def.peaceful!=null?H.M.def.peaceful:H.M.def.noGuns),kills:H.M.kills||0};if(H.UIacts&&H.UIacts['result:go'])H.UIacts['result:go']();H.step(5);
        if(H.UIacts&&H.UIacts['result:go'])H.UIacts['result:go']();/* the finale card, if it popped */H.step(60);
        return{end,t,before,card:card_,after:window.__snap()}},[id,how]);
      if(r.err){ok(false,id+' '+how+': '+JSON.stringify(r));continue}
      const d=cmp(r.after,r.before);const lis=r.after.listeners!==lastBase.listeners?'listeners '+lastBase.listeners+' -> '+r.after.listeners:'';
      ok(!d.length,id+' '+how+' ('+r.end+' after '+r.t+' frames) back in free roam'+(d.length?': '+d.join('; '):'')+(lis?' · '+lis:'')+' · scene '+lastBase.sceneN+'->'+r.after.sceneN);
      const c=r.card;if(c){const words=c.lines.concat(c.stats,[c.head]).join(' | ');
        ok(c.total!=null&&c.sum===c.total,id+' '+how+' card: lines add up ('+c.sum+' = '+c.total+') · '+c.lines.join(', '));
        ok(!(c.peaceful&&!c.kills&&/Neutralized/.test(words))&&!/Bake sale/.test(words)&&!!c.head,id+' '+how+' card words: "'+c.head+'" · '+c.stats.join(', '))}
      lastBase=r.after}}
  const DI=process.argv.indexOf('--dump');if(DI>0){const sv=await ev(()=>{try{window.__ht.jobs.api.save&&window.__ht.jobs.api.save()}catch(e){}return localStorage.getItem('ht-save')});require('fs').writeFileSync(process.argv[DI+1],sv);console.log('     save written to '+process.argv[DI+1]+' ('+(sv||'').length+' bytes)')}
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,8).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
