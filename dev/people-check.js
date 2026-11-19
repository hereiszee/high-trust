/* Skinned people in the real game, headless: node dev/people-check.js [--shots] [--only=combat,missions,shots]
   Serves the repo through request interception (no server needed), stubs requestAnimationFrame and drives the game with __ht.step.
   Checks: people loaded, body shot damages, head shot registers double damage, crouched enemy behind a 1.15 m crate cannot be hit,
   all 4 missions complete by script, zero console errors. --shots writes docs/screenshots/people/*.jpg */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'docs','screenshots','people');
const argv=process.argv.slice(2);const SHOTS=argv.includes('--shots');const only=(argv.find(a=>a.startsWith('--only='))||'').slice(7).split(',').filter(Boolean);
const want=k=>!only.length||only.includes(k);
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.json':'application/json','.woff2':'font/woff2'};
const results=[];const ok=(name,pass,info)=>{results.push([name,!!pass,info]);console.log((pass?'  ok   ':'  FAIL ')+name+(info!==undefined?'  · '+(typeof info==='string'?info:JSON.stringify(info)):''))};

/* page-side helpers, installed once the game is up */
function helpers(){
  const H=window.__ht,PP=HT.People,T=THREE;
  const v=()=>new T.Vector3();
  window.T_={
    /* world position of a named hitbox (centre of its box) */
    hb(e,part){const m=e.dude.meshes.find(x=>x.name==='hit_Bip01_'+part)||(part==='Head'?e.dude.head:e.dude.meshes[0]);m.updateWorldMatrix(true,false);
      if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();return m.geometry.boundingBox.getCenter(v()).applyMatrix4(m.matrixWorld)},
    hbBox(e,part){const m=e.dude.meshes.find(x=>x.name==='hit_Bip01_'+part);m.updateWorldMatrix(true,false);return new T.Box3().setFromObject(m)},
    /* first person, eye at P.pos+1.65: point the view straight at p */
    aim(p){const P=H.P;const eye=P.pos.clone().add(new T.Vector3(0,P.crouch?1.15:1.65,0));const d=p.clone().sub(eye);P.yaw=Math.atan2(-d.x,-d.z);P.pitch=Math.asin(d.y/d.length())},
    god(){const P=H.P;P.hp=100;for(const w of P.weapons){const a=P.ammo[w];if(a){a.res=999;if(a.mag<=1&&!P.rl&&!(P.reloadT>0)){a.mag=8}}}},
    /* a spot r metres from (x,z) with a clear chest-high line of sight to it */
    spot(x,z,r,a0=0){const rc=new T.Raycaster();for(const rr of[r,r*.7,r*.5,r*1.4])for(let k=0;k<24;k++){const a=a0+k/24*Math.PI*2;const px=x+Math.sin(a)*rr,pz=z+Math.cos(a)*rr;
        const eye=new T.Vector3(px,1.65,pz),tg=new T.Vector3(x,1.2,z),d=tg.clone().sub(eye);const L=d.length();rc.set(eye,d.normalize());rc.far=L+.5;
        const h=rc.intersectObjects(H.dude.solids,false)[0];if(h&&h.distance<L+.3)continue;
        const lo=new T.Vector3(px,.5,pz),d2=new T.Vector3(x,.5,z).sub(lo);rc.set(lo,d2.normalize());rc.far=rr;const h2=rc.intersectObjects(H.dude.solids,false)[0];if(h2)continue;return{x:px,z:pz,a}}return null},
    live(){return H.enemies.filter(e=>e.state==='idle')},
    /* stand off from enemy e and shoot until he is down or gives up */
    engage(e,maxSteps=400){const P=H.P;P.fp=true;P.aim=true;let n=0;
      while(e.state==='idle'&&n<maxSteps){const dx=P.pos.x-e.pos.x,dz=P.pos.z-e.pos.z,dd=Math.hypot(dx,dz);
        if(dd>6||dd<2||n%40===0){const s=T_.spot(e.pos.x,e.pos.z,3.5,Math.atan2(dx,dz));if(s)P.pos.set(s.x,0,s.z)}
        T_.god();H.scene.updateMatrixWorld();T_.aim(T_.hb(e,'Spine2'));H.mouse=true;H.step(1);n++}
      H.mouse=false;P.fp=false;P.aim=false;H.step(1);return n},
    cuff(e){const P=H.P;for(let k=0;k<30&&e.state==='surrender';k++){P.pos.set(e.pos.x+.9,0,e.pos.z);T_.god();H.use=true;H.step(1)}return e.state},
    clearAll(max=40){for(let k=0;k<max;k++){const l=T_.live();if(!l.length)break;const P=H.P;l.sort((a,b)=>a.pos.distanceTo(P.pos)-b.pos.distanceTo(P.pos));T_.engage(l[0])}
      for(const e of H.enemies)if(e.state==='surrender')T_.cuff(e)},
    hold(x,z,n=60){const P=H.P;for(let k=0;k<n;k++){P.pos.set(x,0,z);T_.god();H.keys.e=true;H.step(1)}H.keys.e=false},
    cam(px,py,pz,tx,ty,tz){const c=H.camera;c.position.set(px,py,pz);c.lookAt(tx,ty,tz);c.updateMatrixWorld();H.scene.updateMatrixWorld();H.render.draw()},
    /* camera at distance d in front of the dad (d<0 behind), side offset s, looking at his position at height ty */
    rel(d,h,ty,s=0,look=0){const P=H.P,f=[-Math.sin(P.yaw),-Math.cos(P.yaw)],r=[Math.cos(P.yaw),-Math.sin(P.yaw)];T_.cam(P.pos.x+f[0]*d+r[0]*s,h,P.pos.z+f[1]*d+r[1]*s,P.pos.x+f[0]*look,ty,P.pos.z+f[1]*look)},
    /* row of characters in front of the dad; spec {role,variant,gun,aim,mode,vel:[side,fwd] m/s,turn,dead,pitch} */
    lineup(specs,{dist=4,spacing=1,steps=24,dt=1/30}={}){const D=H.dude,P=H.P;for(const d of(T_.row||[]))H.scene.remove(d.root);T_.row=[];
      const f=[-Math.sin(P.yaw),-Math.cos(P.yaw)],r=[Math.cos(P.yaw),-Math.sin(P.yaw)];
      specs.forEach((s,i)=>{const d=D.make(s.role==='boss'?{crown:1}:s.role==='thug'?{variant:s.variant}:(D.HOMIES[s.role]||{role:s.role}));if(s.gun)D.equip(d,s.gun);
        const o=(i-(specs.length-1)/2)*spacing;d.root.position.set(P.pos.x+f[0]*dist+r[0]*o,0,P.pos.z+f[1]*dist+r[1]*o);d.root.rotation.y=P.yaw+(s.turn||0);H.scene.add(d.root);d.spec=s;T_.row.push(d)});
      for(let k=0;k<steps;k++){for(const d of T_.row){const s=d.spec,ry=d.root.rotation.y;
          if(s.vel){const fw=s.vel[1],sd=s.vel[0];d.root.position.x+=(Math.sin(ry)*fw+Math.cos(ry)*sd)*dt;d.root.position.z+=(Math.cos(ry)*fw-Math.sin(ry)*sd)*dt}
          if(s.dead&&k===0)PP.die(d);if(s.fire&&k===steps-3)PP.fire(d);D.pose(d,dt,{moving:!!s.vel,aim:!!s.aim,mode:s.mode||'stand',pitch:s.pitch||0})}PP.update(dt,H.camera)}
      return T_.row},
    exit(){const L=H.L;for(let k=0;k<20&&H.M.state==='go';k++){H.P.pos.set(L.exit.x,0,L.exit.z);T_.god();H.step(1)}return H.M.state}
  };
}

