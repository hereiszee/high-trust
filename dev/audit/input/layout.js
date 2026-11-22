/* Screen x size layout walk: node dev/audit/input/layout.js <size> [--shots]
   sizes: deck (1280x800 at 110% interface size = CSS 1164x727 @1.1, html.ht-deck + pad prompts), 720 (1280x720), 1080, uw (2560x1080), 4k (3840x2160)
   For each screen: text clipped by the viewport, text truncated inside an overflow:hidden box, overlapping text boxes, text under 11 device px.
   Writes dev/audit/input/out/layout-<size>.json; screenshots to docs/audit/input/layout/<size>-<screen>.jpg */
const {boot}=require('./lib.js'),fs=require('fs'),path=require('path');
const SIZES={deck:{w:1164,h:727,dpr:1.1,deck:true},'720':{w:1280,h:720,dpr:1},'1080':{w:1920,h:1080,dpr:1},uw:{w:2560,h:1080,dpr:1},'4k':{w:3840,h:2160,dpr:1}};
const SZ=process.argv[2]||'deck',C=SIZES[SZ],SHOTS=process.argv.includes('--shots');
const CHECK=(sel)=>{const Z=window.__zoom||1;const vis=e=>{for(let x=e;x&&x!==document.documentElement;x=x.parentElement){if(x.hidden)return false;const cs=getComputedStyle(x);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<.05)return false}return true};
  const roots=[...document.querySelectorAll(sel)].filter(vis);const leaves=[];
  for(const R of roots){const w=document.createTreeWalker(R,NodeFilter.SHOW_TEXT);for(let n=w.nextNode();n;n=w.nextNode()){const t=n.nodeValue.trim();if(!t)continue;const e=n.parentElement;if(!e||!vis(e)||e.closest('svg'))continue;
      const rg=document.createRange();rg.selectNodeContents(n);const rs=[...rg.getClientRects()].filter(r=>r.width>0&&r.height>0);if(!rs.length)continue;
      const r={l:Math.min(...rs.map(x=>x.left)),t:Math.min(...rs.map(x=>x.top)),r:Math.max(...rs.map(x=>x.right)),b:Math.max(...rs.map(x=>x.bottom))};leaves.push({e,t,r,fs:parseFloat(getComputedStyle(e).fontSize)})}}
  const name=x=>{const e=x.e;return (e.className&&typeof e.className==='string'?'.'+e.className.split(' ')[0]:e.tagName.toLowerCase())+' "'+x.t.slice(0,40)+'"'};
  const scrollAnc=e=>{for(let x=e.parentElement;x&&x!==document.body;x=x.parentElement){const cs=getComputedStyle(x);if(/(auto|scroll)/.test(cs.overflowY+cs.overflowX)&&(x.scrollHeight>x.clientHeight+1||x.scrollWidth>x.clientWidth+1))return x}return null};
  const out={offscreen:[],clipped:[],overlap:[],small:[],n:leaves.length};
  for(const x of leaves){const sa=scrollAnc(x.e);
    if(!sa&&(x.r.r>innerWidth+1||x.r.b>innerHeight+1||x.r.l<-1||x.r.t<-1))out.offscreen.push(name(x)+' @'+[x.r.l,x.r.t,x.r.r,x.r.b].map(Math.round).join(','));
    for(let a=x.e;a&&a!==document.body;a=a.parentElement){const cs=getComputedStyle(a);if(cs.overflow==='hidden'||cs.overflowX==='hidden'||cs.textOverflow==='ellipsis'){if(a.scrollWidth>a.clientWidth+2&&a.clientWidth>0&&(cs.whiteSpace==='nowrap'||cs.textOverflow==='ellipsis')){out.clipped.push(name(x)+' in '+(a.className||a.tagName).toString().split(' ')[0]+' ('+a.scrollWidth+'>'+a.clientWidth+')');}break}}
    if(x.fs*Z<10.95)out.small.push(name(x)+' '+(x.fs*Z).toFixed(1)+'px')}
  for(let i=0;i<leaves.length;i++)for(let j=i+1;j<leaves.length;j++){const A=leaves[i],B=leaves[j];if(A.e===B.e||A.e.contains(B.e)||B.e.contains(A.e))continue;
    const ix=Math.min(A.r.r,B.r.r)-Math.max(A.r.l,B.r.l),iy=Math.min(A.r.b,B.r.b)-Math.max(A.r.t,B.r.t);if(ix<=2||iy<=2)continue;const s=Math.min((A.r.r-A.r.l)*(A.r.b-A.r.t),(B.r.r-B.r.l)*(B.r.b-B.r.t));if(ix*iy>.25*s)out.overlap.push(name(A)+' x '+name(B))}
  for(const k of['offscreen','clipped','overlap','small'])out[k]=[...new Set(out[k])];return out};
