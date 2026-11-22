/* The first minutes of a brand-new save, with real inputs only (Playwright keyboard + mouse on a live page, no __ht calls that change
   state; __ht is only READ to log what the player is being told and to aim the scripted hands).
   node dev/audit/playthrough/first15.js [--minutes 15]
   Writes docs/audit/playthrough/first15-*.jpg and first15-log.txt */
const {open}=require('./lib.js'),fs=require('fs'),path=require('path');
const MIN=(i=>i>0?+process.argv[i+1]:15)(process.argv.indexOf('--minutes'));
const LOG=[];const log=(...a)=>{const s=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ');LOG.push(s);console.log(s)};
(async()=>{const r=await open({fresh:true}),{p,b,errs}=r;const T0=Date.now(),el=()=>((Date.now()-T0)/1000).toFixed(0)+'s';
  const save=()=>fs.writeFileSync(path.join(__dirname,'../../../docs/audit/playthrough/first15-log.txt'),LOG.join('\n')+'\n\nconsole errors:\n'+errs.join('\n'));
  await r.live();await p.waitForTimeout(1500);
  const title=await r.ev(()=>({btns:[...document.querySelectorAll('.ht-title button,.ht-title [data-act]')].map(e=>e.textContent.trim()).filter(Boolean),focus:document.activeElement&&document.activeElement.textContent.trim(),premise:(document.querySelector('.ht-title')||{}).textContent.replace(/\s+/g,' ').slice(0,400)}));
  log(el(),'TITLE',title);log('shot',await r.shot('first15-01-title'));
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(800);
  /* a confirm may appear (no save yet: should not) */
  const dlg=await r.ev(()=>{const d=document.querySelector('.ht-dlg');return d&&d.textContent.replace(/\s+/g,' ').trim()});if(dlg){log('DIALOG after New game:',dlg);await p.keyboard.press('Enter')}
  await p.waitForTimeout(4000);
  let ui=await r.ui();log(el(),'AFTER NEW GAME',ui);log('shot',await r.shot('first15-02-spawn'));
  const cv=await p.$eval('#c',c=>{const q=c.getBoundingClientRect();return{x:q.x+q.width/2,y:q.y+q.height/2}});
  await p.mouse.click(cv.x,cv.y);await p.waitForTimeout(600);ui=await r.ui();log(el(),'after clicking the view',{screen:ui.screen,running:ui.running,hint:ui.hint});
  /* calibrate mouse look */
  const y0=(await r.ui()).yaw;await p.mouse.move(cv.x+1,cv.y);await p.mouse.move(cv.x+101,cv.y,{steps:5});await p.waitForTimeout(400);const y1=(await r.ui()).yaw;
  const perPx=(y0-y1)/100;log('look calibration: yaw per px',perPx.toFixed(5));let mx=cv.x+101;
  const turnBy=async dYaw=>{if(!perPx)return;let px=Math.max(-300,Math.min(300,-dYaw/perPx));if(mx+px>1270||mx+px<10){await p.mouse.move(cv.x,cv.y+400);/* leave */await p.mouse.move(cv.x,cv.y);mx=cv.x}
    await p.mouse.move(mx+px,cv.y,{steps:3});mx+=px};
  let lastHint=null,lastObj=null,lastPrompt=null,lastMarker=null;
  const watch=async tag=>{const u=await r.ui();if(u.hint!==lastHint){log(el(),'HINT',u.hint);lastHint=u.hint}if(u.obj!==lastObj){log(el(),'OBJECTIVE',u.obj);lastObj=u.obj}
    if(u.prompt!==lastPrompt){log(el(),'PROMPT',u.prompt);lastPrompt=u.prompt}const mk=u.marker&&u.marker.label;if(mk!==lastMarker){log(el(),'MARKER',u.marker);lastMarker=mk}return u};
  /* walk toward a point with real W/Shift and mouse turns */
  const walkTo=async(tx,tz,stopD,maxMs,o={})=>{const t1=Date.now();await p.keyboard.down('w');if(o.jog)await p.keyboard.down('Shift');let best=1e9,stuck=0,u;
    while(Date.now()-t1<maxMs){u=await watch();if(u.screen&&u.screen!=='hud'&&u.screen!=='play'){log(el(),'screen opened while walking:',u.screen);break}
      const dx=tx-u.pos.x,dz=tz-u.pos.z,d=Math.hypot(dx,dz);if(d<stopD)break;let a=Math.atan2(-dx,-dz)-u.yaw;while(a>Math.PI)a-=6.283;while(a<-Math.PI)a+=6.283;if(Math.abs(a)>.12)await turnBy(a*.8);
      if(d<best-0.5){best=d;stuck=0}else if(++stuck>25){/* stuck on something: strafe + jump */await p.keyboard.down('d');await p.keyboard.press(' ');await p.waitForTimeout(700);await p.keyboard.up('d');stuck=0}
      await p.waitForTimeout(200)}
    await p.keyboard.up('w');if(o.jog)await p.keyboard.up('Shift');return u};
  /* 1. the hints: look, walk, jog... */
  for(let i=0;i<6;i++){await p.mouse.move(mx+40,cv.y,{steps:4});mx+=40;await p.waitForTimeout(300);await watch()}
  await p.keyboard.down('w');await p.waitForTimeout(3000);await watch();await p.keyboard.down('Shift');await p.waitForTimeout(3500);await watch();await p.keyboard.up('Shift');await p.keyboard.up('w');
  await watch();log('shot',await r.shot('first15-03-hints'));
  /* 2. follow the yellow marker */
  for(let leg=0;leg<6&&Date.now()-T0<MIN*60000;leg++){const u=await watch();if(!u.marker){log(el(),'no marker on screen');break}
    log(el(),'WALK to marker',u.marker,'from',u.pos,'dist',Math.round(Math.hypot(u.marker.x-u.pos.x,u.marker.z-u.pos.z)));
    const e=await walkTo(u.marker.x,u.marker.z,2.2,240000,{jog:true});log(el(),'arrived near',e.pos,'prompt',e.prompt);log('shot',await r.shot('first15-04-giver-'+leg));
    if(e.prompt&&e.prompt.key){await p.keyboard.press('e');await p.waitForTimeout(1500);const s=await r.ui();log(el(),'after E: screen',s.screen);
      const card=await r.ev(()=>{const c=document.querySelector('.ht-brief,.ht-scr:not(.off)');return c?{text:c.textContent.replace(/\s+/g,' ').trim().slice(0,1200),btns:[...c.querySelectorAll('button,[data-act]')].map(x=>(x.dataset.act||'')+'='+x.textContent.trim())}:null});
      log(el(),'BRIEF',card);log('shot',await r.shot('first15-05-brief'));break}}
  /* 3. accept with the keyboard */
  await p.keyboard.press('Enter');await p.waitForTimeout(2000);let u=await watch();log(el(),'after Enter on the brief',{screen:u.screen,job:u.job,obj:u.obj,marker:u.marker});
  if(u.screen&&u.screen!=='hud'){const btn=await r.ev(()=>[...document.querySelectorAll('[data-act]')].filter(e=>e.offsetParent).map(e=>e.dataset.act+'='+e.textContent.trim()));log('still on a screen, buttons',btn);
    await p.click('[data-act="brief:go"]').catch(()=>{});await p.waitForTimeout(1500);u=await watch()}
  log('shot',await r.shot('first15-06-accepted'));
  /* 4. to the van, get in */
  const van=await r.ev(()=>({x:window.__ht.VAN.pos.x,z:window.__ht.VAN.pos.z}));log(el(),'van at',van,'player',u.pos);
  u=await walkTo(van.x,van.z,3.2,180000,{jog:true});log(el(),'at van, prompt',u.prompt);await p.keyboard.press('e');await p.waitForTimeout(2000);u=await watch();log(el(),'after E at van: inVan',u.inVan);log('shot',await r.shot('first15-07-van'));
  /* 5. drive to the yellow marker with W/A/D (the route the GPS draws) */
  if(u.inVan){const route=await r.ev(()=>{const H=window.__ht,m=H.marker;if(!m)return null;const G=H.ow.roads(),rt=G.route({x:H.VAN.pos.x,z:H.VAN.pos.z},{x:m.x,z:m.z});return{pts:rt?rt.points.map(q=>({x:q.x,z:q.z})):[{x:m.x,z:m.z}],tgt:{x:m.x,z:m.z},label:m.label}});
    log(el(),'DRIVE to',route&&route.label,route&&route.tgt,'route pts',route&&route.pts.length);let wi=1,held={},t1=Date.now();
    const set=async(k,on)=>{if(!!held[k]===on)return;held[k]=on;on?await p.keyboard.down(k):await p.keyboard.up(k)};
    while(route&&Date.now()-t1<420000&&Date.now()-T0<MIN*60000){const s=await r.ev(()=>{const H=window.__ht,e=H.CV||H.VAN;return{x:e.pos.x,z:e.pos.z,yaw:e.yaw,spd:e.spd,mode:H.mode,screen:H.HUD.screen}});
      if(s.mode!=='hub'||(s.screen&&s.screen!=='hud')){log(el(),'drive ended: mode',s.mode,'screen',s.screen);break}
      const tg=route.tgt,d0=Math.hypot(tg.x-s.x,tg.z-s.z);while(wi<route.pts.length-1&&Math.hypot(route.pts[wi].x-s.x,route.pts[wi].z-s.z)<7)wi++;const w=d0<14?tg:route.pts[Math.min(wi,route.pts.length-1)];
      let a=Math.atan2(-(w.x-s.x),-(w.z-s.z))-s.yaw;while(a>Math.PI)a-=6.283;while(a<-Math.PI)a+=6.283;const want=d0<14?3:Math.abs(a)>.5?5:9;
      await set('a',a>.08);await set('d',a<-.08);await set('w',s.spd<want);await set('s',s.spd>want+3);await watch();await p.waitForTimeout(120)}
    for(const k of['w','a','s','d'])await set(k,false);u=await watch();log(el(),'after the drive',{mode:u.mode,screen:u.screen,obj:u.obj});log('shot',await r.shot('first15-08-arrive'))}
  /* 6. the job itself, as long as time allows: just log what the player is told every 5 s, walking toward the marker */
  await p.waitForTimeout(3000);u=await watch();if(u.screen&&u.screen!=='hud'){log(el(),'a screen is open at the job:',u.screen);await p.keyboard.press('Enter');await p.waitForTimeout(1500)}
  log('shot',await r.shot('first15-09-job'));
  while(Date.now()-T0<MIN*60000){u=await watch();if(u.mode!=='mission')break;if(u.marker){await walkTo(u.marker.x,u.marker.z,2,20000,{});await p.keyboard.press('e')}
    /* fire at whatever is in front if enemies are near */const en=await r.ev(()=>window.__ht.enemies.filter(e=>e.state!=='dead'&&e.state!=='cuffed').length);log(el(),'enemies up',en,'hp',await r.ev(()=>Math.round(window.__ht.P.hp)));
    await p.waitForTimeout(3000)}
  log('shot',await r.shot('first15-10-end'));log(el(),'END',await r.ui());save();await b.close()})().catch(e=>{console.error(e);LOG.push('CRASH '+e.message);try{fs.writeFileSync(path.join(__dirname,'../../../docs/audit/playthrough/first15-log.txt'),LOG.join('\n'))}catch(_){}process.exit(1)});