(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:720}});
  await ctx.route('http://repo.local/**',r=>{const u=new URL(r.request().url());const f=path.join(ROOT,decodeURIComponent(u.pathname));
    if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'nf'});r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':MIME[path.extname(f)]||'application/octet-stream'}})});
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
  await p.addInitScript(()=>{window.requestAnimationFrame=()=>0});/* the test drives frames itself */
  await p.goto('http://repo.local/index.html');
  await p.waitForFunction(()=>window.__ht&&__ht.assets.done,null,{timeout:180000,polling:500});
  await p.evaluate(()=>document.getElementById('bStart').click());
  await p.evaluate(helpers);
  const st=await p.evaluate(()=>({ok:HT.People.ok,failed:__ht.assets.failed,player:!!__ht.P.dude.rb}));
  ok('people loaded and the player is skinned',st.ok&&st.player,st);
  if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  const shot=async(n,fn,arg)=>{if(!SHOTS)return;await p.evaluate(()=>{const b=document.getElementById('banner');if(b)b.classList.remove('on')});await p.evaluate(fn||(()=>__ht.draw()),arg);await p.screenshot({path:path.join(OUT,n+'.jpg'),type:'jpeg',quality:86});console.log('       wrote',n+'.jpg')};

  if(want('combat')){
    await p.evaluate(()=>__ht.startMission(0));
    const r=await p.evaluate(()=>{const H=__ht,P=H.P,e=T_.live()[0];const out={};
      for(const o of H.enemies)if(o!==e){o.pos.set(o.pos.x+500,0,o.pos.z+500)}/* nobody else in the way */
      P.fp=true;P.aim=true;P.cur='pistol';
      /* stand the dad 6 m from the enemy with a clear line, enemy facing him */
      const E0=e.pos.clone();const sp=T_.spot(E0.x,E0.z,6);P.pos.set(sp.x,0,sp.z);P.yaw=Math.atan2(-(E0.x-sp.x),-(E0.z-sp.z));
      const f=new THREE.Vector3(-Math.sin(P.yaw),0,-Math.cos(P.yaw));const pin=()=>{e.pos.copy(E0);e.yaw=P.yaw;e.thinkT=1e9;e.target=null;e.alert=false};pin();
      H.step(3);pin();T_.god();
      const shoot=(part)=>{pin();H.scene.updateMatrixWorld();const hp=e.hp;P.fireT=0;P.recoilKick=0;T_.aim(T_.hb(e,part));H.mouse=true;H.step(1);H.mouse=false;pin();return +(hp-e.hp).toFixed(2)};
      out.body=shoot('Spine2');e.hp=e.maxhp;e.triedSurr=true;out.legs=shoot('L_Thigh');e.hp=e.maxhp;out.head=shoot('Head');e.hp=e.maxhp;
      /* skinned meshes are not ray targets: only the invisible boxes carry userData.ent */
      out.targets=e.dude.meshes.length;out.skinnedTargets=0;e.dude.root.traverse(o=>{if(o.isSkinnedMesh&&o.userData.ent)out.skinnedTargets++});
      out.hidden=e.dude.meshes.every(m=>m.material.visible===false);
      /* crouch behind a 1.15 m crate */
      const crate=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.15,.6),new THREE.MeshStandardMaterial({color:0x8a6a40}));
      crate.position.copy(e.pos).addScaledVector(f,-.65);crate.position.y=.575;crate.rotation.y=P.yaw;H.L.group.add(crate);H.L.solids.push(crate);H.dude.rebuildTargets();
      HT.People.force(e.dude,{mode:'crouch',moving:false,aim:true});
      for(let i=0;i<30;i++){H.step(1);pin()}
      H.scene.updateMatrixWorld();const hb=T_.hbBox(e,'Head');out.crouchHeadTop=+hb.max.y.toFixed(3);
      let hits=0;for(let i=0;i<8;i++){const d=shoot(i%2?'Head':'Spine2');if(d>0)hits++;e.hp=e.maxhp}out.crateHits=hits;
      /* stand up: now the head clears the crate and a head shot lands */
      HT.People.force(e.dude,{mode:'stand',moving:false,aim:true});for(let i=0;i<12;i++){H.step(1);pin()}
      out.standHead=shoot('Head');
      HT.People.force(e.dude,null);H.L.group.remove(crate);H.L.solids.splice(H.L.solids.indexOf(crate),1);H.dude.rebuildTargets();
      return out});
    ok('body shot damages (pistol 30)',r.body>=29,r.body);
    ok('leg shot damages',r.legs>=29,r.legs);
    ok('head shot registers as headshot (x2)',r.head>=59,r.head);
    ok('hitboxes: invisible boxes only, skinned meshes are not targets',r.targets>=10&&r.skinnedTargets===0&&r.hidden,{boxes:r.targets});
    ok('crouched head hitbox is below a 1.15 m crate top',r.crouchHeadTop<1.15,r.crouchHeadTop);
    ok('no hits through the crate while crouched',r.crateHits===0,r.crateHits);
    ok('standing up behind the crate exposes the head',r.standHead>=59,r.standHead);
  }

  if(want('combat')){/* procedural offsets must not pile up while a static aim clip holds (mixer skips unchanged bones) */
    const r=await p.evaluate(()=>{const H=__ht,P=H.P;H.startMission(3);for(const e of H.enemies)e.pos.x+=400;P.fp=false;const out={};
      for(const g of['pistol','shotgun']){H.dude.equip(P.dude,g);P.aim=true;P.pitch=.45;H.step(40);const b=P.dude.body.getObjectByName('Bip01_R_Hand'),q0=b.getWorldQuaternion(new THREE.Quaternion());
        H.step(60);const q1=b.getWorldQuaternion(new THREE.Quaternion());out[g]=+(q0.angleTo(q1)).toFixed(4)}P.pitch=0;P.aim=false;return out});
    ok('aim pitch holds steady (no build-up over 2 s; idle breathing allowed)',Object.values(r).every(v=>v<.06),r)}

  if(want('combat')){/* spin regression: hold pitch +-0.9 for 300 steps in each state; bones stay bounded and come back to rest */
    const r=await p.evaluate(()=>{const H=__ht,P=H.P;H.startMission(3);for(const e of H.enemies)e.pos.x+=400;P.fp=false;
      const rel=n=>{const b=P.dude.body.getObjectByName(n);const q=b.getWorldQuaternion(new THREE.Quaternion());return P.dude.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q)};
      const BONES=['Bip01_Spine1','Bip01_Spine2','Bip01_R_UpperArm','Bip01_L_UpperArm','Bip01_L_Forearm','Bip01_Head','Bip01_Pelvis'];
      const snap=()=>BONES.map(rel),diff=(A,B)=>Math.max(...A.map((q,i)=>q.angleTo(B[i])));
      const rest=()=>{P.aim=false;P.crouch=false;P.pitch=0;H.mouse=false;H.step(60)};const out={};
      const states={idle:()=>{},aiming:()=>{P.aim=true},crouched:()=>{P.crouch=true;P.aim=true},firing:()=>{P.aim=true;H.mouse=true},reloading:()=>{P.aim=true;P.ammo[P.cur].mag=0;H.reload()}};
      for(const g of['rifle','shotgun','pistol']){H.give(g);H.dude.equip(P.dude,g);P.cur=g;rest();const R0=snap();
        for(const k in states)for(const pv of[.9,-.9]){const run=n=>{for(let i=0;i<n;i++){T_.god();P.pitch=pv;if(k==='firing')H.mouse=true;H.step(1)}};states[k]();run(150);const A=snap();run(150);const B=snap();
          const grow=diff(A,B);rest();const back=diff(R0,snap());out[g+'/'+k+'/'+pv]=[+grow.toFixed(3),+back.toFixed(3)]}}
      /* the aim pitch has to show: gun hand height with pitch +-0.6 while aiming */
      H.dude.equip(P.dude,'rifle');P.cur='rifle';P.aim=true;const hy=pv=>{P.pitch=pv;H.step(30);return P.dude.body.getObjectByName('Bip01_R_Hand').getWorldPosition(new THREE.Vector3()).y};
      out.handRise=+(hy(.6)-hy(-.6)).toFixed(3);
      /* barrel vs view direction (third person, rifle and pistol) */
      out.barrelErr={};const yp=out;for(const g of['rifle','pistol']){H.dude.equip(P.dude,g);P.cur=g;for(const pv of[-.6,0,.6]){P.pitch=pv;H.step(30);H.scene.updateMatrixWorld();
        const q=P.dude.gun.getWorldQuaternion(new THREE.Quaternion());const bd=new THREE.Vector3(0,0,1).applyQuaternion(q);const cf=new THREE.Vector3(-Math.sin(P.yaw)*Math.cos(pv),Math.sin(pv),-Math.cos(P.yaw)*Math.cos(pv));
        out.barrelErr[g+pv]=+(bd.angleTo(cf)).toFixed(2);if(pv===0)yp['yawpitch_'+g]=[+(Math.atan2(bd.x,bd.z)-Math.atan2(cf.x,cf.z)).toFixed(3),+(Math.asin(bd.y)-Math.asin(cf.y)).toFixed(3)]}}
      P.aim=false;P.pitch=0;
      return out});
    const bad=Object.entries(r).filter(([k,v])=>Array.isArray(v)&&(v[0]>.35||v[1]>.2));
    ok('pitch +-0.9 x 300 steps (idle/aim/crouch/fire/reload, 3 guns): bounded, returns to rest',bad.length===0,bad.length?bad.slice(0,6):{worstGrow:Math.max(...Object.values(r).filter(Array.isArray).map(v=>v[0])),worstBack:Math.max(...Object.values(r).filter(Array.isArray).map(v=>v[1]))});
    ok('aim pitch is visible in third person (hand rises with pitch)',r.handRise>.2,r.handRise);
    ok('third-person barrel follows the view (within 0.2 rad)',Object.values(r.barrelErr).every(v=>v<.2),Object.assign(r.barrelErr,{yp:[r.yawpitch_rifle,r.yawpitch_pistol]}))}

  if(want('missions'))for(let i=0;i<4;i++){
    const t0=Date.now();
    const r=await p.evaluate(i=>{const H=__ht;H.startMission(i);const L=H.L,M=()=>H.M;const out={i,enemies:H.enemies.length,skinned:H.enemies.filter(e=>e.dude.rb).length,allies:H.allies.length};
      const t=M().def.type;
      if(t==='loot'){T_.clearAll();for(const it of L.items)if(!it.got)T_.hold(it.x,it.z,40);out.got=M().got}
      if(t==='stash'){T_.clearAll();for(const s of L.stashes)if(!s.done)T_.hold(s.x,s.z,60);out.smashed=M().smashed}
      if(t==='waves'){for(let k=0;k<40&&M().state==='go';k++){T_.clearAll();for(let j=0;j<6;j++){T_.god();H.step(30)}}out.wave=M().wave}
      if(t==='boss'){T_.clearAll();out.boss=L.boss&&L.boss.state}
      if(M().state==='go'&&M().exitOpen)T_.exit();
      out.state=M().state;out.dead=H.enemies.filter(e=>e.state==='dead').length;out.cuffed=H.enemies.filter(e=>e.state==='cuffed').length;
      out.deadAnimated=H.enemies.filter(e=>e.state==='dead'&&e.dude.rb&&e.dude.rb.base==='death').length;
      return out},i);
    ok('mission '+i+' completes by script',r.state==='won',Object.assign(r,{sec:Math.round((Date.now()-t0)/1000)}));
  }

  if(SHOTS&&want('shots')){
    /* hub: the crew around the dad (three jobs done, Doug still waiting) */
    await p.evaluate(()=>{const H=__ht;H.prog.done=[true,true,true,false];H.enterHub();H.P.fp=false;H.step(90);const P=H.P;P.yaw+=Math.PI;H.step(1);P.pitch=-.08});
    await shot('hub_over_shoulder_crew',()=>{__ht.draw()});
    await shot('hub_crew_front',()=>{T_.rel(4.6,1.55,1.1,-.6)});
    await shot('crew_faces',()=>{const H=__ht;H.P.dude.root.visible=false;for(const a of H.allies)a.dude.root.visible=false;T_.lineup([{role:'you'},{role:'gary'},{role:'rick'},{role:'dave'},{role:'doug'}],{dist:2.3,spacing:.62,steps:40});T_.cam(H.P.pos.x+0,1.66,H.P.pos.z,H.P.pos.x-Math.sin(H.P.yaw)*2.3,1.62,H.P.pos.z-Math.cos(H.P.yaw)*2.3)});
    await shot('crew_armed_low_ready',()=>{const H=__ht;T_.lineup([{role:'gary',gun:'pistol'},{role:'rick',gun:'rifle'},{role:'dave',gun:'shotgun'},{role:'doug',gun:'rifle'}],{dist:3.6,spacing:.95,steps:40});const P=H.P;T_.cam(P.pos.x,1.5,P.pos.z,P.pos.x-Math.sin(P.yaw)*3.6,1.1,P.pos.z-Math.cos(P.yaw)*3.6)});
    await shot('crew_armed_walking',()=>{const H=__ht;T_.lineup([{role:'gary',gun:'pistol',vel:[0,1.4],turn:.5},{role:'rick',gun:'rifle',vel:[0,1.4],turn:.5},{role:'dave',gun:'shotgun',vel:[0,1.4],turn:.5},{role:'doug',gun:'rifle',vel:[0,1.4],turn:.5}],{dist:4.2,spacing:1.2,steps:28});const P=H.P;T_.cam(P.pos.x,1.5,P.pos.z,P.pos.x-Math.sin(P.yaw)*4.2,1.0,P.pos.z-Math.cos(P.yaw)*4.2)});
    /* gait: walk 1.0, walk_fast 1.5, jog 2.4, run 4.3 (normal move), sprint 6.6, side view mid-stride */
    await shot('gaits_mid_stride',()=>{const H=__ht,P=H.P;for(const a of H.allies)H.scene.remove(a.dude.root);P.dude.root.visible=false;T_.lineup([{role:'gary',vel:[0,1]},{role:'doug',vel:[0,1.5]},{role:'rick',vel:[0,2.4]},{role:'you',vel:[0,4.3]},{role:'thug',variant:'thug_track',vel:[0,6.6]}].map(s=>Object.assign(s,{turn:Math.PI/2})),{dist:0,spacing:1.4,steps:1});
      /* march them past a fixed side camera: each starts so it is mid-frame after 0.6 s */
      const f=[-Math.sin(P.yaw),-Math.cos(P.yaw)],r=[Math.cos(P.yaw),-Math.sin(P.yaw)];const v=[1,1.5,2.4,4.3,6.6];
      T_.row.forEach((d,i)=>{const o=(i-2)*1.5-v[i]*.6;d.root.position.set(P.pos.x+r[0]*o,0,P.pos.z+r[1]*o);d.root.rotation.y=Math.atan2(r[0],r[1])});
      for(let k=0;k<18;k++){T_.row.forEach((d,i)=>{d.root.position.x+=r[0]*v[i]/30;d.root.position.z+=r[1]*v[i]/30;H.dude.pose(d,1/30,{moving:true,aim:false})});HT.People.update(1/30,H.camera)}
      T_.cam(P.pos.x-f[0]*5.6,1.05,P.pos.z-f[1]*5.6,P.pos.x,.95,P.pos.z)});
    await shot('player_running_ots',()=>{const H=__ht;H.keys.w=true;H.step(20);H.keys.w=false;__ht.draw()});
    await shot('player_sprint_side',()=>{const H=__ht;H.keys.w=true;H.keys.shift=true;H.step(14);H.keys.w=false;H.keys.shift=false;H.scene.updateMatrixWorld();T_.rel(.4,1.2,1,3.2,.4)});
    /* mission 0: the chop shop crew */
    await p.evaluate(()=>{const H=__ht;H.startMission(0);H.P.fp=false;H.step(20)});
    await shot('m0_enemies',()=>{const H=__ht,P=H.P;const e=H.enemies.slice().sort((a,b)=>a.pos.distanceTo(P.pos)-b.pos.distanceTo(P.pos))[0];const sp=T_.spot(e.pos.x,e.pos.z,4.5);
      for(const o of H.enemies){o.thinkT=1e9;o.target=null}T_.cam(sp.x,1.6,sp.z,e.pos.x,1.1,e.pos.z)});
    await shot('m0_enemy_aiming',()=>{const H=__ht,P=H.P;const e=H.enemies.slice().sort((a,b)=>a.pos.distanceTo(P.pos)-b.pos.distanceTo(P.pos))[0];const sp=T_.spot(e.pos.x,e.pos.z,3.5);
      P.pos.set(sp.x,0,sp.z);e.alert=true;for(let i=0;i<20;i++){e.thinkT=1e9;e.target=null;e.yaw=Math.atan2(sp.x-e.pos.x,sp.z-e.pos.z);H.step(1)}const a=Math.atan2(sp.x-e.pos.x,sp.z-e.pos.z)+.6;T_.cam(e.pos.x+Math.sin(a)*2.6,1.5,e.pos.z+Math.cos(a)*2.6,e.pos.x,1.2,e.pos.z)});
    /* third-person aiming */
    await p.evaluate(()=>{const H=__ht;H.startMission(3);const P=H.P;P.fp=false;for(const e of H.enemies){e.pos.x+=400;e.thinkT=1e9}H.step(5)});
    for(const g of['rifle','pistol','shotgun'])await shot('aim_'+g+'_third_person',g=>{const H=__ht,P=H.P;P.cur=g;H.dude.equip(P.dude,g);P.aim=true;P.pitch=-.03;H.step(16);H.draw()},g);
    await shot('aim_rifle_side',()=>{const H=__ht,P=H.P;P.cur='rifle';H.dude.equip(P.dude,'rifle');P.aim=true;P.pitch=0;H.step(12);T_.rel(1.4,1.55,1.35,2.6,1.2)});
    await shot('aim_pistol_side',()=>{const H=__ht,P=H.P;P.cur='pistol';H.dude.equip(P.dude,'pistol');P.aim=true;P.pitch=0;H.step(12);T_.rel(1.4,1.55,1.35,2.6,1.2)});
    await shot('aim_crouch_rifle',()=>{const H=__ht,P=H.P;P.cur='rifle';H.dude.equip(P.dude,'rifle');P.aim=true;P.crouch=true;H.step(16);T_.rel(1.6,1.2,.9,2.4,1);P.crouch=false;P.aim=false});
    await shot('first_person',()=>{const H=__ht,P=H.P;P.fp=true;H.step(4);H.draw();P.fp=false});
    /* surrender, zip-tie, death, the King, a downed ally */
    await p.evaluate(()=>{const H=__ht;H.startMission(3);const P=H.P;P.fp=false;H.step(4)});
    await shot('enemy_hands_up',()=>{const H=__ht,P=H.P;const e=H.enemies.find(x=>!x.boss);H.dude.equip(e.dude,null);e.state='surrender';e.surrAt=0;const sp=T_.spot(e.pos.x,e.pos.z,3.2);P.pos.set(sp.x,0,sp.z);H.step(40);
      const a=Math.atan2(sp.x-e.pos.x,sp.z-e.pos.z);T_.cam(e.pos.x+Math.sin(a)*2.4,1.5,e.pos.z+Math.cos(a)*2.4,e.pos.x,1.1,e.pos.z)});
    await shot('enemy_kneel_zip_tied',()=>{const H=__ht,P=H.P;const e=H.enemies.find(x=>!x.boss&&x.state==='surrender');e.state='cuffed';H.step(40);
      const a=Math.atan2(P.pos.x-e.pos.x,P.pos.z-e.pos.z)+.5;T_.cam(e.pos.x+Math.sin(a)*2.2,1.3,e.pos.z+Math.cos(a)*2.2,e.pos.x,.7,e.pos.z)});
    await shot('enemy_dead',()=>{const H=__ht,P=H.P;const e=H.enemies.filter(x=>!x.boss&&x.state==='idle')[0];const sp=T_.spot(e.pos.x,e.pos.z,4);P.pos.set(sp.x,0,sp.z);T_.engage(e);if(e.state==='surrender'){e.state='idle';T_.engage(e)}H.step(60);
      T_.cam(e.pos.x+1.8,1.6,e.pos.z+1.8,e.pos.x,.3,e.pos.z)});
    await shot('ally_down',()=>{const H=__ht,P=H.P;const a=H.allies[0];a.hp=0;a.down=true;a.downT=99;H.step(45);T_.cam(a.pos.x+2,1.5,a.pos.z+1.6,a.pos.x,.3,a.pos.z)});
  }

  if(SHOTS&&want('boss')){/* the Porch Pirate King, calm then armed (fresh run of the last mission) */
    await p.evaluate(()=>{const H=__ht;H.startMission(3);const b=H.L.boss,P=H.P;P.fp=false;for(const e of H.enemies)if(e!==b)e.pos.x+=400;
      const sp=T_.spot(b.pos.x,b.pos.z,3.4);P.pos.set(sp.x,0,sp.z);for(let i=0;i<40;i++){b.thinkT=1e9;b.target=null;b.alert=false;H.step(1)}});
    await shot('boss',()=>{const H=__ht,b=H.L.boss,P=H.P;P.dude.root.visible=false;const a=b.yaw;T_.cam(b.pos.x+Math.sin(a)*2.6,1.7,b.pos.z+Math.cos(a)*2.6,b.pos.x,1.25,b.pos.z)});
    await shot('boss_close',()=>{const H=__ht,b=H.L.boss;const a=b.yaw;T_.cam(b.pos.x+Math.sin(a+.3)*1.25,1.75,b.pos.z+Math.cos(a+.3)*1.25,b.pos.x,1.52,b.pos.z)});
    await shot('boss_armed',()=>{const H=__ht,b=H.L.boss,P=H.P;b.alert=true;for(let i=0;i<20;i++){b.thinkT=1e9;b.target=null;H.step(1)}P.dude.root.visible=false;const a=b.yaw+.7;T_.cam(b.pos.x+Math.sin(a)*2.6,1.6,b.pos.z+Math.cos(a)*2.6,b.pos.x,1.2,b.pos.z)});
  }

  if(SHOTS&&want('ik')){/* support hand on the forend: aiming and low-ready, side-on */
    await p.evaluate(()=>{const H=__ht;H.startMission(3);H.P.fp=false;for(const e of H.enemies)e.pos.x+=400;for(const a of H.allies)a.pos.x+=400;H.step(3);H.P.dude.root.visible=false});
    for(const[n,aim]of[['ik_long_guns_aim',1],['ik_long_guns_low_ready',0]])
      await shot(n,aim=>{const H=__ht,P=H.P;const g=['shotgun','double','beanbag','hunter','rifle','smg'];T_.lineup(g.map((x,i)=>({role:'thug',variant:['thug_hoodie','thug_track','thug_beanie','thug_red'][i%4],gun:x,aim,turn:Math.PI/2})),{dist:3.4,spacing:.85,steps:30});
        const f=[-Math.sin(P.yaw),-Math.cos(P.yaw)];T_.cam(P.pos.x,1.35,P.pos.z,P.pos.x+f[0]*3.4,1.2,P.pos.z+f[1]*3.4);P.dude.root.visible=false;H.render.draw()},aim);
    await shot('ik_shotgun_close',()=>{const H=__ht,P=H.P;T_.lineup([{role:'thug',variant:'thug_red',gun:'shotgun',aim:1,turn:Math.PI/2}],{dist:1.6,steps:30});const d=T_.row[0];const q=d.root.position;
      const f=[-Math.sin(P.yaw),-Math.cos(P.yaw)];T_.cam(P.pos.x+f[0]*.3,1.45,P.pos.z+f[1]*.3,q.x,1.3,q.z)});
  }

  if(want('perf')){
    const r=await p.evaluate(()=>{const H=__ht;H.startMission(3);const n=H.enemies.length+H.allies.length+1;
      for(let i=0;i<5;i++)H.step(1);const t0=performance.now();for(let i=0;i<60;i++)HT.People.update(1/60,H.camera);const ms=(performance.now()-t0)/60;
      return {chars:n,msPerFrame:+ms.toFixed(2),lastUpdated:HT.People.stats.updates,lastSkipped:HT.People.stats.skipped}});
    ok('animation update cost (swiftshader CPU, all characters)',r.msPerFrame<8,r);
  }
  ok('zero console errors',errs.length===0,errs.slice(0,5));
  if(want('fallback')){/* people GLBs unreachable: the box dudes must take over and a mission still runs */
    const ctx2=await b.newContext({viewport:{width:960,height:540}});
    await ctx2.route('http://repo.local/**',r=>{const u=new URL(r.request().url());if(u.pathname.includes('/assets/people/'))return r.fulfill({status:404,body:'nf'});
      const f=path.join(ROOT,decodeURIComponent(u.pathname));if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'nf'});r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':MIME[path.extname(f)]||'application/octet-stream'}})});
    const q=await ctx2.newPage();const e2=[];q.on('pageerror',e=>e2.push(e.message));
    await q.addInitScript(()=>{window.requestAnimationFrame=()=>0});await q.goto('http://repo.local/index.html');
    await q.waitForFunction(()=>window.__ht&&__ht.assets.done,null,{timeout:180000,polling:500});await q.evaluate(()=>document.getElementById('bStart').click());await q.evaluate(helpers);
    const r=await q.evaluate(()=>{const H=__ht;H.startMission(0);const box=H.enemies.every(e=>!e.dude.rb&&e.dude.legs.length===2)&&!H.P.dude.rb;T_.clearAll();for(const it of H.L.items)if(!it.got)T_.hold(it.x,it.z,40);T_.exit();return{box,state:H.M.state,failed:H.assets.failed.length}});
    ok('fallback: box dudes when the people files fail, mission 0 still completes',r.box&&r.state==='won'&&e2.length===0,Object.assign(r,{pageErrors:e2.slice(0,3)}));
    await ctx2.close()}
  if(want('lowq')){/* Low graphics: character colour maps capped to 512 px, others to 256 */
    const ctx3=await b.newContext({viewport:{width:960,height:540}});
    await ctx3.route('http://repo.local/**',r=>{const u=new URL(r.request().url());const f=path.join(ROOT,decodeURIComponent(u.pathname));if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'nf'});r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':MIME[path.extname(f)]||'application/octet-stream'}})});
    const q=await ctx3.newPage();const e3=[];q.on('console',m=>{if(m.type()==='warning'&&/people/.test(m.text()))e3.push(m.text().slice(0,300))});q.on('pageerror',e=>e3.push(e.message));q.on('console',m=>{if(m.type()==='error')e3.push(m.text())});
    await q.addInitScript(()=>{window.requestAnimationFrame=()=>0;try{localStorage.setItem('ht-cfg',JSON.stringify({gfx:'low'}))}catch(e){}});await q.goto('http://repo.local/index.html');
    await q.waitForFunction(()=>window.__ht&&__ht.assets.done,null,{timeout:180000,polling:500});await q.evaluate(()=>document.getElementById('bStart').click());
    const r=await q.evaluate(()=>{const H=__ht;H.startMission(3);H.step(3);H.draw();let maxMap=0,maxOther=0;if(!H.P.dude.body)return{q:H.render.q,people:HT.People.ok,failed:HT.People.failed};H.P.dude.body.traverse(o=>{if(o.isSkinnedMesh){const m=o.material;if(m.map)maxMap=Math.max(maxMap,m.map.image.width);for(const t of[m.normalMap,m.roughnessMap])if(t)maxOther=Math.max(maxOther,t.image.width)}});return{q:H.render.q,maxMap,maxOther}});
    ok('low quality caps character textures',r.q==='low'&&r.maxMap<=512&&r.maxOther<=256&&e3.length===0,Object.assign(r,{errors:e3.slice(0,3)}));await ctx3.close()}
  await b.close();
  const fail=results.filter(r=>!r[1]).length;console.log(fail?fail+' of '+results.length+' failed':'all '+results.length+' passed');process.exitCode=fail?1:0;
})();
