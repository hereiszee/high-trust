/* In-page scripted player and probes for the in-game AI checks. Loaded into the page by dev/ai-ingame.js.
   The bot plays like a cautious human: walks the nav path to the objective, stops to shoot what the camera can actually
   hit (same ray as fire()), zip-ties anyone who gives up, holds E on objectives, and goes back to the van. */
window.__bot=(()=>{const H=__ht,AI=H.AI,P=H.P,keys=H.keys,cam=H.camera;
  const ray=new THREE.Raycaster(),v=new THREE.Vector3(),bx=new THREE.Box3(),tmpB=new THREE.Box3();
  const st={react:.35,jitter:.22,strafe:true,acqT:0,path:null,pi:0,repT:0,goal:null,tgt:null,tgtT:0,noHitT:0,log:[],shots:0};
  function meshBox(ent){bx.makeEmpty();for(const m of ent.dude.meshes){tmpB.setFromObject(m);bx.union(tmpB)}return bx}
  /* what the dad's camera ray would hit first, filtered exactly like fire() */
  function firstHit(origin,dir,far){ray.set(origin,dir);const eye=P.pos.clone().add(new THREE.Vector3(0,P.crouch?1.15:1.65,0));
    ray.near=P.fp?0:Math.max(0,cam.position.distanceTo(eye)-.2);ray.far=far||90;
    for(const h of ray.intersectObjects(H.rayTargets,false)){const e=h.object.userData.ent;if(e===P)continue;if(e&&(e.state==='dead'||e.state==='cuffed'||e.down))continue;if(e&&e.kind==='ally')continue;return h}return null}
  function camHits(e,pt){const o=cam.position.clone(),d=pt.clone().sub(o);const L=d.length();const h=firstHit(o,d.normalize(),L+2);return h&&h.object.userData.ent===e?h:null}
  /* sample a grid over the enemy's hitbox from the camera: how many rays land on him */
  function exposure(e,n=5){const b=meshBox(e).clone();let hit=0,tot=0,shot=0;const o=cam.position.clone();
    for(let i=0;i<n;i++)for(let j=0;j<n;j++)for(const k of[.25,.5,.75]){const p=new THREE.Vector3(b.min.x+(b.max.x-b.min.x)*(i+.5)/n,b.min.y+(b.max.y-b.min.y)*(j+.5)/n,b.min.z+(b.max.z-b.min.z)*k);
      tot++;const d=p.clone().sub(o);const h=firstHit(o,d.clone().normalize(),d.length()+1);if(h&&h.object.userData.ent===e){hit++;if(shoulderClear(h.point))shot++}}return{hit,tot,shot,top:b.max.y}}
  /* fire() in third person also needs the shoulder-to-hit-point segment clear of solids */
  function shoulderClear(pt){if(P.fp)return true;const eye=P.pos.clone().add(new THREE.Vector3(0,P.crouch?1.15:1.65,0));const sh=eye.addScaledVector(new THREE.Vector3(Math.cos(P.yaw),0,-Math.sin(P.yaw)),.3);
    const d=pt.clone().sub(sh),L=d.length();ray.set(sh,d.normalize());ray.near=0;ray.far=Math.max(0,L-.05);return !ray.intersectObjects(H.L.solids,false).length}
  function aimAt(pt){const o=cam.position;const dx=pt.x-o.x,dz=pt.z-o.z,dy=pt.y-o.y;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz))}
  function camFwd(){return new THREE.Vector3(-Math.sin(P.yaw)*Math.cos(P.pitch),Math.sin(P.pitch),-Math.cos(P.yaw)*Math.cos(P.pitch))}
  function go(gx,gz,dt){const L=H.L;const t=H.simT;
    if(!st.path||!st.goal||Math.hypot(st.goal.x-gx,st.goal.z-gz)>1||t-st.repT>.6){const p=L.nav.path(P.pos.x,P.pos.z,gx,gz);st.path=p?p.pts:[{x:gx,z:gz}];st.pi=1;st.goal={x:gx,z:gz};st.repT=t}
    let w=st.path[Math.min(st.pi,st.path.length-1)];while(st.pi<st.path.length-1&&Math.hypot(w.x-P.pos.x,w.z-P.pos.z)<.5){st.pi++;w=st.path[st.pi]}
    const dx=w.x-P.pos.x,dz=w.z-P.pos.z;if(Math.hypot(gx-P.pos.x,gz-P.pos.z)<.6){keys.w=false;return true}
    P.yaw=Math.atan2(-dx,-dz);P.pitch=-.08;keys.w=true;return false}
  function nearest(list,f){let b=null,bd=1e9;for(const x of list){if(f&&!f(x))continue;const px=x.pos?x.pos.x:x.x,pz=x.pos?x.pos.z:x.z;const d=Math.hypot(px-P.pos.x,pz-P.pos.z);if(d<bd){bd=d;b=x}}return b}
  function tick(dt){const L=H.L,M=H.M;if(!M||M.state!=='go')return;keys.w=false;keys.e=false;keys.shift=false;H.mouse=false;H.use=false;P.aim=false;
    const live=H.enemies.filter(e=>e.state==='idle');
    /* visible threats and which of them the camera can hit right now */
    const vis=live.filter(e=>Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z)<40&&L.nav.los(P.pos.x,P.pos.z,e.pos.x,e.pos.z,false));
    let best=null,bp=null,bd=1e9;
    for(const e of vis){const b=meshBox(e);const c=b.getCenter(new THREE.Vector3());const pts=[c,new THREE.Vector3(c.x,b.max.y-.15,c.z),new THREE.Vector3(c.x,b.min.y+(b.max.y-b.min.y)*.35,c.z)];
      for(const p of pts){if(camHits(e,p)){const d=e.pos.distanceTo(P.pos);if(d<bd){bd=d;best=e;bp=p}break}}}
    P.crouch=P.hp<40&&!!best;
    if(best){/* human-ish: a beat to acquire a new target, an unsteady aim that grows with range, strafing while shooting */
      if(best!==st.tgt){st.tgt=best;st.acqT=H.simT+st.react*(.8+Math.random()*.5)}
      const j=st.jitter*Math.max(1,bd/10),ap=bp.clone().add(new THREE.Vector3((Math.random()-.5)*2*j,(Math.random()-.5)*1.2*j,(Math.random()-.5)*2*j));
      aimAt(ap);P.aim=true;keys.a=keys.d=false;if(st.strafe){const k=Math.floor(H.simT/1.4)%3;if(k===1)keys.a=true;else if(k===2)keys.d=true}
      if(H.simT>=st.acqT){const h=firstHit(cam.position.clone(),camFwd(),90);const he=h&&h.object.userData.ent;if(!(he&&he.state==='surrender')){H.mouse=true;st.shots++}}
      st.noHitT=0;return}
    keys.a=keys.d=false;
    if(vis.length)st.noHitT+=dt;
    /* zip-tie anyone with their hands up once nobody is shooting at us */
    const surr=H.enemies.filter(e=>e.state==='surrender');const s=nearest(surr);
    if(s&&(!vis.length||Math.hypot(s.pos.x-P.pos.x,s.pos.z-P.pos.z)<6)){if(Math.hypot(s.pos.x-P.pos.x,s.pos.z-P.pos.z)<2.0){H.use=true;st.log.push(['cuff',+H.simT.toFixed(1),s.boss?'boss':s.id]);return}go(s.pos.x,s.pos.z,dt);return}
    /* someone we can see but not hit for a while: push up on him */
    if(vis.length&&st.noHitT>2.5){const e=nearest(vis);go(e.pos.x,e.pos.z,dt);return}
    const m=M.def;let g=null,hold=null;
    if(M.exitOpen&&L.exit)g=L.exit;
    else if(m.type==='loot'){hold=nearest(L.items,i=>!i.got);g=hold}
    else if(m.type==='stash'){hold=nearest(L.stashes,s=>!s.done);g=hold}
    else if(m.type==='boss'){const b=L.boss;if(b&&b.state==='idle'){const e=nearest(live.filter(x=>!x.boss));g=e&&e.pos.distanceTo(P.pos)<16?e.pos:b.pos}else if(b&&b.state==='surrender')g=b.pos}
    else if(m.type==='waves'){const e=live.length?nearest(live):null;g=e&&M.waveAge>20?e.pos:{x:L.start.x,z:L.start.z+1}}
    if(!g)return;const gx=g.x,gz=g.z;
    if(hold&&Math.hypot(gx-P.pos.x,gz-P.pos.z)<1.6){keys.e=true;return}
    go(gx,gz,dt)}
  return{st,tick,go,exposure,meshBox,camHits,firstHit,aimAt}})();
