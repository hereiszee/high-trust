/* Screenshots for Act 2 / world missions: node dev/riverside-shots.js  ->  docs/screenshots/riverside-jobs/*.jpg
   Every job mid-mission at its real site, the Duke chase, the stakeout binoculars, the escort, the garden defence,
   the bridge-opening card and Riverside Flats at two trust tiers. Headless Chromium + SwiftShader, driven by window.__ht. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'../docs/screenshots/riverside-jobs');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});
  await p.evaluate(async()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(2);H.render.apply('high');
    for(let i=0;i<60&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))});
  const shot=async(name,fn,arg)=>{try{await p.evaluate(fn,arg);await p.evaluate(()=>{const H=window.__ht;H.ow&&H.ow.update(H.camera);H.draw();H.draw()});await p.waitForTimeout(150);
      await p.screenshot({path:path.join(OUT,name+'.jpg'),type:'jpeg',quality:84});console.log('shot',name)}catch(e){console.log('FAIL',name,String(e).slice(0,300))}};
  const prep=(i,done,trustR)=>p.evaluate(([i,done,trustR])=>{const H=window.__ht;H.prog.done.fill(false);for(const d of done)H.prog.done[d]=true;H.prog.trustR=trustR;if(H.mode!=='hub')H.enterHub();H.openBridge();H.startMissionWorld(i);H.step(2)},[i,done,trustR]);
  const calm=`for(const e of H.enemies){e.thinkT=0}`;
  /* the bridge-opening beat: Rick's job just done */
  await shot('bridge-opening-beat',async()=>{const H=window.__ht;H.prog.done.fill(false);H.prog.done[0]=H.prog.done[1]=true;H.save&&(H.save.flags.act2Intro=false);H.WM.beat=false;H.enterHub();H.step(2);
    const V=H.VAN;H.P.yaw=-Math.PI/2;await new Promise(r=>setTimeout(r,1700))});
  await p.evaluate(()=>{const H=window.__ht;const a=H.UIacts&&H.UIacts['result:go'];if(a)a();H.step(1)});
  /* mid-mission at each site: over the dad's shoulder, facing the action */
  const face=(x,z)=>p.evaluate(([x,z])=>{const H=window.__ht,P=H.P;P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z));P.pitch=-.12},[x,z]);
  const jobs=[[0,[],12],[1,[0],12],[2,[0,1],12],[3,[0,1,2],12],[4,[0,1],12],[6,[0,1,4,5],30],[8,[0,1,2,3,4,5,6,7],55]];
  for(const [i,done,tr] of jobs){await prep(i,done,tr);
    await p.evaluate(()=>{const H=window.__ht,P=H.P;const e=H.enemies.find(e=>e.state==='idle')||H.enemies[0];if(e){P.yaw=Math.atan2(-(e.pos.x-P.pos.x),-(e.pos.z-P.pos.z));P.pitch=-.1}
      for(const a of H.allies){a.pos.set(P.pos.x+Math.cos(P.yaw)*(1.5+Math.random()),0,P.pos.z-Math.sin(P.yaw)*(1.5+Math.random())-Math.cos(P.yaw)*1)}H.step(45)});
    if(i===4)await p.evaluate(()=>{const H=window.__ht,P=H.P;const it=H.L.items[0];P.pos.set(it.x+1.4,0,it.z+.4);H.collide(P.pos,.35);P.yaw=Math.atan2(-(it.x-P.pos.x),-(it.z-P.pos.z));P.pitch=-.25;H.step(2)});
    if(i===6)await p.evaluate(()=>{const H=window.__ht,P=H.P;const g=H.L.grill;P.pos.set(g.x-6,0,g.z+3);H.collide(P.pos,.35);for(let n=0;n<300&&H.enemies.filter(e=>e.state==='idle').length<4;n++)H.step(1);
      const e=H.enemies.find(e=>e.state==='idle');if(e){P.yaw=Math.atan2(-(e.pos.x-P.pos.x),-(e.pos.z-P.pos.z))}H.step(20)});
    if(i===8)await p.evaluate(()=>{const H=window.__ht,P=H.P;const b=H.L.boss;P.pos.set(b.pos.x+8,0,b.pos.z+3);H.collide(P.pos,.35);P.yaw=Math.atan2(-(b.pos.x-P.pos.x),-(b.pos.z-P.pos.z));H.step(30)});
    await shot('job'+i+'-'+['gary','rick','dave','doug','earl','dee','rosa','benny','duke'][i]+'-mid',()=>{});
    if(i===6)await shot('garden-defence',()=>{const H=window.__ht;H.step(60)})}
  /* Earl: carrying a bike out to the van */
  await prep(4,[0,1],12);await shot('job4-earl-carry',()=>{const H=window.__ht,P=H.P;for(const e of H.enemies)H.hurtEnemy(e,999,'player');const it=H.L.items[2];P.pos.set(it.x+.5,0,it.z);H.collide(P.pos,.35);H.keys.e=true;H.step(40);H.keys.e=false;
    const c=H.M.car;P.pos.set(c.pos.x+6,0,c.pos.z+3);H.collide(P.pos,.35);P.yaw=Math.atan2(-(c.pos.x-P.pos.x),-(c.pos.z-P.pos.z))+.6;P.pitch=-.15;H.step(5)});
  /* Dee: the stakeout binoculars, then the raid */
  await prep(5,[0,1,4],20);
  await shot('stakeout-binoculars',()=>{const H=window.__ht;H.step(60);const s=H.suspects.find(s=>s.kind==='courier')||H.suspects[0];const c=H.camera.position;H.P.aim=true;
    for(let i=0;i<20;i++){const dx=s.pos.x-c.x,dz=s.pos.z-c.z,dy=1.2-c.y;H.P.yaw=Math.atan2(-dx,-dz);H.P.pitch=Math.atan2(dy,Math.hypot(dx,dz));H.step(1)}});
  await shot('stakeout-from-the-van',()=>{const H=window.__ht;H.P.aim=false;const s=H.suspects[0];const e=H.CV;H.P.yaw=Math.atan2(-(s.pos.x-e.pos.x),-(s.pos.z-e.pos.z))+.3;H.P.pitch=-.18;H.step(2)});
  await shot('job5-dee-mid',()=>{const H=window.__ht;H.P.aim=false;for(const s of H.suspects)s.id=true;H.M.ids=4;H.step(200);const P=H.P;const e=H.enemies.find(e=>e.state==='idle');if(e){P.yaw=Math.atan2(-(e.pos.x-P.pos.x),-(e.pos.z-P.pos.z));P.pitch=-.08}H.step(40)});
  /* Benny: the escort and the truck chase */
  await prep(7,[0,1,4,5,6],40);
  await shot('escort',()=>{const H=window.__ht,k=H.keys;for(let s=0;s<260;s++){const tr=H.truck,e=H.CV;if(!tr||!e)break;const c=tr.car,f={x:-Math.sin(c.yaw),z:-Math.cos(c.yaw)},gx=c.x-f.x*10,gz=c.z-f.z*10,dx=gx-e.pos.x,dz=gz-e.pos.z,dd=Math.hypot(dx,dz);let d=Math.atan2(-dx,-dz)-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;
      k.a=dd>2&&d>.06;k.d=dd>2&&d<-.06;k.w=dd>2&&e.spd<Math.min(12,dd*.8);k.s=e.spd>Math.min(12,dd*.8)+1.5;H.step(1)}for(const x of['w','a','s','d'])k[x]=false;H.P.yaw=H.CV.yaw;H.P.pitch=-.2;H.step(3)});
  await shot('job7-benny-mid',()=>{const H=window.__ht;const a=H.WJ;H.M.phase!=='ambush'&&H.step(1);})
  await shot('truck-chase',()=>{const H=window.__ht,k=H.keys;H.M.phase='court';H.M.courtT=4;H.step(2);for(let s=0;s<90;s++){const ch=H.chase,e=H.CV;if(!ch||!e)break;const c=ch.car,dx=c.x-e.pos.x,dz=c.z-e.pos.z;let d=Math.atan2(-dx,-dz)-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;k.a=d>.05;k.d=d<-.05;k.w=true;k.shift=true;H.step(1)}
    for(const x of['w','a','s','d','shift'])k[x]=false;H.P.yaw=H.CV.yaw;H.P.pitch=-.18;H.step(1)});
  /* the Duke getaway chase */
  await shot('chase-duke',()=>{const H=window.__ht,k=H.keys;H.prog.done.fill(true);H.prog.done[8]=false;H.startMissionWorld(8,{checkpoint:'chase'});H.step(2);
    for(let s=0;s<110;s++){const ch=H.chase,e=H.CV;if(!ch||!e||ch.state!=='run')break;const c=ch.car,dx=c.x-e.pos.x,dz=c.z-e.pos.z;let d=Math.atan2(-dx,-dz)-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;k.a=d>.05;k.d=d<-.05;k.w=Math.hypot(dx,dz)>14;k.s=Math.hypot(dx,dz)<9;k.shift=Math.hypot(dx,dz)>25;H.step(1)}
    for(const x of['w','a','s','d','shift'])k[x]=false;H.P.yaw=H.CV.yaw;H.P.pitch=-.16;H.step(1)});
  /* Riverside Flats at two trust tiers: Main St at 2nd St, looking east */
  for(const [t,name] of [[5,'riverside-trust-5'],[55,'riverside-trust-55']])await shot(name,t=>{const H=window.__ht;H.prog.done.fill(false);H.prog.done[0]=H.prog.done[1]=true;H.enterHub();H.openBridge();H.dress(t);H.prog.trustR=t;
      const P=H.P;P.pos.set(356,0,46);H.collide(P.pos,.35);P.yaw=-Math.PI/2+.25;P.pitch=-.08;H.step(4);H.dress(t);H.ow.buildAll();H.step(2)},t);
  console.log('console errors:',errs.length?errs.slice(0,5):'none');await b.close()})();
