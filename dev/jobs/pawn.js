/* Grand Opening: play it at human pace with REAL keyboard and mouse events, and screenshot every stage (docs/screenshots/jobs/pawn/).
   node dev/jobs/pawn.js [--shots] [--out=dir] [--touch] [--disguise=mustache|press|cousin]
   The player walks with W (yaw set toward the next point: headless synthetic mousemove carries no movementX, so turning is the one
   thing not done through an input event), presses E to talk / take / pick, holds E for the ladder, presses G to fix the disguise,
   answers with 1-4 (reading each person's mood from the bracketed tell, the way a player should), and takes photos with real left
   clicks under pointer lock. Route: van (pick a disguise, fix it) -> small talk -> Marco's ladder -> a song request -> a dance-floor
   sprint until somebody goes "…" (then walks off and talks to fix it) -> Vince's photo op -> a raffle ticket -> Denise -> the office
   (three clicks, E for the book) -> out the front during the raffle -> the van. Prints a timeline and the radio transcript.
   Exit code 1 if it doesn't win, if a step's input did nothing, or on console errors. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const SHOTS=!!arg('shots',false),TOUCH=!!arg('touch',false),DIS=arg('disguise','mustache');
const OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/pawn'));
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open(TOUCH?{viewport:{width:844,height:390},dpr:2}:{});const ev=(f,a)=>p.evaluate(f,a);if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  const step=n=>ev(n=>window.__ht.step(n),n);
  /* a camera placed for a shot (a system camera hook; the job's own hook wins while it frames a conversation or the viewfinder) */
  await ev(()=>{window.HT.Jobs.on('camera',()=>{const c=window.__cam;if(!c)return;const C=window.__ht.camera;C.position.set(c[0],c[1],c[2]);C.lookAt(c[3],c[4],c[5]);return true})});
  const shot=async(n,cam)=>{if(!SHOTS)return;await ev(c=>{window.__cam=c||null},cam||null);
    if(/result/.test(n)){await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(1300);await ev(()=>{window.__rafOn=false})}else await step(1);
    await ev(()=>{const H=window.__ht;H.ow&&H.ow.buildAll&&H.ow.buildAll();H.ow&&H.ow.update&&H.ow.update(H.camera);H.draw()});
    await p.screenshot({path:path.join(OUT,(TOUCH?'touch-':'')+n+'.jpg'),type:'jpeg',quality:84});await ev(()=>{window.__cam=null});console.log('  shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  if(SHOTS)await ev(async()=>{const H=window.__ht;try{H.render.apply('high')}catch(_){}for(let i=0;i<60&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))});
  await p.evaluate(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('pawn');await j.test.give(H.jobs.api);H.jobs.lock('pawn');H.enterHub();H.step(3)});
  /* Dee at the church: the brief */
  const g=await ev(()=>{const H=window.__ht,i=H.jobs.index('pawn');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.6,0,n.pos.z+1.2);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(1.6,1.2);H.P.pitch=-.08;H.step(3);H.use=true;H.step(1);window.__go=H.UIacts&&H.UIacts['brief:go'];return{brief:!!window.__go}});
  ok(g.brief,'Pastor Dee offers the brief');
  if(SHOTS){await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(900);await ev(()=>{window.__rafOn=false});await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(OUT,'00-brief.jpg'),type:'jpeg',quality:84});console.log('  shot 00-brief')}
  await ev(()=>{const H=window.__ht;(H.UIacts['brief:go']||window.__go)();H.step(2)});
  const st=await ev(()=>{const H=window.__ht,i=H.jobs.index('pawn'),d=H.L.dests[i],V=H.VAN;if(H.CV)H.exitVehicle();V.pos.set(d.x-12,0,d.z);V.yaw=-Math.PI/2;V.spd=0;H.syncVan&&H.syncVan();H.P.pos.set(d.x-12,0,d.z+2.5);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);if(V.car){V.car.x=d.x;V.car.z=d.z}H.syncVan&&H.syncVan();for(let k=0;k<90&&H.mode!=='mission';k++)H.step(1);return{mode:H.mode,id:H.M&&H.M.def.id}});
  if(st.mode!=='mission'){await p.evaluate(async()=>{const w=window.__ht.jobs.castWait;if(w)await w;window.__ht.step(2)})}
  /* the party's cast streams in */
  for(let i=0;i<80;i++){const r=await ev(()=>{const H=window.__ht;H.step(1);return!!(H.M&&H.M.pp)});if(r)break;await p.waitForTimeout(400)}
  const live=await ev(()=>{const H=window.__ht;return{mode:H.mode,id:H.M&&H.M.def.id,cast:!!(H.M&&H.M.pp),boxes:H.M&&H.M.pp?Object.values(H.M.pp).filter(q=>!q.d.rb).length:-1}});
  ok(live.mode==='mission'&&live.id==='pawn'&&live.cast&&live.boxes===0,'the job runs and the whole cast is real models '+JSON.stringify(live));
  /* the pointer lock a real player has (the job start asks for it; click the canvas once if it's missing) */
  if(!await ev(()=>!!document.pointerLockElement)){await p.mouse.click(640,360);await step(1)}const lock=await ev(()=>!!document.pointerLockElement);console.log('     pointer lock: '+lock);
  /* ---- helpers: real keys ---- */
  const log=[];let T=0;
  const sample=async()=>{const s=await ev(()=>{const H=window.__ht,M=H.M;if(!M)return null;const s=H.ui&&H.ui.sub;return{st:M.state,stage:M.stage,ph:M.ph,cov:M.D?Math.round(M.D.cover*100):null,chat:M.chat?M.chat.kind+':'+(M.chat.p&&M.chat.p.id):'',
      sub:s?(typeof s==='string'?s:(s.speaker||s.who||'')+': '+(s.text||'')):'',dots:M.D?Object.keys(M.D.timers):[],ex:M.D?M.D.excused:0,slip:!!M.slip,t:Math.round(M.elapsed)}});if(!s)return s;
    const k=s.sub;if(k&&log[log.length-1]!==k)log.push(k);
    /* the hint says the disguise slipped: a player presses G */if(s.slip&&!s.chat&&s.ph!=='fix'){await p.keyboard.press('g');T.fixes=(T.fixes||0)+1}return s};
  const face=(x,z)=>ev(([x,z])=>{const P=window.__ht.P;P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z));P.pitch=-.12},[x,z]);
  const dist=(x,z)=>ev(([x,z])=>{const P=window.__ht.P;return Math.hypot(P.pos.x-x,P.pos.z-z)},[x,z]);
  async function walk(pts,o){o=o||{};for(const q of pts){if(o.until&&await o.until())break;let stuck=0,last=1e9;await face(q.x,q.z);await p.keyboard.down('w');if(o.run)await p.keyboard.down('Shift');
      for(let i=0;i<900;i++){await face(q.x,q.z);await step(2);T+=2;if(i%8===0)await sample();if(o.until&&i%5===0&&await o.until())break;const d=await dist(q.x,q.z);if(d<(q.r||.6))break;if(d>last-.01){if(++stuck>40)break}else stuck=0;last=Math.min(last,d)}
      await p.keyboard.up('w');if(o.run)await p.keyboard.up('Shift')}await step(2)}
  const press=async(k,n)=>{await p.keyboard.press(k);await step(n||2)};
  const waitFor=async(fn,arg,max)=>{for(let i=0;i<(max||900);i++){const r=await ev(fn,arg);if(r)return r;await step(2);T+=2;if(i%15===0)await sample()}return null};
  /* read the tell and answer: bored -> the joke, nervous -> straight, defensive -> overshare, friendly -> the disguise's own line */
  const answer=async(pref)=>{const c=await waitFor(()=>{const M=window.__ht.M;return M&&M.V&&M.V.choice?{list:M.V.choice.list.map(x=>({reg:x.reg,tag:x.tag})),mood:M.chat&&M.chat.p&&(M.chat.p.mood||M.chat.p.c&&M.chat.p.c.mood),kind:M.chat&&M.chat.kind}:null},null,400);
    if(!c)return null;let i=0;if(typeof pref==='number')i=pref;else if(typeof pref==='function')i=pref(c);else{const best={bored:'joke',scared:'real',defensive:'over'}[c.mood];const j=c.list.findIndex(x=>x.reg===best);i=j>=0?j:c.list.length-1}
    await press(String(i+1),2);return{i,c}};
  const talkDone=()=>waitFor(()=>{const M=window.__ht.M;return M&&!M.chat},null,700);
  const skipLines=async n=>{for(let i=0;i<n;i++){await press('e',6)}};
  const at=(id)=>ev(id=>{const q=window.__ht.M.pp[id];return{x:q.pos.x,z:q.pos.z,yaw:q.yaw}},id);
  /* walk up from the street side (people turn to face somebody who walks up to them) */
  const front=async(id,r)=>{if(id==='dj')return{x:367.6,z:41.9,r:.4};if(id==='denise')return{x:356.6,z:33.6,r:.4};const q=await at(id);return{x:q.x,z:Math.max(q.z+(r||1.2),q.z<37?q.z+1:39.4),r:.4}};
  /* ---- 1. out of the van, and pick a disguise from the back ---- */
  await step(10);if(await ev(()=>!!window.__ht.CV)){await press('e',6);ok(!await ev(()=>!!window.__ht.CV),'E gets out of the van')}
  ok(await ev(()=>{const H=window.__ht,c=H.M.car;return Math.hypot(H.P.pos.x-c.pos.x,H.P.pos.z-c.pos.z)<4}),'the job starts beside the van');
  await sample();await step(30);
  const rear=await ev(()=>{const M=window.__ht.M,c=M.car;const l=4.8;return{x:c.pos.x+Math.sin(c.yaw)*(l/2+.7),z:c.pos.z+Math.cos(c.yaw)*(l/2+.7)}});
  await shot('01-van-and-the-party',null);
  await walk([{x:rear.x,z:rear.z,r:.8}]);await press('e',4);
  const pk=await waitFor(()=>{const M=window.__ht.M;return M&&M.V&&M.V.choice?M.V.choice.list.length:0},null,300);ok(pk===3,'E at the back of the van opens the disguise picker (3 choices)');
  await shot('02-pick-a-disguise');
  await press({press:'1',cousin:'2',mustache:'3'}[DIS]||'3',4);
  const ph=await waitFor(()=>{const M=window.__ht.M;return M&&M.ph==='fix'?M.D.id:null},null,200);ok(ph===DIS,'key '+({press:1,cousin:2,mustache:3}[DIS])+' picks '+DIS);
  await step(60);await shot('03-fix-it-with-G',[rear.x-2.2,1.75,rear.z+1.2,rear.x,1.5,rear.z-.2]);
  /* a close-up of the disguise on the dad (crooked: the tutorial pre-slips it) */
  const faceCam=()=>ev(()=>{const H=window.__ht,P=H.P,h=P.dude.rb&&P.dude.rb.body.getObjectByName('Bip01_Head');const v=new H.jobs.api.THREE.Vector3();if(h)h.getWorldPosition(v);else v.set(P.pos.x,1.6,P.pos.z);
    const f={x:-Math.sin(P.yaw),z:-Math.cos(P.yaw)};return[v.x+f.x*.95+f.z*.25,v.y+.05,v.z+f.z*.95-f.x*.25,v.x,v.y-.12,v.z]});
  await shot('03b-disguise-crooked',await faceCam());
  await press('g',4);const fx=await ev(()=>window.__ht.M.ph);ok(fx==='walk','G straightens the disguise (tutorial waits for it): '+fx);
  await step(20);await shot('03c-disguise-fixed',await faceCam());
  /* ---- 2. small talk with the first guest ---- */
  await walk([{x:rear.x,z:45.6},{x:342,z:45.4},{x:346.5,z:42.6}]);const gl=await front('gloria',1.0);await walk([gl]);await face((await at('gloria')).x,(await at('gloria')).z);
  await shot('04-the-party',[344,2.6,46.5,357,1.2,40]);
  await press('e',6);const c1=await waitFor(()=>{const M=window.__ht.M;return M&&M.chat?M.chat.kind+':'+M.chat.p.id:null},null,60);ok(/small:/.test(c1||''),'E on a guest starts small talk: '+c1);
  await waitFor(()=>{const M=window.__ht.M;return M&&M.V&&M.V.choice},null,400);await shot('05-small-talk');const a1=await answer();console.log('     answered '+JSON.stringify(a1));
  await talkDone();const won=await ev(()=>window.__ht.M.talked);console.log('     talked '+JSON.stringify(won));
  /* ---- 3. Marco's ladder ---- */
  await walk([{x:352,z:42.2},{x:358,z:42.3}]);const mr=await front('marco',1.3);await walk([{x:mr.x,z:42.6},mr]);await face((await at('marco')).x,(await at('marco')).z);await press('e',6);
  await answer(0);await talkDone();const lo=await ev(()=>window.__ht.M.ladderOn);ok(lo,"Marco asks for a hand and the ladder job starts");
  await walk([{x:361.8,z:39.85,r:.35}]);await face(361.4,38.6);await p.keyboard.down('e');for(let i=0;i<60;i++){await step(2);if(i===40)await shot('06-hold-the-ladder',[364.6,1.9,42.6,360.8,1.9,38.7])}await p.keyboard.up('e');await step(4);
  const af=await waitFor(()=>window.__ht.M.archFixed,null,120);ok(af,'holding E fixes the arch ("balloon emergency" learned)');await step(150);
  /* ---- 4. a song request ---- */
  await walk([{x:364.5,z:43},{x:367.6,z:41.9}]);await face(369.5,41.3);await press('e',6);await answer(0);await talkDone();const sg=await ev(()=>window.__ht.M.ev&&window.__ht.M.ev.kind);ok(sg==='song','the DJ plays his one song: '+sg);
  await step(150);await shot('07-the-one-song',[361.2,2.0,44.6,365.5,1.1,41]);
  /* ---- 5. too weird in public: sprint around the dance floor until somebody goes "…", then walk off and make small talk ---- */
  const spr=[{x:362.2,z:42.8},{x:366.5,z:42.9},{x:366.6,z:40.4},{x:362.4,z:40.4}];let dots=null;
  const anyDots=()=>ev(()=>{const M=window.__ht.M;const k=Object.keys(M.D.timers);return k.length?k:null});for(let lap=0;lap<6&&!dots;lap++){await walk(spr,{run:true,until:anyDots});dots=await anyDots()}
  ok(!!dots,'sprinting around people drains cover until somebody starts a politeness timer: '+JSON.stringify(dots));
  if(dots){const who=await ev(ds=>{const H=window.__ht,P=H.P;return ds.map(id=>[id,Math.hypot(H.M.pp[id].pos.x-P.pos.x,H.M.pp[id].pos.z-P.pos.z)]).sort((a,b)=>a[1]-b[1])[0][0]},dots);const q=await at(who);await face(q.x,q.z);await step(2);await shot('08-politeness',[q.x+Math.sin(q.yaw)*3.2+1.2,2.0,q.z+Math.cos(q.yaw)*3.2+1.4,q.x,1.6,q.z]);
    console.log('     at the first "…": '+JSON.stringify(await sample()));const fr=await front(who,1.0);await walk([fr]);console.log('     walked up: '+JSON.stringify(await sample()));await face(q.x,q.z);await press('e',6);const ch=await ev(()=>window.__ht.M.chat&&window.__ht.M.chat.p.id);
    const cancelled=await ev(w=>!window.__ht.M.D.timers[w],who);ok(ch===who&&cancelled,'walking up and talking to '+who+' cancels their "…"');await answer();await talkDone()}
  await step(60);
  /* ---- 6. Vince's photo op (a real click when he smiles) ---- */
  await waitFor(()=>{const v=window.__ht.M.pp.vince;return v.mode==='home'},null,400);const vf=await front('vince',1.3);await walk([{x:362,z:42.6},{x:vf.x,z:42.6},vf]);const vq=await at('vince');await face(vq.x,vq.z);await press('e',6);console.log('     vince chat: '+await ev(()=>{const M=window.__ht.M,P=window.__ht.P;return(M.chat?M.chat.kind+':'+M.chat.p.id:'none')+' d='+Math.hypot(M.pp.vince.pos.x-P.pos.x,M.pp.vince.pos.z-P.pos.z).toFixed(2)+' mode='+M.pp.vince.mode}));await answer(0);await talkDone();
  const pst=await ev(()=>window.__ht.M.photo&&window.__ht.M.photo.st);ok(pst==='walk','Vince sends you to the photo spot');
  await walk([{x:358,z:42.35,r:.4}]);await face(358,39.3);const aim=await waitFor(()=>window.__ht.M.photo&&window.__ht.M.photo.st==='aim',null,200);ok(aim,'standing on the spot raises the viewfinder');
  let shotOk=false;for(let i=0;i<120&&!shotOk;i++){const q=await ev(()=>{const ph=window.__ht.M.photo;return ph&&ph.q});if(q>.68&&q<.82){await shot('09-photo-op');await p.mouse.down();await step(2);await p.mouse.up();await step(2);shotOk=true}else await step(1)}
  const vip=await waitFor(()=>window.__ht.M.vip,null,60);ok(vip,'a left click (under pointer lock) takes the photo: VIP');await skipLines(2);await step(90);
  /* ---- 7. a raffle ticket ---- */
  const kf=await front('kev',1.25);await walk([{x:kf.x,z:42.4},kf]);await face((await at('kev')).x,(await at('kev')).z);await press('e',6);await answer(0);await talkDone();ok(await ev(()=>window.__ht.M.ticket),'Kev sells a raffle ticket (#407)');
  /* ---- 8. Denise ---- */
  await walk([{x:358,z:40.3},{x:358,z:36.6},{x:357.6,z:34.3},{x:356.6,z:33.5,r:.4}]);const dq=await at('denise');await face(dq.x,dq.z);await press('e',6);
  await waitFor(()=>{const M=window.__ht.M;return M&&M.V&&M.V.choice},null,300);await shot('10-denise');
  await answer(c=>{const j=c.list.findIndex(x=>/VIP|Balloon/.test(x.tag||''));return j>=0?j:1});await talkDone();ok(await ev(()=>window.__ht.M.deniseOk),'Denise lets you through');
  /* ---- 9. the office ---- */
  await walk([{x:357,z:32.4},{x:357,z:29.6},{x:359.4,z:28.2},{x:360.35,z:27.45,r:.35}]);const sg2=await ev(()=>window.__ht.M.stage);ok(sg2==='office','into the back office: stage '+sg2);
  await face(361.05,26.35);await ev(()=>{window.__ht.P.pitch=-.55});await step(30);await shot('11-the-ledger',[358.2,2.2,29.4,361,.9,26.4]);
  console.log('     lock before the ledger clicks: '+await ev(()=>!!document.pointerLockElement));if(!await ev(()=>!!document.pointerLockElement)){await p.mouse.click(640,360);await step(2)}
  for(let i=0;i<3;i++){await step(i?52:4);await p.mouse.down();await step(2);await p.mouse.up();await step(2)}const pg=await waitFor(()=>window.__ht.M.pages>=3,null,120);ok(pg,'three clicks photograph three pages');
  await press('e',6);const bk=await ev(()=>window.__ht.M.book);ok(bk,'E takes the whole book');
  /* ---- 10. out the front during the raffle ---- */
  await walk([{x:357,z:29.6},{x:357,z:32.6},{x:358,z:34.4}]);const ex=await ev(()=>({stage:window.__ht.M.stage,raffle:!!(window.__ht.M.ev&&window.__ht.M.ev.kind==='raffle')}));ok(ex.stage==='exit'&&ex.raffle,'leaving the office with the goods starts the raffle: '+JSON.stringify(ex));
  await step(90);await walk([{x:358,z:37.4},{x:357.2,z:39.4}]);await step(120);await shot('12-the-raffle',[352.2,2.6,43.6,362,1.2,39.2]);
  await walk([{x:356,z:42.6},{x:346,z:42.6}]);const vr=await ev(()=>{const c=window.__ht.M.car;return{x:c.pos.x+Math.cos(c.yaw)*2.2,z:c.pos.z-Math.sin(c.yaw)*2.2}});await walk([{x:vr.x,z:vr.z,r:.7}]);
  await press('e',10);await step(30);const fin=await ev(()=>({state:window.__ht.M&&window.__ht.M.state,medal:window.__ht.M&&window.__ht.M.medal,t:Math.round(window.__ht.M.elapsed)}));
  ok(fin.state==='won','back in the van: the job is won '+JSON.stringify(fin));await step(40);await shot('13-result');
  const res=await ev(()=>{const r=document.querySelector('.ht-result');return r?r.innerText.replace(/\s+/g,' ').slice(0,500):null});console.log('     result: '+res);
  /* back in the hub: the storefront is Ramos Bakery now */
  const bak=await ev(()=>{const H=window.__ht;H.UIacts['result:go']&&H.UIacts['result:go']();H.step(3);if(H.CV)H.exitVehicle();H.P.pos.set(358,0,45.5);H.collide(H.P.pos,.35);for(let i=0;i<20;i++)H.step(1);
    const s=H.jobs.api.SV();return{mode:H.mode,store:s&&s.world&&s.world.storefronts&&s.world.storefronts.pawn,sign:!!H.L.group.getObjectByName('ramosBakery')}});
  ok(bak.store==='bakery'&&bak.sign,'the storefront is Ramos Bakery in the hub '+JSON.stringify(bak));await shot('14-ramos-bakery',[352.5,2.2,47.5,358,2.6,38]);
  console.log('\n---- transcript ----\n'+log.join('\n'));
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,5).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
