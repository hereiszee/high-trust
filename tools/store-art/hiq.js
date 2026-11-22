/* Preload for running the repo's existing screenshot harnesses (dev/*.js) at store quality without touching them:
     node -r ./tools/store-art/hiq.js dev/jobs-check.js overwatch --shots
   - every new page/context is 1920x1080 (STORE_W/STORE_H to change) and starts on the High graphics preset
   - screenshots aimed at docs/screenshots/** are written to tools/store-art/shots/** instead (the repo's docs stay as they are)
   - the streaming-details corner text is hidden; a shot waits up to 20 s for texture streaming to finish first */
'use strict';
const path=require('path'),fs=require('fs');
const ROOT=path.resolve(__dirname,'../..'),DOCS=path.join(ROOT,'docs','screenshots')+path.sep,SHOTS=path.join(__dirname,'shots');
const W=+process.env.STORE_W||1920,H=+process.env.STORE_H||1080;
const pw=require('playwright');
const init=()=>{try{const c=JSON.parse(localStorage.getItem('ht-cfg')||'{}');c.gfx='high';localStorage.setItem('ht-cfg',JSON.stringify(c))}catch(e){}
  addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='#strm{visibility:hidden!important}';document.head.appendChild(s)})};
function wrapPage(p){if(p.__hiq)return p;p.__hiq=true;p.addInitScript(init).catch(()=>{});
  const shot=p.screenshot.bind(p);
  p.screenshot=async(o={})=>{if(o.path){const a=path.resolve(o.path);if(a.startsWith(DOCS)){o=Object.assign({},o,{path:path.join(SHOTS,path.relative(DOCS,a))});fs.mkdirSync(path.dirname(o.path),{recursive:true})}}
    try{await p.waitForFunction(()=>{const h=window.__ht;return !h||!h.assets||!h.assets.stream||!h.assets.stream.pending()},null,{timeout:20000})}catch(e){}
    try{await p.evaluate(()=>{const h=window.__ht;if(h&&h.render&&h.render.q!=='high'){h.render.apply('high')}if(h&&h.draw)h.draw()})}catch(e){}
    return shot(o)};return p}
function wrapCtx(c){if(c.__hiq)return c;c.__hiq=true;const np=c.newPage.bind(c);c.newPage=async(...a)=>wrapPage(await np(...a));return c}
const fix=o=>Object.assign({},o||{},{viewport:{width:W,height:H},deviceScaleFactor:1});
for(const bt of[pw.chromium]){const L=bt.launch.bind(bt);
  bt.launch=async(...a)=>{const b=await L(...a);const nc=b.newContext.bind(b),np=b.newPage.bind(b);
    b.newContext=async o=>wrapCtx(await nc(fix(o)));b.newPage=async o=>wrapPage(await np(fix(o)));return b}}
