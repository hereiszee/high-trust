/* Open world (SPEC2 W1/W2) checks in the real game, headless Chromium + SwiftShader, driven through window.__ht.step().
   node dev/openworld-ingame.js [--write]   (--write saves docs/screenshots/open-world/evidence.txt)
   Checks: world is the hub, collider hash == brute force, barricade blocks / open bridge reaches Riverside and laps a block,
   every mission ring launches its mission and the return restores the van at the ring, GPS + minimap route + fast travel,
   region banner + Riverside unlock, 3000-step walk/drive fuzz never ends inside a collider, draw-call budgets on Medium and Low. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const out=[],log=(...a)=>{const s=a.join(' ');out.push(s);console.log(s)};let fails=0;const ok=(c,msg)=>{if(!c)fails++;log((c?'ok   ':'FAIL ')+msg)};
async function boot(){const r=await open();await r.p.evaluate(()=>{const H=window.__ht;H.enterHub();H.HUD.hide('title');H.step(3);
  window.__sun=null;H.scene.traverse(o=>{if(o.isDirectionalLight)window.__sun=o});
  window.__cam=(x,y,z,tx,ty,tz)=>{const c=H.camera;c.position.set(x,y,z);c.lookAt(tx,ty,tz);c.updateMatrixWorld();H.ow.update(c);H.ow.update(c);if(HT.World.update)HT.World.update(H.L,c.position)};
  window.__measure=()=>{const R=H.renderer,c=H.camera,s=H.scene,sun=window.__sun;R.info.autoReset=false;R.info.reset();R.shadowMap.needsUpdate=true;R.setRenderTarget(null);R.render(s,c);
    const all={calls:R.info.render.calls,tris:R.info.render.triangles};sun.castShadow=false;R.info.reset();R.render(s,c);const main={calls:R.info.render.calls,tris:R.info.render.triangles};sun.castShadow=true;R.info.autoReset=true;
    return{main:main.calls,shadow:all.calls-main.calls,tris:main.tris}}});return r}
const drive=(p,wps,steps,boost)=>p.evaluate(([wps,steps,boost])=>{const H=window.__ht,V=H.VAN,k=H.keys;let wi=0,maxZ=0;
  for(let s=0;s<steps;s++){const w=wps[wi];const dx=w[0]-V.pos.x,dz=w[1]-V.pos.z;if(Math.hypot(dx,dz)<5&&wi<wps.length-1)wi++;
    const want=Math.atan2(-dx,-dz);let d=want-V.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;const near=Math.hypot(dx,dz)<18&&wi<wps.length-1;
    k.w=true;k.shift=boost;k.a=d>.06;k.d=d<-.06;if((Math.abs(d)>.5||near)&&Math.abs(V.spd)>7){k.w=false;k.s=true}else k.s=false;H.step(1);maxZ=Math.max(maxZ,V.pos.z)}
  k.w=k.a=k.d=k.s=k.shift=false;H.step(20);return{x:V.pos.x,z:V.pos.z,wp:wi,maxZ,region:H.region}},[wps,steps,boost]);
(async()=>{const {b,p,errs}=await boot();
  const s=await p.evaluate(()=>{const H=window.__ht,L=H.L;let bad=0;for(let i=0;i<1000;i++){const q={x:Math.random()*464,z:Math.random()*160},r=Math.random()*2+.2;
      const a=new Set(L.cgrid(q,r).filter(c=>q.x+r>c.x0&&q.x-r<c.x1&&q.z+r>c.z0&&q.z-r<c.z1)),bb=L.cbrute(q,r);if(bb.length!==a.size||bb.some(c=>!a.has(c)))bad++}
    const t0=performance.now();H.enterHub();const again=performance.now()-t0;return{id:L.def.id,H:L.g[10][19],bad,cols:L.colliders.length,again,st:H.ow.stats()}});
  ok(s.id==='world'&&s.H==='H','hub is the world (L.def.id='+s.id+', L.g[10][19]='+s.H+')');
  ok(s.bad===0,'collider hash equals brute force on 1000 random queries ('+s.cols+' colliders)');
  log('     first build '+s.st.buildMs+' ms (title screen, start area only; the rest streams in), re-entering the cached world '+Math.round(s.again)+' ms');
  await p.evaluate(()=>{const H=window.__ht,V=H.VAN;V.pos.set(40,0,41.5);V.yaw=-Math.PI/2;H.syncVan();H.enterVan()});
  let d=await drive(p,[[200,41.5],[270,42],[330,43]],460,true);ok(d.x<141*2,'closed barricade stops the van (x='+d.x.toFixed(1)+' m, barricade at 282)');
  await p.evaluate(()=>window.__ht.openBridge());
  d=await drive(p,[[330,43],[379,43],[379,71],[315,71],[315,43],[420,43]],1100,false);ok(d.wp===5&&d.maxZ>65&&d.region==='river','bridge open: across into Riverside and around the 3rd St / Ash St / River Rd block ('+JSON.stringify(d)+')');
  for(let i=0;i<4;i++){const r=await p.evaluate(i=>{const H=window.__ht;if(H.mode!=='hub')H.enterHub();const d=H.L.dests[i],V=H.VAN;H.JOB=i;if(!V.on)H.enterVan();V.pos.set(d.x,0,d.z);V.yaw=-Math.PI/2;V.spd=0;if(V.car){V.car.spd=0;V.car.x=d.x;V.car.z=d.z}H.syncVan();H.step(3);
      const m={mode:H.mode,lvl:H.L.def.id,enemies:H.enemies.length};H.enterHub();H.step(2);return{...m,back:H.L.def.id,dv:Math.hypot(H.VAN.pos.x-d.x,H.VAN.pos.z-d.z)}},i);
    ok(r.mode==='mission'&&r.back==='world'&&r.dv<.5,'ring '+i+' launches '+r.lvl+' ('+r.enemies+' enemies), back in the world with the van at the ring')}
  const g=await p.evaluate(()=>{const H=window.__ht;H.JOB=2;H.step(40);const n=H.gps&&H.gps.points.length;const t0=performance.now();for(let i=0;i<10;i++)H.ow.gps({x:39,z:15},H.L.dests[3]);
    const ms=(performance.now()-t0)/10;const ft=H.fastTravel('auto');return{n,ms,ft}});await p.waitForTimeout(700);
  const ftp=await p.evaluate(()=>{const H=window.__ht,a=H.WORLD.places.auto;return Math.hypot(H.VAN.pos.x-a.x,H.VAN.pos.z-a.z)});
  ok(g.n>1,'GPS route to the job site ('+g.n+' points, '+g.ms.toFixed(1)+' ms per solve)');ok(g.ft&&ftp<1,"fast travel to Dad's Auto puts the van on the pin ("+ftp.toFixed(2)+' m)');
  const rg=await p.evaluate(()=>{const H=window.__ht;if(H.VAN.on){H.VAN.spd=0;H.exitVan()}H.P.pos.set(330,0,43);H.step(3);const w=H.prog.world;return{region:H.region,river:w.visited.river,pins:w.pins.slice()}});
  ok(rg.region==='river'&&rg.river&&rg.pins.includes('center')&&rg.pins.includes('mart'),'crossing into Riverside: region banner, visited.river, Community Center + Corner Mart pins unlocked');
  const f=await p.evaluate(()=>{const H=window.__ht,L=H.L,k=H.keys,V=H.VAN,P=H.P;H.JOB=null;let inside=0,ends=0,oob=0;const keys=['w','a','s','d','shift'];
    const ins=(x,z)=>{for(const c of L.cgrid({x,z},0))if(c.ph!==undefined&&x>c.x0+.05&&x<c.x1-.05&&z>c.z0+.05&&z<c.z1-.05)return c;return null};
    for(let seg=0;seg<60;seg++){if(seg%4===1&&!V.on&&Math.hypot(V.pos.x-P.pos.x,V.pos.z-P.pos.z)<4)H.enterVan();if(seg%4===3&&V.on){V.spd=0;H.exitVan()}
      for(const kk of keys)k[kk]=Math.random()<.5;k.w=Math.random()<.8;
      for(let s=0;s<50;s++){H.step(1);const q=V.on?V.pos:P.pos;if(q.x<0||q.z<0||q.x>464||q.z>160)oob++;if(ins(q.x,q.z))inside++}
      {const q=V.on?V.pos:P.pos;if(ins(q.x,q.z))ends++}
      if(seg%10===5){let x,z;do{x=Math.floor(Math.random()*232);z=Math.floor(Math.random()*80)}while(!H.walkable(x,z));if(V.on){V.spd=0;H.exitVan()}P.pos.set(x*2+1,0,z*2+1);H.collide(P.pos,.35);
        let vx,vz;do{vx=Math.floor(Math.random()*232);vz=Math.floor(Math.random()*80)}while(L.ow.K[vz*232+vx]!=='road'||L.g[vz][vx]!==',');V.pos.set(vx*2+1,0,vz*2+1);V.yaw=Math.random()<.5?0:-Math.PI/2;H.syncVan();P.pos.set(V.pos.x,0,V.pos.z);H.enterVan()}}
    for(const kk of keys)k[kk]=false;return{inside,ends,oob}});
  ok(f.ends===0&&f.oob===0,'fuzz: 3000 steps of random walking/driving, never ends a segment inside a collider or out of bounds (transient overlaps: '+f.inside+')');
  for(const q of['med','low']){const r=await p.evaluate(q=>{const H=window.__ht;H.render.apply(q);H.ow.quality(q);H.ow.buildAll();H.dress(5);
      const probes={home:[39,15],mapleSE:[177,97],dadsAuto:[221,55],midBridge:[294,43],riversideMain3rd:[379,43],scrapyardGate:[400,127]};const out={};
      for(const n in probes){const[x,z]=probes[n];if(H.VAN.on){H.VAN.spd=0;H.exitVan()}H.P.pos.set(x,0,z);H.step(2);let w={main:0,shadow:0,tris:0};
        for(let h=0;h<4;h++){const a=h*Math.PI/2,fx=Math.sin(a),fz=Math.cos(a);window.__cam(x-fx*6,3.2,z-fz*6,x+fx*20,1.5,z+fz*20);const m=window.__measure();w={main:Math.max(w.main,m.main),shadow:Math.max(w.shadow,m.shadow),tris:Math.max(w.tris,m.tris)}}out[n]=w}
      return out},q);
    for(const n in r)ok(r[n].main<=450&&r[n].shadow<=120,q+' '+n+': '+r[n].main+' draw calls, '+r[n].shadow+' shadow calls, '+Math.round(r[n].tris/1000)+'k triangles (worst of 4 headings)')}
  ok(errs.length===0,'no console errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  log(fails?fails+' FAILED':'all passed');
  if(process.argv.includes('--write'))fs.writeFileSync(path.join(__dirname,'../docs/screenshots/open-world/evidence.txt'),out.join('\n')+'\n');
  await b.close();process.exit(fails?1:0)})();
