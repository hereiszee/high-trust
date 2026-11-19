/* In-page probes for the in-game AI checks (loaded by dev/ai-ingame.js): samples the live game every tick and
   records what the AI did, what the dad's camera could see, and when to take a screenshot. */
window.__probe=(()=>{const H=__ht,AI=H.AI,P=H.P,cam=H.camera,B=__bot;const ray=new THREE.Raycaster();
  let R=null,prev=null,ticks=0;
  function reset(i){ticks=0;R={i,t0:H.simT,trustEv:[],moraleBefore:[],minHp:100,dmg:0,lastHp:P.hp,firstCombat:null,firstShotDad:null,eShots:0,eShotsDad:0,hitChMove:[0,0],hitChStill:[0,0],
    maxConc:0,reacts:[],poolPeak:0,poolMax:H.M.pool?H.M.pool.max:0,noToken:0,
    cover:{checked:0,hidden:0,unshootable:0,shotRays:0,leaks:[],rays:0,rayHits:0,maxTopCrouched:0,crouchedN:0},flanks:[],boss:{events:[],retreatRoom:null},waves:[],spawns:[],
    crew:{frames:0,inCone:0,occl:0,crosshair:0,hiddenNearCam:0},snaps:[],snap:null,done:{}};prev={subs:new Map(),n:H.enemies.length,wave:0,phase2:0,reinf:0,bossSub:null,trust:H.prog.trust,cuffs:0,shotSurr:H.prog.shotSurr,morale:[]}}
  function snap(label,view){if(!R.done[label]){R.done[label]=1;R.snap=label;R.snapView=view||null;return true}return false}
  function tick(){if(!R)return;ticks++;const t=H.simT-R.t0,M=H.M,L=H.L;if(!M)return;
    if(H.prog.trust!==prev.trust){R.trustEv.push({t:+t.toFixed(1),d:+(H.prog.trust-prev.trust).toFixed(1),why:M.cuffs!==prev.cuffs?'zip-tie':H.prog.shotSurr!==prev.shotSurr?'shot a surrendered man':M.state!=='go'?'mission end':'?'});prev.trust=H.prog.trust}
    prev.cuffs=M.cuffs;prev.shotSurr=H.prog.shotSurr;
    if(P.hp<R.lastHp)R.dmg+=R.lastHp-P.hp;R.lastHp=P.hp;R.minHp=Math.min(R.minHp,P.hp);
    let conc=0;
    for(const e of H.enemies){if(e.state!=='idle'||!e.ai)continue;const I=e.ai.intent||{};
      if(e.ai.mode==='combat'&&R.firstCombat==null)R.firstCombat=+t.toFixed(2);
      if(I.fire){R.eShots++;if(I.targetId==='player'){R.eShotsDad++;if(R.firstShotDad==null)R.firstShotDad=+t.toFixed(2);const a=P.moving?R.hitChMove:R.hitChStill;a[0]+=I.hitChance;a[1]++}
        if(e.squad&&I.token===false)R.noToken++;if(e._reactT!=null&&e._shotT==null){e._shotT=t;R.reacts.push(+(t-e._reactT).toFixed(2))}}
      if(e.ai.sub==='react'&&e._reactT==null)e._reactT=t;
      if(I.fire||I.aiming)conc++;
      const ps=prev.subs.get(e);if(e.ai.sub==='flank'&&ps!=='flank'){const sq=e.squad,own=sq.alive().filter(a=>a.ai&&a.ai.mode==='combat').length;
        R.flanks.push({t:+t.toFixed(1),id:e.id,ownFighting:own,neighbours:sq.neighbours().length,cross:own<3})}
      prev.subs.set(e,e.ai.sub)}
    R.maxConc=Math.max(R.maxConc,conc);if(M.pool)R.poolPeak=Math.max(R.poolPeak,M.pool.holders.size);
    /* boss phases */
    const b=L.boss;if(b&&b.ai){const f=b.hp/b.maxHp;
      if(b.ai.phase2!==prev.phase2){R.boss.events.push({t:+t.toFixed(1),bossSub:b.ai.sub,phase:b.ai.phase2,hpFrac:+f.toFixed(2),room:L.nav.rooms[L.nav.roomAt(b.pos.x,b.pos.z)].name});prev.phase2=b.ai.phase2}
      if((M.reinforced||0)!==prev.reinf){R.boss.events.push({t:+t.toFixed(1),reinforced:M.reinforced,hpFrac:+f.toFixed(2)});prev.reinf=M.reinforced||0;R.boss.reinfT=t}
      if(b.ai.sub!==prev.bossSub){if(prev.bossSub==='retreat'||b.ai.sub==='retreat')R.boss.events.push({t:+t.toFixed(1),sub:b.ai.sub,room:L.nav.rooms[L.nav.roomAt(b.pos.x,b.pos.z)].name,distDad:+b.pos.distanceTo(P.pos).toFixed(1)});prev.bossSub=b.ai.sub}
      if(R.boss.reinfT&&t-R.boss.reinfT>1.2){/* overhead of the King and the three who answered his call */
        const g=[b,...H.enemies.slice(-3)];const cx=g.reduce((s,e)=>s+e.pos.x,0)/g.length,cz=g.reduce((s,e)=>s+e.pos.z,0)/g.length;snap('m3-boss-reinforcements',{from:[cx,13,cz+9],at:[cx,0,cz]})}}
    /* new enemies (waves, lookouts, reinforcements) */
    if(H.enemies.length>prev.n){const dad={x:P.pos.x,z:P.pos.z,fx:-Math.sin(P.yaw),fz:-Math.cos(P.yaw),fov:.96};
      for(const e of H.enemies.slice(prev.n))R.spawns.push({t:+t.toFixed(1),wave:M.dir?M.dir.wave:null,dist:+e.pos.distanceTo(P.pos).toFixed(1),seen:M.dir?M.dir.seenBy(dad,e.pos.x,e.pos.z):L.nav.los(P.pos.x,P.pos.z,e.pos.x,e.pos.z,false),lane:!!e.lane});prev.n=H.enemies.length}
    if(M.dir&&M.dir.wave!==prev.wave){prev.wave=M.dir.wave;R.waves.push({wave:M.dir.wave,t:+t.toFixed(1),moraleBefore:prev.morale,moraleAfter:[...M.squads.values()].map(s=>+s.morale.toFixed(2))});R.waveT=t}
    if(M.squads)prev.morale=[...M.squads.values()].map(s=>+s.morale.toFixed(2));
    if(M.dir&&R.waveT&&t-R.waveT>5&&t-R.waveT<6)snap('m2-wave-'+M.dir.wave,{from:[L.grill.x,24,L.grill.z+16],at:[L.grill.x,0,L.grill.z-2]});
    if(ticks===90)snap('m'+R.i+'-crew-follow');
    /* cover: anyone hiding behind cover from the dad, checked against the dad's real camera rays */
    if(ticks%6===0)for(const e of H.enemies){if(e.state!=='idle'||!e.ai||e.ai.sub!=='cover'||e.ai.phase!=='hide'||!e.ai.cover)continue;const sp=e.ai.cover.spot;
      if(Math.hypot(e.pos.x-sp.x,e.pos.z-sp.z)>.35)continue;const crouched=e.ai.stance==='crouch';if(crouched&&(e.ck||0)<.95)continue;
      const hide=L.nav.hides(sp,P.pos.x,P.pos.z);if(!hide)continue;const d=e.pos.distanceTo(P.pos);if(d>30)continue;
      const x=B.exposure(e,4);R.cover.checked++;R.cover.rays+=x.tot;R.cover.rayHits+=x.hit;R.cover.shotRays+=x.shot;if(x.shot===0)R.cover.unshootable++;if(x.hit===0)R.cover.hidden++;else if(R.cover.leaks.length<12)R.cover.leaks.push({id:e.id,hide,crouched,dist:+d.toFixed(1),hit:x.hit,shot:x.shot,top:+x.top.toFixed(2),pcrouch:P.crouch,camY:+cam.position.y.toFixed(2)});
      if(crouched){R.cover.crouchedN++;R.cover.maxTopCrouched=Math.max(R.cover.maxTopCrouched,x.top)}
      if(crouched&&d<16){const v=e.pos.clone().sub(cam.position).normalize();const f=new THREE.Vector3();cam.getWorldDirection(f);if(v.dot(f)>.85)snap('m'+R.i+'-crouched-behind-cover')}}
    /* crew vs the third-person camera */
    if(ticks%5===0&&!P.fp){const chest=P.pos.clone().add(new THREE.Vector3(0,1.25,0)),o=cam.position.clone(),d=chest.clone().sub(o),len=d.length();
      ray.set(o,d.normalize());ray.near=0;ray.far=len;const ms=[];for(const a of H.allies)if(!a.down&&a.dude.root.visible)ms.push(...a.dude.meshes);
      R.crew.frames++;if(ms.length&&ray.intersectObjects(ms,false).length)R.crew.occl++;
      /* the crosshair line: camera forward out to 20 m */
      const f=new THREE.Vector3();cam.getWorldDirection(f);ray.set(o,f);ray.near=0;ray.far=20;if(ms.length){const hh=ray.intersectObjects(ms,false)[0];if(hh){const sh=ray.intersectObjects(H.L.solids,false)[0];if(!sh||sh.distance>hh.distance)R.crew.crosshair++}}
      for(const a of H.allies){if(a.down)continue;if(AI.inCamCone({x:o.x,z:o.z,yaw:P.yaw},{x:P.pos.x,z:P.pos.z},a.pos.x,a.pos.z)){R.crew.inCone++;break}}
      for(const a of H.allies)if(!a.dude.root.visible){R.crew.hiddenNearCam++;break}}
  }
  return{reset,tick,get R(){return R}}})();
