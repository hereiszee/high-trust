/* Title screen safety + Credits & licences, with real key and mouse events.
   node dev/release-title.e2e.js [--shots]   (screenshots to docs/screenshots/release/)
   - a save exists: Continue is first and focused; Enter on New game opens a two-step dialog whose default is Cancel
   - Cancel / Esc / backdrop keep the save; confirming starts over and keeps the old save in the "previous" slot
   - "Restore previous save" brings it back; Credits & licences opens from title and pause, scrolls, Esc closes */
const {open}=require('./ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const SHOTS=process.argv.includes('--shots'),DIR=path.join(__dirname,'../docs/screenshots/release');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{
  const {b,p,errs}=await open({init:()=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.clear();
    localStorage.setItem('ht-save',JSON.stringify({v:3,cash:4321,prog:{missionsRun:3,trust:30},stats:{spent:10}}))}}});
  const ev=(f,a)=>p.evaluate(f,a);await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
  const wait=ms=>p.waitForTimeout(ms);
  const shot=async n=>{if(!SHOTS)return;fs.mkdirSync(DIR,{recursive:true});await wait(700);await p.screenshot({path:path.join(DIR,n+'.jpg'),type:'jpeg',quality:84})};
  const focused=()=>ev(()=>{const a=document.activeElement;return a&&(a.dataset.act||a.dataset.dlg||a.tagName)});
  const saveCash=()=>ev(()=>{try{return JSON.parse(localStorage.getItem('ht-save')).cash}catch(e){return null}});
  await wait(1500);
  ok(await ev(()=>window.__ht.mode)==='title','on the title');
  const order=await ev(()=>[...document.querySelectorAll('.ht-title .ht-btns .ht-btn')].filter(b=>!b.hidden).map(b=>b.dataset.act));
  ok(order[0]==='continue','Continue is the first button: '+order.join(','));
  ok(await focused()==='continue','Continue has focus after loading ('+await focused()+')');
  await shot('title-continue');
  /* one stray Enter on Continue just continues; test New game instead: Tab to it, Enter */
  await p.keyboard.press('Tab');await wait(100);ok(await focused()==='newgame','Tab reaches New game');
  await p.keyboard.press('Enter');await wait(250);
  ok(await ev(()=>!!document.querySelector('.ht-dlg')),'Enter on New game opens a confirmation');
  ok(await focused()==='cancel','the dialog focuses Cancel by default');
  await shot('newgame-confirm');
  await p.keyboard.press('Enter');await wait(250);
  ok(await ev(()=>!document.querySelector('.ht-dlg')&&window.__ht.mode==='title'),'Enter (on Cancel) closes it, still on the title');
  ok(await saveCash()===4321,'save untouched after Cancel');
  await p.click('.ht-title [data-act=newgame]');await wait(250);await p.keyboard.press('Escape');await wait(250);
  ok(await ev(()=>!document.querySelector('.ht-dlg')&&window.__ht.mode==='title')&&await saveCash()===4321,'Esc cancels, save untouched');
  await p.click('.ht-title [data-act=newgame]');await wait(250);await p.mouse.click(20,20);await wait(250);
  ok(await ev(()=>!document.querySelector('.ht-dlg'))&&await saveCash()===4321,'a click on the backdrop cancels');
  /* confirm: arrows to the danger button, Enter */
  await p.click('.ht-title [data-act=newgame]');await wait(250);await p.keyboard.press('ArrowLeft');await wait(80);ok(await focused()==='ok','ArrowLeft moves to "Start a new game"');
  await p.keyboard.press('Enter');await wait(800);
  ok(await ev(()=>window.__ht.mode)!=='title','confirmed: the new game started');
  const prev=await ev(()=>{try{return JSON.parse(localStorage.getItem('ht-save-prev')).cash}catch(e){return null}});
  ok(prev===4321,'the old save is kept in the previous slot (cash '+prev+')');
  ok(await saveCash()!==4321,'the live save is the new game');
  /* back to the title: Restore previous save */
  await ev(()=>{window.__ht.running=false});await ev(()=>window.__ht.quitToTitle&&window.__ht.quitToTitle());
  if(await ev(()=>window.__ht.mode)!=='title'){await ev(()=>{location.reload()});await p.waitForFunction(()=>window.__ht&&window.__ht.assets&&window.__ht.assets.done,null,{timeout:90000});await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)})}
  await wait(800);
  ok(await ev(()=>{const r=document.querySelector('.ht-title [data-act=restore]');return r&&!r.hidden}),'title offers "Restore previous save"');
  await shot('title-restore');
  await p.click('.ht-title [data-act=restore]');await wait(250);ok(await focused()==='cancel','restore asks first (Cancel focused)');
  await p.click('.ht-dlg [data-dlg=ok]');await wait(400);
  ok(await saveCash()===4321,'restored: the old save is live again');
  /* credits from the title */
  await p.click('.ht-title [data-act=credits]');await wait(300);
  const cr=await ev(()=>{const d=document.querySelector('.ht-dlg .bd');return d?{txt:d.textContent,sh:d.scrollHeight,ch:d.clientHeight}:null});
  ok(cr&&/Rocketbox/.test(cr.txt)&&/three\.js/.test(cr.txt)&&/meshoptimizer/.test(cr.txt)&&/Poly Haven/.test(cr.txt)&&/Permission is hereby granted/.test(cr.txt),'credits show Rocketbox, three.js, meshoptimizer, Poly Haven and the MIT text');
  ok(cr&&cr.sh>cr.ch,'credits scroll ('+(cr&&cr.sh)+' > '+(cr&&cr.ch)+')');
  await shot('credits');
  await p.keyboard.press('End');await wait(150);ok(await ev(()=>{const d=document.querySelector('.ht-dlg .bd');return d.scrollTop>0}),'End scrolls to the bottom');
  {const bb=await p.$eval('.ht-dlg .bd',d=>{const r=d.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});await p.mouse.move(bb.x,bb.y);const top0=await ev(()=>document.querySelector('.ht-dlg .bd').scrollTop);for(let i=0;i<8;i++){await p.mouse.wheel(0,-600);await wait(60)}await wait(900);const top1=await ev(()=>document.querySelector('.ht-dlg .bd').scrollTop);
    const under=await ev(b=>{const e=document.elementFromPoint(b.x,b.y);return e&&(e.closest('.bd')?'bd':e.className||e.tagName)},bb);ok(top1<top0,'mouse wheel scrolls back up ('+top0+' → '+top1+', under the pointer: '+under+')')}
  await p.keyboard.press('Escape');await wait(250);ok(await ev(()=>!document.querySelector('.ht-dlg')&&window.__ht.mode==='title'),'Esc closes credits, still on the title');
  /* credits from the pause menu */
  await p.click('.ht-title [data-act=continue]');await wait(1200);
  await ev(()=>{const H=window.__ht;H.running=true});await p.keyboard.press('Escape');await wait(400);
  const paused=await ev(()=>window.__ht.HUD.screen);ok(paused==='pause','Esc opens pause ('+paused+')');
  await p.click('.ht-pause [data-act=credits]');await wait(300);ok(await ev(()=>!!document.querySelector('.ht-dlg')),'pause → Credits & licences opens');
  await shot('credits-pause');
  await p.keyboard.press('Escape');await wait(250);ok(await ev(()=>!document.querySelector('.ht-dlg')&&window.__ht.HUD.screen==='pause'),'Esc closes credits back to the pause menu (game stays paused)');
  const bad=errs.filter(e=>!/favicon|net::ERR/.test(e));ok(!bad.length,'no console errors '+bad.slice(0,3).join(' | '));
  await b.close();console.log(fails?`FAIL ${fails}`:'PASS');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
