/* What does a job leave behind? node dev/audit/perf/job-residue.js [--passes=2] [--jobs=0-24] [--exit=abandon|quit|fail]
   Pass 1 starts and leaves every job once (caches warm: models, shaders, closures built once per job). Every later pass does the same and
   counts, per job, what is still alive afterwards that wasn't before: event listeners (net, by the game file:line that added them, on any
   target, including detached nodes), intervals / timeouts / rAF loops still scheduled (by site), DOM nodes (connected and all, CDP),
   JS heap after a forced GC. A real leak shows on every later pass; first-pass growth alone is a cache. */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
const args=process.argv.slice(2),arg=(k,d)=>{const a=args.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const PASSES=+arg('passes',2),EXIT=arg('exit','abandon'),JR=arg('jobs','');
const INIT=()=>{const R=window.__res={l:new Map(),seq:0,t:new Map(),i:new Map()};
  const site=()=>{const s=(new Error().stack||'').split('\n').slice(2).map(x=>x.trim()).find(x=>/\/(js|index\.html)/.test(x)&&!/job-residue/.test(x))||'?';const m=s.match(/(js\/[^:?]+|index\.html)[^:]*:(\d+)/);return m?m[1]+':'+m[2]:s.slice(0,80)};
  const ae=EventTarget.prototype.addEventListener,re=EventTarget.prototype.removeEventListener;
  const key=(t,ty,f,c)=>{if(!t.__rid)Object.defineProperty(t,'__rid',{value:++R.seq});return t.__rid+'|'+ty+'|'+(f&&(f.__rid||(f.__rid=++R.seq)))+'|'+(!!(c&&(c===true||c.capture)))};
  EventTarget.prototype.addEventListener=function(ty,f,c){try{if(f){const k=key(this,ty,f,c);if(!R.l.has(k))R.l.set(k,{site:site(),ty,t:new WeakRef(this)})}}catch(_){}return ae.call(this,ty,f,c)};
  EventTarget.prototype.removeEventListener=function(ty,f,c){try{if(f&&f.__rid)R.l.delete(key(this,ty,f,c))}catch(_){}return re.call(this,ty,f,c)};
  const si=window.setInterval,ci=window.clearInterval;window.setInterval=function(f,ms,...a){const id=si.call(window,f,ms,...a);R.i.set(id,site());return id};window.clearInterval=function(id){R.i.delete(id);return ci.call(window,id)};
  const st=window.setTimeout,ct=window.clearTimeout;window.setTimeout=function(f,ms,...a){let id;const s=site();id=st.call(window,function(){R.t.delete(id);return typeof f==='function'?f.apply(this,arguments):undefined},ms,...a);if(ms>=1000)R.t.set(id,s);return id};window.clearTimeout=function(id){R.t.delete(id);return ct.call(window,id)}};
(async()=>{const {b,p,errs}=await lib.open({init:INIT});const ev=(f,a)=>p.evaluate(f,a);const cdp=await p.context().newCDPSession(p);
  const step=n=>ev(n=>window.__ht.step(n),n);
  const snap=async()=>{await cdp.send('HeapProfiler.collectGarbage');await cdp.send('HeapProfiler.collectGarbage');const hu=await cdp.send('Runtime.getHeapUsage');const dc=await cdp.send('Memory.getDOMCounters');
    const m=await ev(()=>{const R=window.__res,by={},iv={},to={};let n=0,det=0;for(const v of R.l.values()){const t=v.t.deref();if(!t)continue;n++;const d=t.nodeType&&!t.isConnected;if(d)det++;const k=v.site+' '+v.ty+(d?' (detached)':'');by[k]=(by[k]||0)+1}
      for(const s of R.i.values())iv[s]=(iv[s]||0)+1;for(const s of R.t.values())to[s]=(to[s]||0)+1;return{n,det,by,iv,to,dom:document.getElementsByTagName('*').length}});
    m.heap=+(hu.usedSize/1e6).toFixed(2);m.nodesAll=dc.nodes;m.jsl=dc.jsEventListeners;return m};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await step(5);
  const NJ=await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);try{H.prog.done=H.prog.done.map(()=>true);const s=H.jobs.api.SV();if(s&&s.flags)s.flags.act2Intro=true;H.prog.act=Math.max(H.prog.act||1,2)}catch(_){}return H.MISSIONS.length});
  let jobs=[...Array(NJ).keys()];if(JR){const[a,c]=JR.split('-').map(Number);jobs=jobs.filter(j=>j>=a&&j<=(c==null?a:c))}
  const pause=async()=>{for(let t=0;t<3;t++){await p.keyboard.press('Escape');await step(2);if(await ev(()=>window.__ht.HUD.screen==='pause'))return true}return false};
  const run=async j=>{const r=await ev(async j=>{const H=window.__ht;if(H.mode!=='hub'){H.HUD.hide&&H.HUD.hide(H.HUD.screen);H.enterHub();H.step(2)}let err=null;try{H.startMissionWorld(j)}catch(e){err=String(e)}
      const w=H.jobs.castWait;if(w)await Promise.race([w,new Promise(r=>setTimeout(r,20000))]);for(let k=0;k<100&&H.mode!=='mission';k++)await new Promise(r=>setTimeout(r,100));for(let k=0;k<6;k++)H.step(20);return{mode:H.mode,id:H.M&&H.M.def&&H.M.def.id,err}},j);
    if(EXIT==='fail')await ev(()=>{const H=window.__ht;if(H.M&&H.M.state==='go'&&H.endMission)H.endMission(false,'test')});
    else if(await pause()){if(EXIT==='quit'){await ev(()=>document.querySelector('.ht-pause [data-act=quit]').click());await step(3);await ev(()=>{const b=document.querySelector('.ht-dlg [data-dlg=ok]');if(b)b.click()});await step(5);await ev(()=>document.querySelector('.ht-title [data-act=continue]').click());await step(10)}
      else{await ev(()=>document.querySelector('.ht-pause [data-act=abandon]').click());await step(10)}}
    await ev(()=>{const H=window.__ht;if(H.HUD.screen&&H.HUD.screen!=='title'){try{H.UIacts&&H.UIacts['result:back']&&H.UIacts['result:back']()}catch(_){}}if(H.mode!=='hub'){try{H.HUD.hide(H.HUD.screen)}catch(_){}H.enterHub()}for(let i=0;i<4;i++)H.step(5)});return r};
  const diff=(a,b)=>{const o={};for(const k in b){const d=b[k]-(a[k]||0);if(d)o[k]=d}for(const k in a)if(!(k in b))o[k]=-a[k];return o};
  let prev=null;const tot={};
  for(let pass=1;pass<=PASSES;pass++){if(pass===2||PASSES===1)prev=await snap();
    for(const j of jobs){const r=await run(j);if(pass<2&&PASSES>1)continue;const s=await snap();
      const d={job:j+':'+r.id,mode:r.mode,heap:+(s.heap-prev.heap).toFixed(2),listeners:s.n-prev.n,detachedL:s.det-prev.det,jsl:s.jsl-prev.jsl,nodesAll:s.nodesAll-prev.nodesAll,dom:s.dom-prev.dom,sites:diff(prev.by,s.by),iv:diff(prev.iv,s.iv),to:diff(prev.to,s.to)};
      console.log(JSON.stringify(d));for(const k in d.sites)tot[k]=(tot[k]||0)+d.sites[k];prev=s}}
  console.log('TOTAL net listeners by site over the measured pass(es):');for(const[k,v]of Object.entries(tot).sort((a,b)=>b[1]-a[1]))if(v)console.log('  '+v+'  '+k);
  const e=errs.filter(x=>!/favicon|net::ERR|KHR_texture/.test(x));console.log('errors',e.length,e.slice(0,3));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