(async()=>{const r=await boot({viewport:{width:C.w,height:C.h},dpr:C.dpr});const {ev,p}=r;const res={};const SD=path.join(__dirname,'../../../docs/audit/input/layout');fs.mkdirSync(SD,{recursive:true});
  await ev((o)=>{window.__zoom=o.dpr;if(o.deck){document.documentElement.classList.add('ht-desktop','ht-deck')}},C);
  if(C.deck)await ev(()=>HT.Pad.setLast('pad'));
  await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});/* the page runs live: the HUD's own animation frames must not be dropped */
  const live=async ms=>{await r.wait(ms||700)};
  const snap=async(name,sel)=>{try{if(C.deck)await ev(()=>HT.Pad.swapGlyphs());const c=await ev(CHECK,sel);res[name]=c;if(SHOTS||c.offscreen.length||c.clipped.length||c.overlap.length){await ev(()=>{try{window.__ht.draw()}catch(e){}});await p.screenshot({path:path.join(SD,SZ+'-'+name+'.jpg'),type:'jpeg',quality:70})}
      console.log(name.padEnd(14),'text',c.n,'off',c.offscreen.length,'clip',c.clipped.length,'ovl',c.overlap.length,'small',c.small.length)}catch(e){res[name]={err:e.message.slice(0,200)};console.log(name,'ERR',e.message.slice(0,200))}};
  const esc=()=>p.keyboard.press('Escape');
  await live(900);await snap('title','.ht-scr,.ht-title,body > .ht-root');
  await p.click('.ht-title [data-act=newgame]');await r.wait(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.WM.beat=true;H.step(5)});if(C.deck)await ev(()=>HT.Pad.setLast('pad'));
  await live(500);await snap('hud-hub','.ht-root');
  /* pause tabs */
  await live(300);await ev(()=>{try{document.exitPointerLock()}catch(e){}});await live(300);await ev(()=>{if(!HT.Input.paused)window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))});await live(600);
  console.log('pause state',JSON.stringify(await ev(()=>({run:HT.Input.running,paused:HT.Input.paused,screen:window.__ht.HUD.screen,scr:[...document.querySelectorAll('.ht-scr')].map(e=>e.className+' op='+getComputedStyle(e).opacity)}))));
  for(const t of['controls','display','audio','keys','data']){await ev(t=>{const b=document.querySelector('.ht-pause [data-tab='+t+']');b&&b.click()},t);await live(300);await snap('pause-'+t,'.ht-pause')}
  for(let i=0;i<6&&await ev(()=>HT.Input.paused);i++){await ev(()=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))});await live(500)}
  /* map */
  const mkey=()=>ev(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'m',code:'KeyM',bubbles:true})));await mkey();await live(600);await snap('map','.ht-map');await mkey();await live(600);
  /* shops + locker */
  for(const k of['hardware','auto','dadazon']){await ev(k=>window.__ht.openShop(k),k);await live(600);await snap('shop-'+k,'.htm');await esc();await live(500)}
  await ev(()=>window.__ht.openLocker('loadout'));await live(600);await snap('locker','.htm');await esc();await live(500);
  /* brief */
  await ev(()=>window.__ht.jobs.openBrief('porch'));await live(600);await snap('brief','.ht-scr,.card');await esc();await live(400);
  /* calendar */
  await ev(()=>window.__ht.jobs.calendar());await live(600);await snap('calendar','.ht-scr,.ht-cal');await esc();await live(400);
  /* a job HUD and its result card */
  await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('crossing');j.test.give(H.jobs.api);H.jobs.start('crossing');H.step(3);for(let f=0;f<400;f++){j.test.step(H.jobs.api,f,{});H.step(1)}});if(C.deck)await ev(()=>HT.Pad.setLast('pad'));await live(500);await snap('job-crossing','.ht-root');
  await ev(()=>{window.__ht.jobs.finish(true,'audit');window.__ht.step(3)});await live(1500);await snap('result','.ht-scr,.card,.ht-rc');
  await ev(()=>{try{window.__ht.HUD.hide('result')}catch(e){}window.__ht.enterHub();window.__ht.step(3)});await live(400);
  /* range rack menu */
  await ev(()=>{const H=window.__ht;HT.Roam.fastTravel('base');H.step(30)});await r.wait(600);
  await ev(()=>{const H=window.__ht;if(H.CV)H.exitVehicle();H.step(3);const d=HT.Base.def().range;H.P.pos.set(d.rack.x-1.6,0,d.rack.z);H.step(4);document.dispatchEvent(new KeyboardEvent('keydown',{key:'e',code:'KeyE',bubbles:true}))});await live(400);await snap('range-menu','body > div:last-of-type,.ht-root');await esc();await live(300);
  /* jet and tank */
  await ev(()=>{const H=window.__ht,e=H.vehicles.find(c=>c.type==='jet');if(!e)return;H.P.pos.set(e.pos.x+4,0,e.pos.z);H.step(2);H.enterVehicle(e);H.step(6)});if(C.deck)await ev(()=>HT.Pad.setLast('pad'));await live(500);await snap('jet','.ht-root,body > div');
  await ev(()=>{const H=window.__ht;H.exitVehicle();H.step(4);const e=H.vehicles.find(c=>c.type==='tank');if(!e)return;H.P.pos.set(e.pos.x+3,0,e.pos.z);H.step(2);H.enterVehicle(e);H.step(6)});if(C.deck)await ev(()=>HT.Pad.setLast('pad'));await live(500);await snap('tank','.ht-root');
  await ev(()=>{const H=window.__ht;H.exitVehicle();H.step(3)});
  /* credits */
  await ev(()=>window.__ht.showCredits());await live(1200);await snap('credits','.ht-scr,.ht-cred,body > div');
  fs.mkdirSync(path.join(__dirname,'out'),{recursive:true});fs.writeFileSync(path.join(__dirname,'out/layout-'+SZ+'.json'),JSON.stringify(res,null,1));
  console.log('errs',r.errs.slice(0,4));await r.b.close()})().catch(e=>{console.error(e);process.exit(1)});
