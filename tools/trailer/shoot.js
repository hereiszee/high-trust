/* Capture one trailer shot: node tools/trailer/shoot.js <name> [--preview] [--force]
   Each shot lives in tools/trailer/shots/<name>.js and exports {frames, warm?, stage(s, T), frame?(i) (page-side), hud?}.
   Frames go to <scratch>/frames/<name>/f00000.jpg ...; a shot whose frame count is already on disk is skipped (resumable per shot;
   delete the folder or pass --force to re-render). --preview renders 960x540 and keeps every 15th frame in <scratch>/preview/<name>/. */
'use strict';
const fs=require('fs'),path=require('path');const T=require('./lib.js');
const name=process.argv[2];const has=k=>process.argv.includes('--'+k);
if(!name){console.log('usage: node tools/trailer/shoot.js <name> [--preview] [--force]');process.exit(2)}
const S=require('./shots/'+name+'.js');
const PREV=has('preview');const dir=path.join(T.SCRATCH,PREV?'preview':'frames',name);
(async()=>{
  if(!PREV&&!has('force')&&fs.existsSync(dir)&&fs.readdirSync(dir).filter(f=>f.endsWith('.jpg')).length>=S.frames){console.log(name+': already captured');return}
  if(fs.existsSync(dir))for(const f of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,f));
  const t0=Date.now();const s=await T.boot(Object.assign({w:960,h:540},S.boot||{}));/* boot small (SwiftShader renders the loading title every frame), resize before the capture */console.log(name+': booted in '+Math.round((Date.now()-t0)/1000)+' s');
  await s.p.evaluate(T.helpers);
  try{await S.stage(s,T)}catch(e){console.log('STAGE FAILED',e.message);await T.close(s);process.exit(1)}
  if(!PREV){await s.p.setViewportSize({width:1920,height:1080});await s.p.evaluate(async()=>{window.dispatchEvent(new Event('resize'));await new Promise(r=>setTimeout(r,500))})}
  await T.settle(s,120000);
  if(S.after)await S.after(s,T);
  const info=await s.p.evaluate(()=>{const H=window.__ht;return{mode:H.mode,M:H.M&&H.M.def.id,stage:H.M&&H.M.stage,pos:[+H.P.pos.x.toFixed(1),+H.P.pos.z.toFixed(1)],van:!!H.VAN.on}});console.log(name+': staged',JSON.stringify(info),'in',Math.round((Date.now()-t0)/1000),'s');
  const fr=(S.frame||S.frameNode)?(async i=>{if(S.frameNode)await S.frameNode(s,i);if(S.frame)await s.p.evaluate(S.frame,i)}):null;
  const r=await T.capture(s,{dir,frames:S.frames,warm:Math.max(1,S.warm||0),keepBanner:!!S.keepBanner,perFrame:fr,every:PREV?15:1});
  const events=await s.p.evaluate(()=>window.__trEv||[]).catch(()=>[]);
  fs.writeFileSync(path.join(dir,'shot.json'),JSON.stringify({name,frames:S.frames,events,secPerFrame:r.secPerFrame,errs:s.errs.slice(0,20),info,at:new Date().toISOString()},null,1));
  console.log(name+': '+r.done+' frames, '+r.secPerFrame.toFixed(2)+' s/frame, total '+Math.round((Date.now()-t0)/1000)+' s'+(s.errs.length?'  page errors: '+s.errs.slice(0,3).join(' | '):''));
  await T.close(s)})().catch(e=>{console.error(e);process.exit(1)});
