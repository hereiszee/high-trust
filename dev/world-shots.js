/* In-game world screenshots + draw-call stats.
   Run: node dev/world-shots.js [outDir] [filter] [--q=med]   (serves the repo itself; software GL, so each shot takes a few seconds)
   Default outDir: docs/screenshots/world/ingame. Prints renderer.info per level (scene pass only, no post). */
'use strict';
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const args=process.argv.slice(2);const q=(args.find(a=>a.startsWith('--q='))||'--q=med').slice(4);const pos=args.filter(a=>!a.startsWith('--'));
const OUT=path.resolve(pos[0]||path.join(ROOT,'docs/screenshots/world/ingame'));const filter=pos[1]||'';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.svg':'image/svg+xml'};
const BLOCK=(process.env.BLOCK||'').split(',').filter(Boolean);/* e.g. BLOCK=js/world.js,assets/props to test failures */
const srv=http.createServer((rq,r)=>{const u=decodeURIComponent(rq.url.split('?')[0]);const p=path.join(ROOT,u);
  if(BLOCK.some(b=>u.includes(b))||!p.startsWith(ROOT)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end()}
  r.writeHead(200,{'content-type':MIME[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r)});
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* camera helpers run in the page: place the player, set yaw/pitch, optionally first person */
const SHOTS=[
  ['hub-1-spawn',{hub:true}],
  ['hub-2-street',{hub:true,pos:[60,0,44],yaw:-Math.PI/2,pitch:-.1}],
  ['hub-3-lawns',{hub:true,pos:[40,0,36],yaw:.6,pitch:-.35}],
  ['hub-4-corner',{hub:true,pos:[56,0,56],yaw:-2.4,pitch:-.12}],
  ['hub-5-shop',{hub:true,shop:true}],
  ['hub-6-edge',{hub:true,pos:[112,0,14],yaw:-1.5,pitch:-.05}],
  ['drive-1',{hub:true,drive:2.5}],
  ['drive-2',{hub:true,drive:5,steer:'d',drive2:1.2}],
  ['m1-start',{m:0}],['m1-mid',{m:0,pos:[30,0,20],yaw:Math.PI,pitch:-.1}],['m1-room',{m:0,pos:[48,0,16],yaw:-2.2,pitch:-.05}],['m1-fp',{m:0,pos:[20,0,34],yaw:-1.4,fp:true}],
  ['m2-start',{m:1}],['m2-mid',{m:1,pos:[30,0,20],yaw:Math.PI,pitch:-.05}],['m2-room',{m:1,pos:[22,0,28],yaw:-.6,pitch:-.05}],['m2-fp',{m:1,pos:[34,0,26],yaw:1.7,fp:true}],
  ['m3-start',{m:2}],['m3-mid',{m:2,pos:[40,0,20],yaw:.5,pitch:-.15}],['m3-side',{m:2,pos:[12,0,8],yaw:-2.3,pitch:-.12}],['m3-fp',{m:2,pos:[30,0,10],yaw:Math.PI,fp:true}],
  ['m4-start',{m:3}],['m4-yard',{m:3,pos:[28,0,14],yaw:Math.PI,pitch:-.1}],['m4-room',{m:3,pos:[30,0,42],yaw:-.3,pitch:-.05}],['m4-fp',{m:3,pos:[18,0,34],yaw:-1.6,fp:true}],
];
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;fs.mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push(m.type()+': '+m.text())});
  await page.addInitScript(qq=>{try{localStorage.setItem('ht-cfg',JSON.stringify({sens:7,ads:55,fov:74,inv:false,gfx:qq}))}catch(e){}},q);
  await page.goto(`http://localhost:${port}/index.html`);
  await page.waitForFunction(()=>!document.getElementById('bStart').disabled,null,{timeout:90000});
  await page.click('#bStart');await wait(3000);
  const stats={};let cur=null;
  for(const[name,o]of SHOTS){if(filter&&!name.includes(filter))continue;
    const lvl=o.hub?'hub':'m'+(o.m+1);
    await page.evaluate(({o,same})=>{const h=window.__ht;
      if(!same){if(o.hub)h.enterHub();else h.startMission(o.m)}
      for(const k in h.keys)h.keys[k]=false;h.VAN.on&&(h.VAN.on=false);
      h.P.fp=!!o.fp;if(o.pos)h.P.pos.set(o.pos[0],0,o.pos[2]);if(o.yaw!=null)h.P.yaw=o.yaw;if(o.pitch!=null)h.P.pitch=o.pitch;
      if(o.shop&&h.L.shopDoor){const d=h.L.shopDoor;h.P.pos.set(d.x+d.nx*9+3,0,d.z+d.nz*9);h.P.yaw=Math.atan2(d.nx,d.nz)+.3;h.P.pitch=-.08}
      if(o.drive){const v=h.L.vanStart;h.P.pos.set(h.VAN.pos.x+1.5,0,h.VAN.pos.z);h.use=true;h.step(1);h.keys.w=true;h.step(Math.round(o.drive*30));
        if(o.steer){h.keys[o.steer]=true;h.step(Math.round(o.drive2*30));h.keys[o.steer]=false}h.step(10)}
      h.step(2);},{o,same:cur===lvl&&!o.drive});
    if(!o.drive)cur=lvl;else cur=null;
    await wait(4500);
    const info=await page.evaluate(()=>{const h=window.__ht,r=h.renderer;r.info.autoReset=false;r.info.reset();r.setRenderTarget(null);r.render(h.scene,h.camera);const i={calls:r.info.render.calls,tris:r.info.render.triangles,geos:r.info.memory.geometries,tex:r.info.memory.textures};
      /* world only: the same frame with every character hidden */
      const ch=[h.P,...h.enemies,...h.allies].map(e=>e.dude&&e.dude.root).filter(Boolean);const was=ch.map(c=>c.visible);ch.forEach(c=>c.visible=false);const v=h.VAN&&h.VAN.obj;const vw=v&&v.visible;if(v)v.visible=false;
      r.info.reset();r.render(h.scene,h.camera);i.world=r.info.render.calls;ch.forEach((c,k)=>c.visible=was[k]);if(v)v.visible=vw;r.info.autoReset=true;return i});
    if(!stats[lvl]||info.world>stats[lvl].world)stats[lvl]=info;
    await page.evaluate(()=>{const b=document.getElementById('banner');if(b)b.classList.remove('on')});await wait(300);
    await page.screenshot({path:path.join(OUT,name+'.jpg'),type:'jpeg',quality:86});
    console.log(name,JSON.stringify(info))}
  /* a few headless steps per mission to prove they run */
  const ok=await page.evaluate(()=>{const h=window.__ht,res=[];for(let i=0;i<4;i++){h.startMission(i);h.step(60);res.push(!!h.M&&h.M.state)}h.enterHub();h.step(30);return res});
  console.log('missions step:',ok.join(','));
  console.log('STATS',JSON.stringify(stats));
  console.log(errors.length?'CONSOLE:\n'+errors.join('\n'):'no console errors/warnings');
  await browser.close();srv.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
