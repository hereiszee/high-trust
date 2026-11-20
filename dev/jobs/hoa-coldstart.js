/* Exhibit HOA from a cold start, played like someone who has never seen it: new game, Barb's brief in the world, the van into the ring,
   then the first minute of the job with real mouse/keyboard input for the phone (right-click raises it, left-click shoots).
   The player only follows what the screen says: the objective line and the yellow marker. A screenshot every 5 s of game time.
   node dev/jobs/hoa-coldstart.js [--out=docs/screenshots/jobs/hoa/coldstart] */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/hoa/coldstart'));
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);fs.mkdirSync(OUT,{recursive:true});
  const shot=async n=>{await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(450);await ev(()=>{window.__rafOn=false});
    await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(OUT,n+'.jpg'),type:'jpeg',quality:82});
    const o=await ev(()=>{const H=window.__ht,O=H.UIobj;return{obj:O?O.lines.slice(0,2).map(l=>l.text).join(' | '):'',prompt:H.prompt?H.prompt.text:''}});console.log('  '+n+'  obj: '+o.obj+(o.prompt?'  [E] '+o.prompt:''))};
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(400);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);H.jobs.registry.get('hoa').test.give(H.jobs.api);H.step(2)});await p.waitForTimeout(3000);
  /* walk up to Barb (the giver in the world) and press E */
  await ev(()=>{const H=window.__ht,i=H.jobs.index('hoa'),n=H.npcs.find(n=>n.marker&&n.marker.i===i);H.P.pos.set(n.pos.x+.8,0,n.pos.z+1.8);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(.8,1.8);H.P.pitch=-.05;H.step(20)});
  await p.keyboard.press('e');await ev(()=>window.__ht.step(2));await shot('c00-barb-offers-the-job');
  await ev(()=>{const H=window.__ht;H.UIacts['brief:go']();H.step(2)});
  await ev(()=>{const H=window.__ht,i=H.jobs.index('hoa'),d=H.L.dests[i];if(H.CV)H.exitVehicle();const V=H.VAN;V.pos.set(d.x-9,0,d.z);V.yaw=-Math.PI/2;H.syncVan&&H.syncVan();H.P.pos.set(d.x-9,0,d.z+2.5);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);H.syncVan&&H.syncVan();for(let k=0;k<90&&H.mode!=='mission';k++)H.step(1)});
  await p.waitForFunction(()=>{const H=window.__ht;H.step(3);return H.M&&H.M.ph&&H.M.ph!=='load'},null,{timeout:60000,polling:250});
  await ev(()=>{const H=window.__ht;if(H.CV)H.exitVehicle();H.step(10)});
  const box=await p.locator('canvas').first().boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;await p.mouse.move(cx,cy);await p.mouse.click(cx,cy);
  /* the newcomer: listen to Barb, take the checklist, follow the marker, raise the phone, shoot what the viewfinder points out */
  let shotN=1,next=0,raised=false,clicked=0,flashed=false,tapped=false,hi=false;
  for(let f=0;f<60*30;f++){const s=await ev(()=>{const H=window.__ht,M=H.M,P=H.P,a=H.jobs.api;if(!M||M.state!=='go')return{end:true};const L={barb:{x:121.6,z:66.7},porch:{x:102.3,z:48.65}};
      let want=null;if(M.ph==='intro'){if(M.elapsed>5)want=Math.hypot(P.pos.x-L.barb.x,P.pos.z-L.barb.z)<5?'tap':'barb'}else if(M.ph==='stake'&&M.guide==='go')want='porch';else if(M.ph==='stake')want='photo';
      /* walking: the long way round on the sidewalks, like a person (Elm St, Walnut west sidewalk, Maple Ave) */
      const route=[{x:121.2,z:67.7},{x:105.8,z:67.7},{x:105.8,z:48.6},L.porch];
      if(want==='barb'){const dx=L.barb.x-P.pos.x,dz=L.barb.z+1.4-P.pos.z,d=Math.hypot(dx,dz);if(d>.3){P.pos.x+=dx/d*.08;P.pos.z+=dz/d*.08;H.collide(P.pos,.35);P.yaw=Math.atan2(-dx,-dz)}}
      if(want==='porch'){M.__ri=M.__ri||0;let q=route[M.__ri];while(q&&Math.hypot(q.x-P.pos.x,q.z-P.pos.z)<.4){M.__ri++;q=route[M.__ri]}if(q){const dx=q.x-P.pos.x,dz=q.z-P.pos.z,d=Math.hypot(dx,dz);P.pos.x+=dx/d*.085;P.pos.z+=dz/d*.085;H.collide(P.pos,.35);P.yaw=Math.atan2(-dx,-dz)}}
      if(want==='photo'&&window.HT.Photo.isRaised()){const sj=window.HT.Photo.S.subjects().find(s=>s.id==='bike');window.HT.Photo.aimAt(sj.pos.x,sj.pos.y+.42,sj.pos.z)}/* mouse-look onto the bike the chip points at */
      H.step(1);return{want,t:M.elapsed,ph:M.ph,guide:M.guide,shots:M.shots,up:window.HT.Photo.isRaised(),lock:window.HT.Photo.focus.locked,tut:!!document.querySelector('.ph-note.on'),phil:!!(H.UIobj&&H.UIobj.lines.some(l=>/say hi to Phil/.test(l.text)))}});
    if(s.end)break;
    if(s.phil&&!hi){hi=true;await p.keyboard.press('e')}/* the objective said to */
    if(s.want==='tap'&&!tapped){tapped=true;await p.keyboard.press('e')}
    if(s.want==='photo'&&!s.up&&!raised){raised=true;await p.mouse.click(cx,cy,{button:'right'})}
    if(s.want==='photo'&&s.up&&!flashed&&s.tut){flashed=true;await p.keyboard.press('f')}/* Maddie said so */
    if(s.want==='photo'&&s.up&&s.lock&&s.shots===0&&clicked++>45){await ev(()=>window.HT.Photo.setZoom(2));await p.waitForTimeout(10);}
    if(s.want==='photo'&&s.up&&s.lock&&s.shots===0&&clicked>70)await p.mouse.click(cx,cy);
    if(s.t>=next){await shot('c'+String(shotN).padStart(2,'0')+'-t'+Math.round(s.t)+'-'+s.ph+(s.guide?'-'+s.guide:''));shotN++;next+=5}
    if(s.t>62)break}
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'console errors: '+bad.slice(0,3).join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
