/* Camera rig and light for the v2 shots (page side; installed as window.__R after lib.js helpers()).
   Nothing here changes the game: the game places its own camera every frame, then the 'pose' hook (lib.js T.cam / window.__camFn)
   runs just before the frame is drawn, and the rig moves the THREE camera from there.

   Keyframed camera:   __R.use([{f:0,pos:[x,y,z],look:[x,y,z],fov:40},{f:45,pos:..,look:..,fov:28,ease:'io'}], {shake:.02,damp:0})
                       pos/look may be functions of the frame i (follow a moving subject): i=>__R.off(e,[right,up,fwd])
   Helpers:            __R.off(entity|{x,z,yaw}, [right,up,forward]) world point in the subject's frame (game forward = -sin/-cos yaw)
                       __R.golden({el,az,warm,exp})  low warm sun (golden hour) from the game's own mood/sun objects
                       __R.skipDraw(true)  the next frames are simulated but not drawn (only for frames nobody captures) */
function rig(){
  const H=window.__ht,THREE=window.THREE,R=window.__R={};
  const E={lin:t=>t,io:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,sine:t=>-(Math.cos(Math.PI*t)-1)/2,out:t=>1-Math.pow(1-t,3),in:t=>t*t*t,
    out2:t=>1-(1-t)*(1-t),hold:t=>0};
  R.ease=E;
  const val=(v,i)=>typeof v==='function'?v(i):v;
  const lerp=(a,b,t)=>a+(b-a)*t;
  const lerp3=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
  /* position of a game entity (vehicles, enemies, people, the jet) */
  R.p=e=>{if(!e)return[0,0,0];if(Array.isArray(e))return e;const q=e.pos||(e.root&&e.root.position)||(e.e&&e.e.pos)||e.position||e;return[q.x,q.y||0,q.z]};
  R.yaw=e=>e.yaw!=null?e.yaw:(e.root?e.root.rotation.y:0);
  /* a point in the subject's own frame: right, up, forward (metres). The game's forward for yaw is (-sin yaw, -cos yaw). */
  R.off=(e,o,yaw)=>{const p=R.p(e),y=yaw!=null?yaw:R.yaw(e),fx=-Math.sin(y),fz=-Math.cos(y),rx=-fz,rz=fx;
    return[p[0]+rx*o[0]+fx*o[2],p[1]+o[1],p[2]+rz*o[0]+fz*o[2]]};
  R.at=(keys,i)=>{let a=keys[0],b=keys[keys.length-1];if(i<=a.f)return{pos:val(a.pos,i),look:val(a.look,i),fov:a.fov,roll:a.roll||0};
    if(i>=b.f)return{pos:val(b.pos,i),look:val(b.look,i),fov:b.fov,roll:b.roll||0};
    for(let k=0;k<keys.length-1;k++)if(i>=keys[k].f&&i<keys[k+1].f){a=keys[k];b=keys[k+1];break}
    const t=(E[b.ease||'io']||E.io)((i-a.f)/(b.f-a.f));
    return{pos:lerp3(val(a.pos,i),val(b.pos,i),t),look:lerp3(val(a.look,i),val(b.look,i),t),fov:lerp(a.fov||b.fov||45,b.fov||a.fov||45,t),roll:lerp(a.roll||0,b.roll||0,t)}};
  /* deterministic handheld: a sum of incommensurate sines (no Math.random, so previews and takes match) */
  R.shake=(i,amp)=>{const t=i/30;return[amp*(Math.sin(t*2.1)*.6+Math.sin(t*5.3+1)*.3+Math.sin(t*11.7+2)*.1),amp*(Math.sin(t*1.7+.5)*.5+Math.sin(t*4.1+3)*.35+Math.sin(t*9.9)*.15),amp*.6*Math.sin(t*2.9+4)]};
  R.kick=0;/* a one-off jolt (muzzle blast, fly-by): set R.kick=1, it decays */
  let sm=null,sl=null;
  R.use=(keys,o)=>{o=o||{};sm=null;sl=null;
    window.__camFn=cam=>{const i=(window.__trFrame||0)+(o.offset||0);const s=R.at(keys,i);let p=s.pos,l=s.look;
      if(o.damp){/* critically damped follow, for subjects whose animation jitters */const k=o.damp;sm=sm?lerp3(sm,p,k):p.slice();sl=sl?lerp3(sl,l,k):l.slice();p=sm;l=sl}
      const sh=o.shake?R.shake(i,o.shake):[0,0,0];const kk=R.kick;if(kk>0){const t=i*1.7;sh[0]+=Math.sin(t*7)*kk*.12;sh[1]+=Math.sin(t*9+1)*kk*.15;R.kick=kk*.82;if(R.kick<.02)R.kick=0}
      cam.position.set(p[0]+sh[0],p[1]+sh[1],p[2]+sh[2]);cam.up.set(0,1,0);cam.lookAt(l[0]+sh[0]*.5,l[1]+sh[1]*.5,l[2]+sh[2]*.5);if(s.roll)cam.rotateZ(s.roll);
      const fov=s.fov||45;if(Math.abs(cam.fov-fov)>1e-4){cam.fov=fov;cam.updateProjectionMatrix()}
      if(o.after)o.after(cam,i);
      if(R.sunDir)R.sunPlace(o.sunAt?R.p(val(o.sunAt,i)):[l[0],0,l[2]]);
      if(o.hidePlayer!=null&&H.P.dude)H.P.dude.root.visible=!o.hidePlayer}};
  /* ---- light: golden hour from the game's own sun, mood and grade (HT.Roam.mood is the live mood object; setMood re-applies it) ---- */
  let sun=null;H.scene.traverse(o=>{if(o.isDirectionalLight&&o.castShadow)sun=o});R.sun=sun;
  R.golden=o=>{o=o||{};const m=HT.Roam.mood,el=(o.el!=null?o.el:16)*Math.PI/180,az=(o.az!=null?o.az:200)*Math.PI/180;
    Object.assign(m,{exp:o.exp!=null?o.exp:1.0,tint:o.tint||'#ffd2a6',sun:o.sun||'#ffb46e',si:o.si!=null?o.si:2.6,hemi:o.hemi!=null?o.hemi:.55,fb:'#e9b88a'});
    if(o.far)m.far=o.far;if(o.near)m.near=o.near;HT.Roam.setMood();
    R.sunDir=new THREE.Vector3(Math.cos(el)*Math.sin(az),Math.sin(el),Math.cos(el)*Math.cos(az)).normalize()};
  R.sunPlace=c=>{if(!sun||!R.sunDir)return;HT.Roam.sunFollow(c[0],c[2]);sun.position.copy(sun.target.position).addScaledVector(R.sunDir,90);sun.target.updateMatrixWorld()};
  /* line of sight against the level's solids (walls, cars, posts): true when nothing is between a and b */
  const _rc=new THREE.Raycaster();_rc.camera=H.camera;R.clear=(a,b,pad)=>{const L=H.L;if(!L)return true;const A=new THREE.Vector3(a[0],a[1],a[2]),B=new THREE.Vector3(b[0],b[1],b[2]),d=B.clone().sub(A),len=d.length();
    _rc.set(A,d.normalize());_rc.near=pad||.3;_rc.far=Math.max(.1,len-(pad||.3));return !_rc.intersectObjects(L.camSolids||L.solids,false).length};
  /* clear the lens: small props (mailboxes, hydrants, bins, signs, posts) between the camera and the subjects are hidden for the shot,
     the way a capture crew would move a mailbox out of a dolly track. Characters, vehicles, buildings and the ground are never touched. */
  R.hidden=new Set();
  R.clearLens=(cam,targets)=>{const sc=H.scene,cp=cam.position;for(const t of targets){const T3=new THREE.Vector3(t[0],t[1],t[2]),d=T3.clone().sub(cp),len=d.length();_rc.set(cp,d.normalize());_rc.near=.05;_rc.far=len-.6;
      for(const h of _rc.intersectObjects(sc.children,true)){let o=h.object,skip=false;for(let q=o;q;q=q.parent){if(q.isSkinnedMesh||q.userData&&(q.userData.type||q.userData.car||q.userData.hitbox)){skip=true;break}}
        if(skip||o.isSkinnedMesh||!o.isMesh)continue;if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();const s=o.getWorldScale(new THREE.Vector3());const r=o.geometry.boundingSphere.radius*Math.max(s.x,s.y,s.z);
        /* never anything at the subjects themselves (a held stop sign, a parcel): only props well short of them */
        const c=o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld);let near=false;for(const q of targets)if(Math.hypot(c.x-q[0],c.z-q[2])<1.8)near=true;
        if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const bb=o.geometry.boundingBox,thin=Math.max((bb.max.x-bb.min.x)*s.x,(bb.max.z-bb.min.z)*s.z)<.6;
        if((r<1.6||thin)&&!o.isInstancedMesh&&!near){o.visible=false;R.hidden.add(o)}}}};
  /* cinematic HUD: only the game's subtitles (#sub) and its world pop-ups (+TRUST, .htfx-pop) stay; G shots keep the full HUD */
  R.cine=on=>{let st=document.getElementById('__trcine');if(!st){st=document.createElement('style');st.id='__trcine';document.head.appendChild(st)}
    R.cineOn=on!==false;if(!R._cineHook){R._cineHook=1;HT.Jobs.on('pose',()=>{if(!R.cineOn)return;const X=H.hubx;if(X&&X.sprites)for(const q of X.sprites)if(q.s)q.s.visible=false})}
    st.textContent=on===false?'':'body>*:not(#c):not(#sub):not(.htfx-pop){visibility:hidden!important} .ht-root .ht-sub{visibility:visible!important;transform:translateX(-50%) scale(1.5);transform-origin:50% 100%;bottom:96px!important;max-width:900px!important} #sub{transform:scale(1.45);transform-origin:50% 100%} .htfx-pop{font-size:58px!important} .htfx-pop small{font-size:24px!important}'};
  /* the jet's boarding ladder stays on the model in flight (js/jet.js model): hidden for the airborne shots (noted in README) */
  R.jetClean=()=>{try{const L=HT.Jet.S.e.obj.userData.ladder;if(L)L.visible=false}catch(e){}};
  /* gameplay shots keep the whole HUD; only the subtitle line is enlarged so the joke reads on a store page */
  R.subBig=()=>{const st=document.createElement('style');st.textContent='.ht-root .ht-sub{transform:translateX(-50%) scale(1.35);transform-origin:50% 100%}';document.head.appendChild(st)};
  /* draw skipping for test renders: the simulation still advances every frame */
  const rd=H.render.draw.bind(H.render);let skip=false;H.render.draw=(...a)=>{if(skip)return;return rd(...a)};R.skipDraw=v=>{skip=!!v};
}
module.exports={rig};
