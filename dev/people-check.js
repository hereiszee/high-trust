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
    god(){const P=H.P;P.hp=100;for(const w of P.weapons){const a=P.ammo[w];if(a){a.res=999;if(a.mag<=0&&P.reloadT<=0){a.mag=3}}}},
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
      H.mouse=false;return n},
    cuff(e){const P=H.P;for(let k=0;k<30&&e.state==='surrender';k++){P.pos.set(e.pos.x+.9,0,e.pos.z);T_.god();H.use=true;H.step(1)}return e.state},
    clearAll(max=40){for(let k=0;k<max;k++){const l=T_.live();if(!l.length)break;const P=H.P;l.sort((a,b)=>a.pos.distanceTo(P.pos)-b.pos.distanceTo(P.pos));T_.engage(l[0])}
      for(const e of H.enemies)if(e.state==='surrender')T_.cuff(e)},
    hold(x,z,n=60){const P=H.P;for(let k=0;k<n;k++){P.pos.set(x,0,z);T_.god();H.keys.e=true;H.step(1)}H.keys.e=false},
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
  const shot=async(n,fn,arg)=>{if(!SHOTS)return;await p.evaluate(fn||(()=>__ht.draw()),arg);await p.screenshot({path:path.join(OUT,n+'.jpg'),type:'jpeg',quality:86});console.log('       wrote',n+'.jpg')};

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

  if(want('perf')){
    const r=await p.evaluate(()=>{const H=__ht;H.startMission(3);const n=H.enemies.length+H.allies.length+1;
      for(let i=0;i<5;i++)H.step(1);const t0=performance.now();for(let i=0;i<60;i++)HT.People.update(1/60,H.camera);const ms=(performance.now()-t0)/60;
      return {chars:n,msPerFrame:+ms.toFixed(2),lastUpdated:HT.People.stats.updates,lastSkipped:HT.People.stats.skipped}});
    ok('animation update cost (swiftshader CPU, all characters)',r.msPerFrame<8,r);
  }
  ok('zero console errors',errs.length===0,errs.slice(0,5));
  await b.close();
  const fail=results.filter(r=>!r[1]).length;console.log(fail?fail+' of '+results.length+' failed':'all '+results.length+' passed');process.exitCode=fail?1:0;
})();
