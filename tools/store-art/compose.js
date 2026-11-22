/* Composites store graphics from layered renders: plate (the full in-game render), matte (characters only, white on
   black, same camera) and the logo (HTML/CSS with the game's fonts), rendered by Playwright at 2x and downsampled.
   Usage: node tools/store-art/compose.js <spec.json>   spec: {out, w, h, html}  (html = body markup; paths relative to tools/store-art)
   Called by build.js; it is small on purpose. */
'use strict';
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const DIR=__dirname;
async function render(specs,{scale=2}={}){
  const b=await chromium.launch();
  for(const s of specs){
    const ctx=await b.newContext({viewport:{width:s.w,height:s.h},deviceScaleFactor:s.scale||scale});const p=await ctx.newPage();
    const html=`<!doctype html><meta charset=utf-8><link rel=stylesheet href="logo.css"><style>html,body{width:${s.w}px;height:${s.h}px;overflow:hidden;position:relative}${s.css||''}</style><body>${s.html}</body>`;
    const tmp=path.join(DIR,'.tmp-'+path.basename(s.out)+'.html');fs.writeFileSync(tmp,html);
    await p.goto('file://'+tmp);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);
    await p.evaluate(()=>Promise.all([...document.images].map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r}))));
    const raw=s.out.replace(/\.[a-z]+$/,'')+'.@2x.png';
    await p.screenshot({path:raw,omitBackground:!!s.transparent,type:'png'});fs.unlinkSync(tmp);await ctx.close();
    s.raw=raw}
  await b.close();return specs}
module.exports={render};
