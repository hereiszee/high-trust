/* Chain Reaction: play it by script and screenshot every stage, or drive the core loop with real mouse and keyboard events.
   node dev/jobs/bike.js [--shots] [--out=dir] [--frames=n]      the job's own bot (test.step), a transcript of every line, a jpg per stage
   node dev/jobs/bike.js --input                                 real Playwright input under pointer lock: mouse to look, W to walk, E to inspect,
                                                                 1-3 to answer, a mouse click in the laptop, E to get on Earl's bike, A/D to steer,
                                                                 H for the bell, E to talk Dez down, E + number keys to tag a bike
   Screenshots wait for the streamed world (stream idle + every open-world unit built). One browser at a time. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const RIDE=!!arg('ride',false),SHOTS=!!arg('shots',false),INPUT=!!arg('input',false),FR=+arg('frames',9000),OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/bike'));
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  const live=async ms=>{await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(ms);await ev(()=>{window.__rafOn=false})};
  const shot=async(n,prep)=>{if(!SHOTS)return;if(prep)await ev(prep);await ev(async()=>{const H=window.__ht;for(let i=0;i<40&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,250))});
    await live(700);await ev(()=>{const H=window.__ht;try{H.ow&&H.ow.buildAll&&H.ow.buildAll();H.ow&&H.ow.update&&H.ow.update(H.camera)}catch(_){}H.draw()});
    await p.screenshot({path:path.join(OUT,n+'.jpg'),type:'jpeg',quality:84});console.log('  shot '+n)};
  /* a fixed camera for a shot (a system camera hook; it returns undefined when no shot is set) */
  await ev(()=>{window.HT.Jobs.on('camera',()=>{let f=window.__cam;if(!f)return;const H=window.__ht,c=H.camera;
    if(f.follow){/* a tracking side shot of Dez or of you on the bike */const M=H.M,o=f.follow==='dez'?(M&&M.dez&&M.dez.R?{x:M.dez.R.pos.x,z:M.dez.R.pos.z,yaw:M.dez.R.yaw}:null):(H.CV?{x:H.CV.pos.x,z:H.CV.pos.z,yaw:H.CV.yaw}:null);if(!o)return;
      const fx=-Math.sin(o.yaw),fz=-Math.cos(o.yaw),rx=Math.cos(o.yaw),rz=-Math.sin(o.yaw);f=[o.x+rx*f.side+fx*f.ahead,f.h,o.z+rz*f.side+fz*f.ahead,o.x+fx*.3,.95,o.z+fz*.3,f.fov]}
    c.position.set(f[0],f[1],f[2]);c.lookAt(f[3],f[4],f[5]);if(f[6]){c.fov=f[6];c.updateProjectionMatrix()}return true})});
  const cam=(f,fov)=>ev(f=>{window.__cam=f},Array.isArray(f)&&fov?f.concat([fov]):f),camOff=()=>ev(()=>{window.__cam=null;const c=window.__ht.camera;c.fov=72;c.updateProjectionMatrix()});
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  if(SHOTS)await ev(async()=>{const H=window.__ht;try{H.render.apply('high')}catch(_){}for(let i=0;i<60&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))});
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('bike'),a=H.jobs.api;for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}
    await window.HT.People.preload(['son','nb_kid','nb_lucia','nb_pops','nb_sweater']);j.test.give(a);H.enterHub();H.step(3)});
  /* transcript: every radio line and every dialogue line, with the job clock */
  await ev(()=>{const H=window.__ht;window.__tx=[];const a=H.jobs.api,r0=a.radio;const R=window.HT.Social;
    setInterval(()=>{},1e9);const seen=new Set();window.__txTick=()=>{const M=H.M;const t=M?Math.round(M.elapsed):0;const sub=document.querySelector('.ht-sub, .ht-subs');
      const s=document.querySelector('.soc-line.show .soc-txt'),w=document.querySelector('.soc-line.show .soc-who');if(s&&w&&s.textContent){const k=w.textContent+':'+s.textContent;if(!seen.has(k)&&s.textContent.length>3&&!/…$/.test(s.textContent)){seen.add(k)}}}});
  if(INPUT){await inputTest(p,ev,live,cam,camOff,shot);console.log(errs.length?'console errors:\n'+errs.slice(0,8).join('\n'):'no console errors');ok(!errs.length,'no console errors');await b.close();process.exit(fails?1:0)}
  /* the giver on the porch */
  const g=await ev(()=>{const H=window.__ht,i=H.jobs.index('bike');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};
    H.P.pos.set(n.pos.x-1.1,0,n.pos.z-1.1);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(-(n.pos.x-H.P.pos.x),-(n.pos.z-H.P.pos.z))+.35;H.P.pitch=-.1;H.step(30);return{x:n.pos.x,z:n.pos.z,rb:!!n.dude.rb}});
  ok(g.rb,'Tyler waits on the porch as the giver (real model: '+g.rb+')');await shot('01-giver');
  const br=await ev(()=>{const H=window.__ht;H.use=true;H.step(1);return!!(H.UIacts&&H.UIacts['brief:go'])});ok(br,'the brief opens');await shot('02-brief');
  await ev(()=>{const H=window.__ht;H.UIacts['brief:go']();H.step(2)});
  const st=await ev(async()=>{const H=window.__ht,J=window.__J;H.jobs.start('bike');H.step(4);return{stage:H.M&&H.M.stage}});ok(st.stage==='rack','job running at the rack');
  /* play with the bot, taking pictures at the beats */
  await ev(r=>{window.__ride=r},RIDE);const taken={};let last='';
  for(let f=0;f<FR;f+=6){
    const r=await ev(n=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('bike'),M=H.M;if(!M||M.state!=='go')return{done:true,state:M&&M.state};
      for(let i=0;i<n;i++){if(!H.M||H.M.state!=='go')break;j.test.step(a,(window.__f=(window.__f||0)+1),{ride:window.__ride});H.P.hp=Math.max(H.P.hp,60);H.step(1)}
      const m=H.M;return{bike:!!(H.CV&&H.CV.type==='bike'),spd:H.CV?H.CV.spd:0,stage:m.stage,found:m.found.length,talk:!!m.talk,choice:!!(m.talk&&m.talk.V.choice),dez:m.dez?m.dez.st:null,lap:!!m.laptopOpen,given:!!m.given,
        adults:(m.adults||[]).length,tagged:m.tagged,card:!!(m.ui&&m.ui.cardT>0),t:Math.round(m.elapsed),state:m.state}},6);
    if(r.done)break;if(r.stage!==last){console.log('  t='+r.t+'s stage '+r.stage);last=r.stage}
    if(r.stage==='rack'&&r.found===1&&r.card&&!taken.clue){taken.clue=1;await shot('04-clue-card',()=>{const M=window.__ht.M;if(M.look)M.look.t=M.look.T})}
    if(r.stage==='rack'&&r.found===0&&!taken.rack){taken.rack=1;await ev(()=>{const H=window.__ht,c=H.M.cluePts.lock;H.P.pos.set(c.x+3.2,0,c.z+3.4);H.P.yaw=Math.atan2(-(c.x-H.P.pos.x),-(c.z-H.P.pos.z));H.P.pitch=-.22;H.step(8)});await shot('03-rack')}
    if(r.stage==='leads'&&r.choice&&!taken.door){taken.door=1;await shot('05-door')}
    if(r.stage==='leads'&&r.card&&r.found>=5&&!taken.phil){taken.phil=1;await shot('06-doorbell')}
    if(r.stage==='leads'&&r.lap&&!taken.lap){taken.lap=1;await live(400);await shot('07-laptop');
      await ev(()=>{const b=document.querySelector('.htm [data-act=primary]');if(b)b.click()});await live(300);await shot('07b-laptop-chat')}
    if(r.stage==='meet'&&r.dez==='wait'&&!taken.meet){taken.meet=1;await ev(()=>{const H=window.__ht,D=H.M.dez;H.P.pos.set(D.x-11,0,D.z+2.5);H.P.yaw=Math.atan2(-(D.x-H.P.pos.x),-(D.z-H.P.pos.z))+.2;H.P.pitch=-.12;H.step(5)});await shot('08-meet')}
    if(r.stage==='chase'&&r.dez==='run'&&!r.bike&&!taken.chase&&!RIDE){taken.chase=1;await ev(()=>window.__ht.step(40));await shot('09-chase')}
    if(r.stage==='chase'&&r.dez==='run'&&r.bike&&r.spd>5&&!taken.bike){taken.bike=1;await shot('10-chase-bike');
      await cam({follow:'cv',side:2.6,ahead:.6,h:1.25,fov:48});await shot('10b-rider-side');await camOff()}
    if(r.stage==='chase'&&r.dez==='run'&&!taken.dez&&r.t>6){taken.dez=1;
      await cam({follow:'dez',side:-2.7,ahead:.8,h:1.2,fov:48});await shot('09b-dez-riding');await camOff()}
    if(r.stage==='chase'&&r.talk&&r.choice&&!taken.talk){taken.talk=1;await shot('11-talkdown')}
    if(r.stage==='garage'&&r.adults&&!taken.gar){taken.gar=1;await ev(()=>{const H=window.__ht;H.step(30)});await cam([430,4.6,99,450,1.2,108.5],52);await shot('12-garage');await camOff()}
    if(r.stage==='bikes'&&r.choice&&!taken.tags){taken.tags=1;await shot('13-tags')}
    if(r.stage==='home'&&r.given&&!taken.home){taken.home=1;await ev(()=>{const H=window.__ht;H.step(60)});const tp=await ev(()=>{const H=window.__ht,b=H.M.tyBike.position;return[b.x,b.z]});
      await cam([tp[0]-5.5,2.4,tp[1]-5.5,tp[0],.8,tp[1]],50);await shot('14-home');await camOff()}
  }
  await ev(()=>window.__ht.step(40));await p.waitForTimeout(1500);await shot('15-result');
  const res=await ev(()=>{const H=window.__ht;return{state:H.M&&H.M.state,h:(document.querySelector('.ht-result h2')||{}).textContent,stats:[...document.querySelectorAll('.ht-result .ht-stats > div')].map(d=>d.textContent).join(' | ')}});
  ok(res.state==='won','won: '+JSON.stringify(res));
  /* the world after: the school rack full, Dez at the library */
  await ev(()=>{const H=window.__ht;if(H.UIacts&&H.UIacts['result:go'])H.UIacts['result:go']();H.step(4)});
  const wd=await ev(()=>{const H=window.__ht,s=H.jobs.api.SV();return{dez:!!(s.flags&&s.flags.dezLibrary),hh:s.world.households.slice()}});ok(wd.dez&&wd.hh.includes('dez_family'),'world after: '+JSON.stringify(wd));
  await ev(()=>{const H=window.__ht,W=H.WORLD,r=W.sites.school.rack;H.P.pos.set(r.x+5,0,r.z+6);H.P.yaw=Math.atan2(-(r.x-H.P.pos.x),-(r.z-H.P.pos.z));H.P.pitch=-.2;H.step(10)});await shot('16-after-rack');
  await ev(()=>{const H=window.__ht,e=H.WORLD.places.g_earl;H.P.pos.set(e.x-1.5,0,e.z+6.5);H.P.yaw=Math.atan2(-(e.x-1.5-H.P.pos.x),-(e.z+1.6-H.P.pos.z));H.P.pitch=-.12;H.step(10)});await shot('17-after-library');
  console.log(errs.length?'console errors:\n'+errs.slice(0,8).join('\n'):'no console errors');ok(!errs.length,'no console errors');
  await b.close();process.exit(fails?1:0)})();

