/* perf audit: leak / growth probe. node dev/audit/perf/leaks.js <scenario> [--n=10]
   Scenarios: jobquit (start job -> Esc -> pause Quit -> confirm -> title Continue), jobs (every registered job once: start, pause -> Abandon),
   travel (fast travel home <-> Community Center), car (enter/exit a parked car), tank, jet (board/exit on the apron), eject (board,
   put in the air, E E, land under the chute, walk back), menus (shop/locker/map/calendar/pause open-close), newgame (quit -> title -> New
   game -> confirm), night (day <-> night with flashlight and goggles), roam (free roam with traffic, --n = simulated minutes, 1 sample/min).
   After every cycle (after a forced GC through CDP) it samples: JS heap, renderer.info.memory geometries/textures, programs, scene
   object count, DOM elements, renderer + GPU process RSS (ps), CDP Memory.getDOMCounters (all nodes incl. detached, JS listeners), live event listeners (addEventListener minus removeEventListener, on window/document/connected elements/other live targets), live intervals, pending
   timeouts, pending rAF callbacks, AudioContexts, audio nodes created; prints the series and a least-squares slope per cycle.
   Real key presses / clicks where the game takes them (Esc, E, M, pause buttons, title buttons); internals for setup. */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
const args=process.argv.slice(2);const SC=args.find(a=>!a.startsWith('--'))||'jobquit';const arg=(k,d)=>{const a=args.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const N=+arg('n',10);
const INIT=()=>{const L=window.__probe={listeners:new Map(),intervals:new Set(),timeouts:new Set(),raf:new Set(),ac:0,nodes:0,warns:[],rejections:[]};
  const key=(t)=>t===window?'window':t===document?'document':(t&&t.nodeType?'element':(t&&t.constructor&&t.constructor.name)||'other');
  const oa=EventTarget.prototype.addEventListener,orr=EventTarget.prototype.removeEventListener;
  const ids=new WeakMap();let nid=0;const fid=f=>{if(!f)return 0;if(!ids.has(f))ids.set(f,++nid);return ids.get(f)};
  const tids=new WeakMap();let ntid=0;const tid=t=>{if(!tids.has(t))tids.set(t,++ntid);return tids.get(t)};
  EventTarget.prototype.addEventListener=function(type,fn,o){const cap=!!(o===true||(o&&o.capture));const once=!!(o&&o.once);if(fn&&!once){const k=tid(this)+'|'+type+'|'+fid(fn)+'|'+cap;if(!L.listeners.has(k))L.listeners.set(k,{t:new WeakRef(this),label:key(this)+':'+type})}return oa.call(this,type,fn,o)};
  EventTarget.prototype.removeEventListener=function(type,fn,o){const cap=!!(o===true||(o&&o.capture));L.listeners.delete(tid(this)+'|'+type+'|'+fid(fn)+'|'+cap);return orr.call(this,type,fn,o)};
  const si=window.setInterval,ci=window.clearInterval,st=window.setTimeout,ct=window.clearTimeout;
  window.setInterval=function(f,ms,...a){const id=si.call(window,f,ms,...a);L.intervals.add(id);return id};window.clearInterval=function(id){L.intervals.delete(id);return ci.call(window,id)};
  window.setTimeout=function(f,ms,...a){let id;id=st.call(window,function(){L.timeouts.delete(id);return typeof f==='function'?f.apply(this,arguments):undefined},ms,...a);L.timeouts.add(id);return id};
  window.clearTimeout=function(id){L.timeouts.delete(id);return ct.call(window,id)};
  const AC=window.AudioContext||window.webkitAudioContext;if(AC){const W=function(...a){L.ac++;const c=new AC(...a);return c};W.prototype=AC.prototype;window.AudioContext=W;window.webkitAudioContext=W;
    const AN=window.AudioNode;if(AN){const oc=AN.prototype.connect;AN.prototype.connect=function(...a){if(!this.__c){this.__c=1;L.nodes++}return oc.apply(this,a)}}}
  addEventListener('unhandledrejection',e=>L.rejections.push(String(e.reason&&e.reason.stack||e.reason).slice(0,300)));
  const ow=console.warn;console.warn=function(...a){L.warns.push(a.map(String).join(' ').slice(0,200));return ow.apply(console,a)}};
(async()=>{const {b,p,errs}=await lib.open({init:INIT});const ev=(f,a)=>p.evaluate(f,a);const cdp=await p.context().newCDPSession(p);
  const step=n=>ev(n=>{const H=window.__ht;H.step(n)},n);const press=async(k,n=3)=>{await p.keyboard.press(k);await step(n)};
  const live=async ms=>{await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(ms);await ev(()=>{window.__rafOn=false})};
  const sample=async()=>{await cdp.send('HeapProfiler.collectGarbage');await cdp.send('HeapProfiler.collectGarbage');const hu=await cdp.send('Runtime.getHeapUsage');
    const m=await ev(()=>{const H=window.__ht,R=H.renderer,L=window.__probe;try{H.draw()}catch(_){}let objs=0;H.scene.traverse(()=>objs++);const byT={};let nl=0;for(const v of L.listeners.values()){const t=v.t.deref();if(!t||(t.nodeType&&!t.isConnected))continue;nl++;byT[v.label]=(byT[v.label]||0)+1}
      return{geo:R.info.memory.geometries,tex:R.info.memory.textures,progs:R.info.programs.length,objs,dom:document.getElementsByTagName('*').length,listeners:nl,intervals:L.intervals.size,timeouts:L.timeouts.size,ac:L.ac,nodes:L.nodes,byT,mode:H.mode}});
    m.heapMB=+(hu.usedSize/1e6).toFixed(1);
    try{const ps=require('child_process').execSync('ps -eo rss,args').toString().split('\n');let r=0,g=0;for(const l of ps){const kb=parseInt(l);if(/chrome-headless-shell.*--type=renderer/.test(l))r+=kb;else if(/chrome-headless-shell.*--type=gpu-process/.test(l))g+=kb}m.rendererMB=Math.round(r/1024);m.gpuMB=Math.round(g/1024)}catch(_){}
    try{const dc=await cdp.send('Memory.getDOMCounters');m.jsListeners=dc.jsEventListeners;m.domNodesAll=dc.nodes}catch(_){}
    return m};
  const clickAct=async(sel)=>{const el=await p.$(sel);if(!el)return false;await el.click({timeout:3000}).catch(()=>ev(s=>document.querySelector(s).click(),sel));await step(3);return true};
  /* start: title -> New game */
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}});
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await step(5);
  await ev(async()=>{const H=window.__ht;if(H.jobs&&H.jobs.ready)await H.jobs.ready;H.step(2)});
  const rows=[];const s0=await sample();rows.push(s0);console.log('start',JSON.stringify({...s0,byT:undefined}));
  const pauseOpen=async()=>{for(let t=0;t<3;t++){await p.keyboard.press('Escape');await step(2);if(await ev(()=>window.__ht.HUD.screen==='pause'))return true}return false};
  const dialogOk=async()=>{await step(2);const ok=await p.$('.ht-dlg [data-dlg=ok]');if(ok){await ok.click().catch(()=>{});await step(3);return true}return false};
  const notes=[];
  for(let i=0;i<N;i++){
    if(SC==='jobquit'){const r=await ev(async()=>{const H=window.__ht;const i=0;H.startMissionWorld?H.startMissionWorld(i):H.startMission(i);for(let k=0;k<100&&H.mode!=='mission';k++)await new Promise(r=>setTimeout(r,100));H.step(60);return H.mode});
      if(r!=='mission')notes.push('cycle '+i+': job did not start ('+r+')');
      const po=await pauseOpen();if(!po)notes.push('cycle '+i+': Esc did not open pause');
      await clickAct('.ht-pause [data-act=quit]');await dialogOk();await step(5);
      const t=await ev(()=>window.__ht.HUD.screen);if(t!=='title')notes.push('cycle '+i+': not on title after quit ('+t+')');
      await clickAct('.ht-title [data-act=continue]');await step(10)}
    else if(SC==='jobs'){const list=await ev(()=>{const H=window.__ht;const n=H.MISSIONS?H.MISSIONS.length:0;return n});const ji=i%Math.max(1,list);
      const r=await ev(async(ji)=>{const H=window.__ht;try{H.jobLock&&H.prog&&(H.prog.done=H.prog.done.map(()=>true))}catch(_){}let err=null;try{H.startMissionWorld?H.startMissionWorld(ji):H.startMission(ji)}catch(e){err=String(e)}for(let k=0;k<100&&H.mode!=='mission';k++)await new Promise(r=>setTimeout(r,100));
        for(let k=0;k<6;k++)H.step(20);return{mode:H.mode,title:H.M&&H.M.def&&H.M.def.title,err}},ji);
      notes.push('job '+ji+': '+JSON.stringify(r));const po=await pauseOpen();if(po){await clickAct('.ht-pause [data-act=abandon]')}else{await ev(()=>window.__ht.enterHub())}await step(10)}
    else if(SC==='travel'){await ev(()=>{const H=window.__ht;H.openBridge();const w=H.owW?H.owW():H.prog.world;if(w){w.visited.river=true;for(const q of['center','mart','home','auto'])if(!w.pins.includes(q))w.pins.push(q)}});
      const a=await ev(()=>{const H=window.__ht;const r1=H.fastTravel('center');H.step(30);const p1=[Math.round(H.P.pos.x),Math.round(H.P.pos.z),H.region];const r2=H.fastTravel('home');H.step(30);return{r1,r2,p1,p2:[Math.round(H.P.pos.x),Math.round(H.P.pos.z),H.region]}});if(i===0)notes.push('travel '+JSON.stringify(a))}
    else if(SC==='car'){const a=await ev(()=>{const H=window.__ht;const cs=H.vehicles;const c=cs.find(q=>q.type!=='tank'&&q.type!=='jet'&&!q.traffic)||cs[0];const ok=H.enterVehicle(c);H.step(20);H.keys.w=true;H.step(30);H.keys.w=false;H.step(30);if(H.CV){H.CV.spd=0;if(H.CV.car)H.CV.car.spd=0}H.exitVehicle();H.step(10);return{ok,type:c&&c.type,cv:!!H.CV}});if(i===0)notes.push('car '+JSON.stringify(a))}
    else if(SC==='tank'||SC==='jet'||SC==='eject'){
      const want=SC==='tank'?'tank':'jet';const pos=await ev(w=>{const H=window.__ht;const c=H.L.cars.find(q=>q.type===w);if(!c)return null;H.P.pos.set(c.pos.x+Math.cos(c.yaw)*(w==='jet'?5.2:3.8),0,c.pos.z-Math.sin(c.yaw)*(w==='jet'?5.2:3.8));H.step(4);return[c.pos.x,c.pos.z]},want);
      if(!pos){notes.push('no '+want);break}
      await press('e',4);const on=await ev(()=>{const H=window.__ht;return H.CV&&H.CV.type});if(on!==want)notes.push('cycle '+i+': E did not board '+want+' ('+on+')');
      if(SC==='eject'&&on==='jet'){await ev(()=>{const F=HT.Jet.F;F.air=true;F.gear=0;F.gearK=0;F.spd=70;F.thr=.6;F.pos.y=150;window.__ht.step(5)});await press('e',4);await press('e',30);
        const st=await ev(()=>{const H=window.__ht;for(let k=0;k<4000;k++){H.step(1);const s=HT.Jet.state();if(!s.chute&&!H.CV&&H.P.onGround!==false&&k>60)return{k,ok:true,s:{on:s.on}}}return{ok:false,s:HT.Jet.state()}});if(!st.ok)notes.push('cycle '+i+': chute never landed '+JSON.stringify(st.s).slice(0,200));
        await ev(()=>{const H=window.__ht;for(let k=0;k<400;k++){H.step(1);const s=HT.Jet.state();if(s.e&&!s.chute)break}})}
      else{await step(30);await ev(()=>{const H=window.__ht;if(H.CV){H.CV.spd=0;if(H.CV.car)H.CV.car.spd=0}});await press('e',10);const off=await ev(()=>!window.__ht.CV);if(!off){notes.push('cycle '+i+': E did not get out');await ev(()=>window.__ht.exitVehicle())}}}
    else if(SC==='menus'){const r=await ev(async()=>{const out={};const w=ms=>new Promise(r=>setTimeout(r,ms));
        try{HT.Shop.open({kind:'hardware'});await w(150);out.shop=!!document.querySelector('.htm')}catch(e){out.shop='err '+e}return out});
      await p.keyboard.press('Escape');await p.waitForTimeout(250);
      await ev(async()=>{try{HT.Shop.open({kind:'auto'})}catch(_){}await new Promise(r=>setTimeout(r,150))});await p.keyboard.press('Escape');await p.waitForTimeout(250);
      await ev(async()=>{try{HT.Locker.open({})}catch(_){}await new Promise(r=>setTimeout(r,150))});await p.keyboard.press('Escape');await p.waitForTimeout(250);
      await press('m',3);await live(150);await press('m',3);/* full map */
      await ev(()=>{try{window.__ht.HUD.show('calendar',window.__ht.calEntries?{entries:window.__ht.calEntries()}:{})}catch(e){}});await live(100);await p.keyboard.press('Escape');await step(3);await ev(()=>{const H=window.__ht;if(H.HUD.screen==='calendar')H.HUD.hide('calendar')});
      const po=await pauseOpen();if(po){await p.keyboard.press('Escape');await step(3)}
      const left=await ev(()=>({htm:!!document.querySelector('.htm'),screen:window.__ht.HUD.screen}));if(i===0||left.htm)notes.push('cycle '+i+' after menus: '+JSON.stringify(left)+' shop '+JSON.stringify(r))}
    else if(SC==='newgame'){const po=await pauseOpen();await clickAct('.ht-pause [data-act=quit]');await dialogOk();await step(4);
      const t=await ev(()=>window.__ht.HUD.screen);await clickAct('.ht-title [data-act=newgame]');await dialogOk();await step(10);const m=await ev(()=>({mode:window.__ht.mode,screen:window.__ht.HUD.screen}));if(i===0||m.mode!=='hub')notes.push('cycle '+i+': title '+t+' -> '+JSON.stringify(m))}
    else if(SC==='night'){await ev(()=>{const H=window.__ht;H.giveNvg(1);for(let k=0;k<3;k++){H.setNight(1);H.step(5);H.flash(true);H.draw();H.step(5);H.flash(false);H.nvg(true);H.draw();H.step(5);H.nvg(false);H.setNight(0);H.draw();H.step(5)}})}
    else if(SC==='roam'){await ev(()=>{const H=window.__ht;H.OWS.noTraffic=false;const k=H.keys;const V=H.VAN;if(!V.on){V.pos.set(H.P.pos.x+3,0,H.P.pos.z);H.syncVan();H.enterVan()}
        /* a minute of wandering: drive along the road graph toward random nodes, with traffic around */
        const G=H.ow.roads();for(let s=0;s<1800;s++){if(!window.__tgt||Math.hypot(window.__tgt.x-H.CV.pos.x,window.__tgt.z-H.CV.pos.z)<8||s%600===0){const n=G.nodes[Math.floor(Math.random()*G.nodes.length)];window.__tgt={x:n.x,z:n.z}}
          const e=H.CV,t=window.__tgt,dx=t.x-e.pos.x,dz=t.z-e.pos.z;let d=Math.atan2(-dx,-dz)-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;k.a=d>.06;k.d=d<-.06;k.w=e.spd<11;k.s=false;
          if(Math.abs(e.spd)<.3&&s%120===119){const q=G.nearestRoad?G.nodes[G.nearestNode(e.pos.x,e.pos.z)]:null;if(q){e.pos.set(q.x,0,q.z);H.syncVan()}}H.step(1);if(s%300===0)H.draw()}
        for(const x of['w','a','s','d'])k[x]=false})}
    const s=await sample();rows.push(s);console.log(SC+' '+(i+1),JSON.stringify({...s,byT:undefined}))}
  /* slope per cycle (least squares) over cycles 1..N, skipping the first cycle (first-use caches) */
  const ser=rows.slice(1);const keys=['rendererMB','gpuMB','jsListeners','domNodesAll','heapMB','geo','tex','progs','objs','dom','listeners','intervals','timeouts','ac','nodes'];const sl={};
  for(const k of keys){const ys=ser.slice(1).map(r=>r[k]);const n=ys.length;if(n<2){sl[k]=0;continue}const mx=(n-1)/2,my=ys.reduce((a,b)=>a+b,0)/n;let num=0,den=0;ys.forEach((y,x)=>{num+=(x-mx)*(y-my);den+=(x-mx)*(x-mx)});sl[k]=+(num/den).toFixed(3)}
  console.log('SLOPE per cycle (cycles 2..N):',JSON.stringify(sl));
  const first=rows[1].byT,last=rows[rows.length-1].byT,dl=[];for(const k of new Set([...Object.keys(first),...Object.keys(last)])){const d=(last[k]||0)-(first[k]||0);if(d)dl.push(k+' '+(d>0?'+':'')+d)}
  console.log('listener types changed (cycle 1 -> last):',dl.join(', ')||'none');
  const pr=await ev(()=>({warns:window.__probe.warns.slice(0,15),nwarn:window.__probe.warns.length,rej:window.__probe.rejections.slice(0,5)}));
  console.log('notes:',notes.slice(0,25).join('\n  '));console.log('console errors',errs.length,errs.slice(0,6));console.log('console warnings',pr.nwarn,pr.warns);console.log('unhandled rejections',pr.rej.length,pr.rej);
  await b.close()})();
