/* Presentation tour at 1280x720 on Medium. node dev/audit/world/tour.e2e.js [filter]
   For each stop: put the dad there (third person), wait for streaming to go idle, draw, screenshot to docs/audit/world/tour-<name>.jpg,
   and measure what a screenshot can hide:
     - characters (People models in the scene, visible) whose feet are > 0.2 m off the ground under them (floating / sunken)
     - parked / traffic cars whose body sits > 0.25 m off the ground
     - materials with a texture slot whose image never arrived (placeholder still bound), and any pure-magenta material
     - on-screen markers and name tags (what's drawn in the HUD layer)
     - characters still drawn as box figures */
const {open,log,ok,out}=require('./lib.js');
const F=process.argv[2]?process.argv[2].split(','):null;
(async()=>{const W=await open();const {p,ev,step}=W;
  await ev(async()=>{const H=window.__ht;H.render.apply('med');H.step(3)});await step(10);
  const places=await ev(()=>{const H=window.__ht;const o={};for(const k in H.WORLD.places){const q=H.WORLD.places[k];o[k]={x:q.x,z:q.z,label:q.label}}let b=null;try{const d=HT.Base.def();b={gate:d.gate,range:d.range&&{x:d.range.stand,z:d.range.lanes[1]},tank:d.tank,jet:d.jet}}catch(e){}return{places:o,base:b,start:H.L.start,van:H.L.vanStart}});
  log('places',Object.keys(places.places).join(','),'base',JSON.stringify(places.base).slice(0,300));
  const P=places.places,B=places.base||{};
  const stops=[
    ['home-street',places.van.x+6,places.van.z+4,-Math.PI/2+.35,-.08],
    ['home-front',P.home?P.home.x+2:places.start.x,P.home?P.home.z+8:places.start.z+8,0,-.05],
    ['hank',P.hank&&P.hank.x,P.hank&&P.hank.z+10,0,-.05],
    ['auto',P.auto&&P.auto.x,P.auto&&P.auto.z+12,0,-.05],
    ['gas',P.gas&&P.gas.x-12,P.gas&&P.gas.z,Math.PI/2*-1,-.05],
    ['center',P.center&&P.center.x,P.center&&P.center.z+12,0,-.05],
    ['bridge-closed',272,43,-Math.PI/2,-.05],
    ['riverbank',270,70,-Math.PI/2,-.1],
    ['mart',P.mart&&P.mart.x,P.mart&&P.mart.z+12,0,-.05],
    ['base-gate',B.gate&&B.gate.x,B.gate&&B.gate.z-14,Math.PI,-.05],
    ['range',B.range&&B.range.x+4,B.range&&B.range.z,Math.PI/2,-.03],
    ['tank',B.tank&&B.tank.x+8,B.tank&&B.tank.z+8,Math.PI/4,-.1],
    ['jet',B.jet&&B.jet.x+12,B.jet&&B.jet.z+12,Math.PI/4,-.1],
    ['riverside',356,46,-Math.PI/2+.25,-.08,'open'],
    ['bridge-open',272,43,-Math.PI/2,-.05,'open'],
    ['map-edge-east',460,60,-Math.PI/2,-.05,'open'],
    ['map-edge-west',4,60,Math.PI/2,-.05],
    ['night-street',places.van.x+6,places.van.z+4,-Math.PI/2+.35,-.08,'night']];
  for(const [name,x,z,yaw,pitch,flag] of stops){if(F&&!F.some(f=>name.includes(f)))continue;if(x==null||z==null||isNaN(x)){log('skip',name);continue}
    const r=await ev(async([x,z,yaw,pitch,flag])=>{const H=window.__ht,Pp=H.P;if(H.CV)H.exitVehicle();if(flag==='open'){H.prog.done[1]=true;H.openBridge();H.dress&&H.dress(50)}
      if(flag==='night'){H.setNight&&H.setNight(1)}else{H.setNight&&H.setNight(0)}
      Pp.pos.set(x,0,z);H.collide(Pp.pos,.35);Pp.yaw=yaw;Pp.pitch=pitch;Pp.fp=false;
      for(let i=0;i<20;i++){H.step(3);H.ow.update(H.camera)}
      for(let i=0;i<40&&H.assets.stream&&!H.assets.stream.idle();i++){await new Promise(r=>setTimeout(r,400));H.ow.update(H.camera)}
      for(let i=0;i<6;i++){H.step(2);H.ow.update(H.camera);H.draw()}
      /* measurements */
      const sc=H.scene,shown=o=>{for(let a=o;a;a=a.parent)if(!a.visible)return false;return true};const cam=H.camera.position;
      const fl=[];for(const d of HT.People.live){if(!d.root.parent||!shown(d.root))continue;const v=new THREE.Vector3();d.root.getWorldPosition(v);if(v.distanceTo(cam)>60)continue;
        const g=H.ground(v.x,v.z);const sup=H.support(v.x,v.z,v.y+.3).y;const off=v.y-Math.max(g,sup);if(Math.abs(off)>.2)fl.push({k:(d.rb||d._rb||{}).key,x:+v.x.toFixed(1),z:+v.z.toFixed(1),y:+v.y.toFixed(2),ground:+g.toFixed(2),sup:+sup.toFixed(2)})}
      const cars=[];for(const c of H.L.cars||[]){if(!c.obj||!shown(c.obj))continue;if(c.obj.position.distanceTo(cam)>60)continue;const g=H.ground(c.pos.x,c.pos.z);const off=c.obj.position.y-g;if(Math.abs(off)>.25&&!c.fly&&c.type!=='jet')cars.push({type:c.type,name:c.name,y:+c.obj.position.y.toFixed(2),g:+g.toFixed(2)})}
      let pend=0,mag=0;const seen=new Set();sc.traverse(o=>{if(!o.isMesh||!shown(o))return;for(const m of(Array.isArray(o.material)?o.material:[o.material])){if(!m||seen.has(m))continue;seen.add(m);
        if(m.color&&m.color.r>.95&&m.color.g<.05&&m.color.b>.95){mag++;(window.__MAG=window.__MAG||[]).push((o.name||o.parent&&o.parent.name||'?')+'/'+(m.name||m.type)+'/vis:'+m.visible+'/op:'+m.opacity)}for(const k of['map','normalMap','roughnessMap']){const t=m[k];if(t&&t.htSrc&&t.image&&t.image.width<=2)pend++}}});
      let box=0;sc.traverse(o=>{if(o.userData&&o.userData.boxDude&&shown(o))box++});
      const tags=[...document.querySelectorAll('.ht-tag,.tag,.nametag,[class*=tag]')].filter(e=>e.offsetParent&&e.textContent.trim()).map(e=>e.textContent.trim()).slice(0,12);
      const marks=[...document.querySelectorAll('[class*=marker],[class*=Marker]')].filter(e=>e.offsetParent).length;
      return{magN:(window.__MAG||[]).slice(-3),at:[+Pp.pos.x.toFixed(1),+Pp.pos.z.toFixed(1)],region:H.region,calls:H.drawCalls(),float:fl,cars,pend,mag,box,tags,marks,idle:H.assets.stream?H.assets.stream.idle():null}},[x,z,yaw,pitch,flag]);
    await W.live(2500);const hud=await ev(()=>{const t=document.querySelector('.ht-region h2,.ht-obj h2,.ht-loc');const mm=[...document.querySelectorAll('*')].find(e=>e.children.length===0&&e.offsetParent&&/^(MAPLE HEIGHTS|ROUTE 9|RIVERSIDE FLATS|RIVERSIDE|FORT SENSIBLE)$/i.test(e.textContent.trim())&&e.getBoundingClientRect().top>380);return{mmLabel:mm&&mm.textContent,region:window.__ht.region}});r.hud=hud;
    const f=await W.shot('tour-'+name);log(name,JSON.stringify(r),f)}
  require('fs').writeFileSync(__dirname+'/tour.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
