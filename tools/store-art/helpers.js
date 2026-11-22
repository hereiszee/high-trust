/* page-side staging helpers for the store-art studio (evaluated in the game page; uses only window.__ht / HT.*) */
(()=>{
const H=window.__ht,T=THREE,PP=HT.People,D=H.dude;
if(window.T_&&T_.row)for(const d of T_.row)if(d.root.parent)d.root.parent.remove(d.root);
const find=(pred)=>{let r=null;H.scene.traverse(o=>{if(!r&&pred(o))r=o});return r};
const sun=find(o=>o.isDirectionalLight&&o.castShadow),hemi=find(o=>o.isHemisphereLight);
const sky=find(o=>o.isMesh&&o.geometry&&o.geometry.parameters&&o.geometry.parameters.radius===380);
const base={sunCol:sun.color.clone(),sunI:sun.intensity,hemiI:hemi.intensity,exp:H.renderer.toneMappingExposure,sky:sky&&sky.material.color.clone(),fog:H.scene.fog&&H.scene.fog.color.clone(),near:H.scene.fog&&H.scene.fog.near,far:H.scene.fog&&H.scene.fog.far};
const lin=c=>new T.Color(c).convertSRGBToLinear();
/* the first-person viewmodel draws from its own scene: skip any Scene that is not the world while staging */
if(!H.renderer.__stWrap){const r0=H.renderer.render.bind(H.renderer);H.renderer.__stWrap=true;H.renderer.render=(sc,cam)=>{if(window.T_&&T_.noVM&&sc&&sc.isScene&&sc!==H.scene)return;return r0(sc,cam)}}
window.T_={noVM:true,
  hideSprites(on=true){H.scene.traverse(o=>{if(o.isSprite){if(on){if(o.__stv==null)o.__stv=o.visible;o.visible=false}else if(o.__stv!=null){o.visible=o.__stv;o.__stv=null}}})},
  H,sun,hemi,sky,base,row:[],
  /* light: {dir:[x,y,z] towards the sun, sun:'#hex', si, hemi, exp, sky:'#tint', fog:'#hex', near, far} ; null resets */
  L:null,
  light(o){T_.L=o||null;T_.applyLight()},
  applyLight(){const o=T_.L;if(!o)return;
    if(o.sun)sun.color.copy(lin(o.sun));if(o.si!=null)sun.intensity=o.si;if(o.hemi!=null)hemi.intensity=o.hemi;if(o.hemiSky)hemi.color.copy(lin(o.hemiSky));if(o.hemiGround)hemi.groundColor.copy(lin(o.hemiGround));
    if(o.exp!=null)H.renderer.toneMappingExposure=o.exp;if(o.sky&&sky)sky.material.color.copy(lin(o.sky));
    if(H.scene.fog){if(o.fog)H.scene.fog.color.copy(lin(o.fog));if(o.near!=null)H.scene.fog.near=o.near;if(o.far!=null)H.scene.fog.far=o.far}
    if(o.dir){const c=o.center||[H.camera.position.x,0,H.camera.position.z];const d=new T.Vector3(...o.dir).normalize();
      sun.target.position.set(c[0],0,c[2]);sun.position.copy(sun.target.position).addScaledVector(d,90);sun.target.updateMatrixWorld();
      if(o.ext){Object.assign(sun.shadow.camera,{left:-o.ext,right:o.ext,top:o.ext,bottom:-o.ext});sun.shadow.camera.updateProjectionMatrix()}}
    if(o.envI!=null)H.scene.traverse(m=>{if(m.material&&m.material.envMapIntensity!=null&&!m.material.__st){m.material.envMapIntensity=o.envI}})},
  cam(p,t,fov){const c=H.camera;if(fov){c.fov=fov;c.updateProjectionMatrix()}c.position.set(...p);c.lookAt(...t);c.updateMatrixWorld();T_.C={p,t,fov}},
  /* fixed camera: re-assert it (updCamera is never called by redraw) */
  reCam(){if(T_.C){const c=H.camera,{p,t,fov}=T_.C;if(fov&&c.fov!==fov){c.fov=fov}c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();c.position.set(...p);c.lookAt(...t);c.updateMatrixWorld()}},
  build(){const O=HT.OpenWorld;const c=H.camera.position;if(O&&O.buildNear)try{O.buildNear(c.x,c.z,160,4000)}catch(e){}if(T_.C){const t=T_.C.t;if(O&&O.buildNear)try{O.buildNear(t[0],t[2],120,4000)}catch(e){}}},
  redraw(dt=0){T_.reCam();T_.applyLight();T_.build();
    for(const d of T_.row)if(d.__pose)D.pose(d,dt||1/60,d.__pose);
    if(PP&&PP.ok)PP.update(dt||1/600,H.camera);
    if(T_.sprOff)T_.hideSprites(true);if(T_.onFrame)try{T_.onFrame()}catch(e){console.warn(e)}
    H.scene.updateMatrixWorld();D.groundPass(1);H.render.draw();D.groundPass(-1)},
  /* characters-only matte, same camera: crew white, every other visible mesh black (so occluders cut the matte) */
  /* characters-only matte, same camera: crew meshes white on black, via a camera layer (nothing else is touched) */
  matte(){const W=new T.MeshBasicMaterial({color:0xffffff}),WS=new T.MeshBasicMaterial({color:0xffffff,skinning:true});const swap=[];
    for(const d of T_.row)d.root.traverse(o=>{if(!o.isMesh||!o.material)return;const m=o.material;const vis=Array.isArray(m)?m.some(x=>x.visible):m.visible;if(!vis||!o.visible)return;
      const nm=o.isSkinnedMesh?WS:W;swap.push([o,m]);o.material=Array.isArray(m)?m.map(x=>x.visible?nm:x):nm;o.layers.enable(7)});
    T_._swap=swap;const r=H.renderer,c=H.camera;const tm=r.toneMapping,bg=H.scene.background,fog=H.scene.fog;H.scene.background=new T.Color(0);H.scene.fog=null;r.toneMapping=T.NoToneMapping;
    T_.reCam();H.scene.updateMatrixWorld();const lm=c.layers.mask;c.layers.set(7);
    try{r.setRenderTarget(null);r.setClearColor(0x000000,1);r.clear(true,true,true);r.render(H.scene,c)}finally{c.layers.mask=lm;r.toneMapping=tm;H.scene.background=bg;H.scene.fog=fog}return swap.length},
  unmatte(){for(const[o,m]of(T_._swap||[])){o.material=m;o.layers.disable(7)}T_._swap=null},
  pending(){const c=H.camera.position;const O=HT.OpenWorld;return{people:PP&&PP.pending?PP.pending.filter(d=>d.root&&d.root.parent).length:-1,ow:O&&O.pendingNear?O.pendingNear(c.x,c.z,150):-1,stream:H.assets.stream?H.assets.stream.pending():-1,box:T_.row.filter(d=>d.root.userData.boxDude).length}},
  clear(){for(const d of T_.row)if(d.root.parent)d.root.parent.remove(d.root);T_.row=[]},
  /* hide the live game characters (player, crew followers, optionally everyone else) */
  hideLive({player=true,allies=true}={}){H.P.fp=false;H.P.aim=false;H.P.scoped=false;try{H.camTick(1/30)}catch(e){}if(player&&H.P.dude)H.P.dude.root.visible=false;if(allies)for(const a of H.allies)if(a.dude)a.dude.root.visible=false},
  /* place a posed character: role (HOMIES key or People role), at [x,z], facing yaw (rad, 0 = +z), opts {gun, mode, aim, moving, variant, steps, scale} */
  put(role,x,z,yaw,o={}){const spec=role==='thug'?{variant:o.variant}:(D.HOMIES[role]||{role,variant:o.variant});const d=D.make(spec);
    if(o.gun)D.equip(d,o.gun);if(o.idle&&d.rb)d.rb.idle=o.idle;d.root.position.set(x,o.y||0,z);d.root.rotation.y=yaw;H.scene.add(d.root);
    d.__pose={moving:!!o.moving,aim:!!o.aim,mode:o.mode||'stand',pitch:o.pitch||0};
    const n=o.steps==null?40:o.steps,v=o.vel||0,fx=Math.sin(yaw),fz=Math.cos(yaw);
    if(v){d.__pose.moving=true;d.root.position.set(x-fx*v*n/30,o.y||0,z-fz*v*n/30)}
    for(let k=0;k<n;k++){if(v){d.root.position.x+=fx*v/30;d.root.position.z+=fz*v/30}D.pose(d,1/30,d.__pose);if(PP&&PP.ok)PP.update(1/30,H.camera)}
    if(v)d.__pose=null;
    T_.row.push(d);return d},
  yawTo(x,z,tx,tz){return Math.atan2(tx-x,tz-z)},
  info(){const P=H.P,V=H.VAN;return{P:[+P.pos.x.toFixed(2),+P.pos.z.toFixed(2),+P.yaw.toFixed(2)],van:V&&V.pos?[+V.pos.x.toFixed(2),+V.pos.z.toFixed(2),+(V.yaw||0).toFixed(2)]:null,start:H.L&&H.L.start?[H.L.start.x,H.L.start.z]:null,q:H.render.q}}
};
})();