/* ---------------- real input: pointer lock, mouse look, keys ---------------- */
async function inputTest(p,ev,live,cam,camOff,shot){
  const step=n=>ev(n=>window.__ht.step(n),n);
  /* the job, straight from the code (setup only); everything after this is the keyboard and the mouse */
  await ev(()=>{const H=window.__ht;H.jobs.start('bike');H.step(4)});
  await p.mouse.click(640,360);await p.waitForTimeout(200);const lk=await ev(()=>({locked:document.pointerLockElement===document.querySelector('canvas')}));
  console.log('     pointer lock: '+JSON.stringify(lk));
  /* turn toward a point with real mouse movement, then hold W until close */
  const face=async(x,z)=>{for(let i=0;i<12;i++){const e=await ev(([x,z])=>{const P=window.__ht.P;const want=Math.atan2(-(x-P.pos.x),-(z-P.pos.z));let d=want-P.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;return d},[x,z]);
      if(Math.abs(e)<.05)return true;const px=Math.round(clampN(-e/(.00032*sensOf()),-300,300));MX+=px;await p.mouse.move(MX,360,{steps:3});await step(1)}return false};let MX=640;
  let SENS=null;const sensOf=()=>SENS||100;SENS=await ev(()=>{try{return JSON.parse(localStorage.getItem('ht-cfg')||'{}').sens||null}catch(e){return null}})||await ev(()=>window.__ht.HUD&&window.__ht.HUD.settings&&window.__ht.HUD.settings.sens||100);
  const walkTo=async(x,z,r,max)=>{for(let i=0;i<(max||80);i++){await face(x,z);const d=await ev(([x,z])=>{const P=window.__ht.P;return Math.hypot(x-P.pos.x,z-P.pos.z)},[x,z]);if(d<(r||1.2))return true;
      await p.keyboard.down('w');await step(Math.max(2,Math.min(12,Math.round(d*3))));await p.keyboard.up('w');await step(1)}return false};
  /* 1. the rack: walk to each glowing spot and press E */
  for(let k=0;k<3;k++){const c=await ev(()=>{const M=window.__ht.M;const id=['lock','wrapper','tracks'].find(i=>!M.found.includes(i));return id?Object.assign({id},M.cluePts[id]):null});if(!c)break;
    const got=await walkTo(c.x,c.z,1.2);await p.keyboard.press('e');await step(3);const f=await ev(()=>window.__ht.M.found.slice());ok(got&&f.includes(c.id),'rack: walked to the '+c.id+' with W and the mouse, E inspected it ('+f.join(',')+')')}
  const s1=await ev(()=>window.__ht.M.stage);ok(s1==='leads','the rack done: on to asking around ('+s1+')');
  /* 2. Linda's door: walk up, E to knock, E skips lines, 1 picks */
  const L=await ev(()=>{const H=window.__ht;const M=H.M;/* the marker target the job set this frame */const F=H.jobs.JRS&&H.jobs.JRS.hudF;return F&&F.target?{x:F.target.x,z:F.target.z,label:F.target.label}:null});
  ok(!!L,'leads: the marker points somewhere ('+JSON.stringify(L)+')');
  if(L){await walkTo(L.x,L.z,1.4,120);for(let i=0;i<6;i++){await step(10)}await p.keyboard.press('e');await step(4);
    let picked=false;for(let i=0;i<90&&!picked;i++){const s=await ev(()=>{const M=window.__ht.M;return{talk:!!M.talk,choice:!!(M.talk&&M.talk.V.choice)}});
      if(s.choice){await p.keyboard.press('1');picked=true}else if(s.talk)await p.keyboard.press('e');await step(8)}
    for(let i=0;i<60;i++){const t=await ev(()=>!!window.__ht.M.talk);if(!t)break;await p.keyboard.press('e');await step(8)}
    const f=await ev(()=>window.__ht.M.found.slice());ok(picked&&f.length>=4,'door: E knocked, E skipped, 1 answered: a clue on the board ('+f.join(',')+')')}
  /* 3. the laptop: Tyler on the porch, E opens it, the mouse clicks the listing chat */
  const lt=await ev(()=>{const H=window.__ht;const W=H.WORLD,h=W.houses.find(h=>h.home);return{x:h.cx+4.2,z:h.z0*2-1.2}});
  await ev(([x,z])=>{const H=window.__ht;H.P.pos.set(x+.4,0,z-2.6);H.step(3)},[lt.x,lt.z]);/* (the drive home is not the input under test) */
  await walkTo(lt.x,lt.z,1.6,40);await p.keyboard.press('e');await step(3);await live(500);
  const open=await ev(()=>!!document.querySelector('.htm-dadazon')&&!!document.querySelector('[data-key="resale:b_tyler"]'));ok(open,'laptop: E opened Dadazon on the Resale tab');
  if(open){await p.click('[data-key="resale:b_tyler"]');await live(200);await p.click('.htm [data-act=primary]');await live(300);const o1=await p.$('[data-act="resale:say"][data-i="0"]');
    if(o1)await p.click('[data-act="resale:say"][data-i="0"]');await live(2200);const m=await ev(()=>({meet:!!window.__ht.M.meetSet,shop:!!document.querySelector('.htm-dadazon:not(.htm-out)')}));
    ok(m.meet,'laptop: mouse clicks messaged bikez4cheap, the meet is set ('+JSON.stringify(m)+')');if(m.shop)await p.keyboard.press('Escape');await live(300)}
  await p.mouse.click(640,360);await p.waitForTimeout(150);await step(3);
  /* 4. the meet: walk up to Dez with W (he bolts), get on Earl's bike with E, ring the bell (H), steer with A/D, talk him down with E */
  const mt=await ev(()=>{const H=window.__ht,W=H.WORLD,m=W.buildings.find(b=>b.id==='mart');const mf=(m.z1+1)*2;return{x:(m.x1+1)*2+3.2,z:mf+1.2,lx:m.x0*2-1.4,lz:mf+.9}});
  await ev(([x,z])=>{const H=window.__ht;H.P.pos.set(x-30,0,z+3);H.step(30)},[mt.x,mt.z]);
  await walkTo(mt.x,mt.z,6,60);await step(10);const s4=await ev(()=>window.__ht.M.stage);ok(s4==='chase','meet: walking up with W spooked him: chase ('+s4+')');
  await walkTo(mt.lx,mt.lz+1.2,1.4,50);await p.keyboard.press('e');await step(4);const onb=await ev(()=>{const c=window.__ht.CV;return c?c.type:null});ok(onb==='bike','E: on Earl\'s loaner ('+onb+')');
  await p.keyboard.press('h');await step(2);
  let caught=false;for(let i=0;i<260&&!caught;i++){const s=await ev(()=>{const H=window.__ht,M=H.M,D=M.dez,c=H.CV;if(!D||!D.R)return{st:'none'};const R=D.R;const e=c||H.P;const want=Math.atan2(-(R.pos.x-e.pos.x),-(R.pos.z-e.pos.z));let d=want-(c?c.yaw:H.P.yaw);while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;
      return{st:D.st,d:Math.hypot(R.pos.x-e.pos.x,R.pos.z-e.pos.z),err:d,talk:!!M.talk}});
    if(s.st==='winded'){if(await ev(()=>!!window.__ht.CV)){await p.keyboard.press('e');await step(3)}await walkTo(...(await ev(()=>{const R=window.__ht.M.dez.R;return[R.pos.x,R.pos.z]})),2.6,20);await p.keyboard.press('e');await step(4);caught=await ev(()=>!!window.__ht.M.caught);break}
    if(s.st==='gone'||s.st==='hidden')break;const k=s.err>.08?'a':s.err<-.08?'d':null;await p.keyboard.down('w');if(k)await p.keyboard.down(k);await step(6);if(k)await p.keyboard.up(k);await p.keyboard.up('w')}
  ok(caught,'chase: W and A/D on the bike kept up until he was winded, E talked to him');
  if(caught){for(let i=0;i<120;i++){const s=await ev(()=>{const M=window.__ht.M;return{talk:!!M.talk,choice:!!(M.talk&&M.talk.V.choice)}});if(!s.talk)break;await p.keyboard.press(s.choice?'1':'e');await step(6)}
    const s5=await ev(()=>window.__ht.M.stage);ok(s5==='garage','talked down with 1 / E: on to the garage ('+s5+')')}
  for(const k of['w','a','d'])await p.keyboard.up(k)}
function clampN(v,a,b){return v<a?a:v>b?b:v}
