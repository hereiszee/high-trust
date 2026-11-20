/* =====================================================================
   HT.Props (SPEC3 2.9, helper): placeable physical props. Owner: Cone Zone (js/jobs/cones.js). Reusable by any job.
   Traffic cones, Type I sawhorses, a folding ROAD WORK AHEAD sign, road flares and a STOP/SLOW paddle: built once per
   manager from shared geometry and materials (procedural, canvas textures), picked up and carried, placed with a ghost
   preview that snaps, and knocked flying by vehicles (cars are slowed by what they hit).

   const S = HT.Props.create(api)             api = HT.Jobs.api (THREE, wmAdd, groundAt...)
   S.add(kind,x,z,yaw,{lit}) -> prop          kind: 'cone' 'sawhorse' 'sign' 'flare'; prop {id,kind,x,z,yaw,stack,lit,state,mesh}
   S.remove(p)                                take it off the road (the mesh is kept for carrying: S.carryMesh)
   S.carryMesh(kind,n) -> THREE.Group         what the dad holds (n cones stacked); free it with S.free(group)
   S.snap(kind,x,z,yaw) -> {x,z,yaw,stack:p|null,line:z|null}   0.25 m grid, lines up with props already placed, stacks a cone on a cone
   S.ghost(kind,x,z,yaw,ok) / S.ghostOff()    the translucent preview (green ok, red not)
   S.foot(p) -> {x0,x1,z0,z1}                 world-axis footprint;  S.near(x,z,r,filter) -> nearest prop
   S.hit(circles,vx,vz,speed,who) -> {slow:0..1, hits:[props]}   a vehicle's contact circles ({x,z,r}) against standing props
   S.step(dt)                                 flying props: gravity, bounce, tumble, settle (all from the dt passed in)
   S.dispose()                                every mesh, geometry, material and texture this manager made
   KINDS[kind] = {w,d,cls:'soft'|'medium'|'signal',carry,label}
   Pure gameplay timing: only the dt handed to step(). No timers.
   ===================================================================== */
(function(root){'use strict';
const HT=root.HT=root.HT||{};
const KINDS={
  cone:    {w:.44,d:.44,cls:'soft',  carry:2,label:'Traffic cone',  plural:'cones',  r:.24,mass:.2},
  sawhorse:{w:1.9,d:.62,cls:'medium',carry:1,label:'Sawhorse',      plural:'sawhorses',r:.95,mass:1},
  sign:    {w:1.0,d:.8, cls:'medium',carry:1,label:'ROAD WORK AHEAD sign',plural:'signs',r:.55,mass:.8},
  flare:   {w:.5, d:.5, cls:'signal',carry:2,label:'Road flare',    plural:'flares',  r:.25,mass:.05}};
const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};

function create(api){
  const a=api,T3=a.THREE,R={geo:[],mat:[],tex:[]},G_=g=>{R.geo.push(g);return g},M_=m=>{R.mat.push(m);return m},T_=t=>{R.tex.push(t);return t};
  const lin=c=>a.lin?a.lin(c):c;
  const std=(c,o)=>M_(new T3.MeshStandardMaterial(Object.assign({color:lin(c),roughness:.6,metalness:0},o||{})));
  function canvas(w,h,f){const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);const t=new T3.CanvasTexture(c);if(T3.sRGBEncoding)t.encoding=T3.sRGBEncoding;t.anisotropy=4;return T_(t)}
  /* ---- shared look ---- */
  const L={};
  L.orange=std('#ff6a13',{roughness:.48});L.white=std('#f4f3ee',{roughness:.3,metalness:.1,emissive:lin('#2a2a26'),emissiveIntensity:.25});
  L.black=std('#1c1d1f',{roughness:.85});L.steel=std('#9aa1a7',{roughness:.4,metalness:.6});L.wood=std('#e9e2d2',{roughness:.7});
  L.stripe=std('#ffffff',{map:canvas(256,64,(g,w,h)=>{g.fillStyle='#f6f5ef';g.fillRect(0,0,w,h);g.fillStyle='#ff5a0a';for(let x=-h;x<w+h;x+=48){g.beginPath();g.moveTo(x,h);g.lineTo(x+24,h);g.lineTo(x+24+h,0);g.lineTo(x+h,0);g.closePath();g.fill()}
    g.fillStyle='rgba(0,0,0,.08)';g.fillRect(0,h-5,w,5)}),roughness:.35,emissive:lin('#201a14'),emissiveIntensity:.2});
  L.signFace=std('#ffffff',{map:canvas(256,256,(g,w,h)=>{g.clearRect(0,0,w,h);g.save();g.translate(w/2,h/2);g.rotate(Math.PI/4);const s=168;g.fillStyle='#16181a';g.fillRect(-s/2-6,-s/2-6,s+12,s+12);g.fillStyle='#ff8a1c';g.fillRect(-s/2,-s/2,s,s);g.restore();
    g.fillStyle='#14161a';g.textAlign='center';g.font='bold 34px Arial';g.fillText('ROAD',w/2,98);g.fillText('WORK',w/2,138);g.fillText('AHEAD',w/2,178)}),transparent:true,alphaTest:.4,roughness:.45,side:T3.DoubleSide});
  L.amber=M_(new T3.MeshStandardMaterial({color:lin('#8a5a00'),emissive:lin('#ffb020'),emissiveIntensity:1.6,roughness:.3}));
  L.flare=M_(new T3.MeshStandardMaterial({color:lin('#b0201a'),roughness:.5}));
  L.flame=M_(new T3.MeshBasicMaterial({color:new T3.Color('#ff3b1f'),transparent:true,opacity:.9,depthWrite:false,blending:T3.AdditiveBlending}));
  L.glow=M_(new T3.MeshBasicMaterial({map:canvas(64,64,(g,w,h)=>{const r=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);r.addColorStop(0,'rgba(255,90,50,.9)');r.addColorStop(.4,'rgba(255,40,20,.35)');r.addColorStop(1,'rgba(255,20,10,0)');g.fillStyle=r;g.fillRect(0,0,w,h)}),
    transparent:true,depthWrite:false,blending:T3.AdditiveBlending}));
  L.ghostOk=M_(new T3.MeshBasicMaterial({color:new T3.Color('#47e08a'),transparent:true,opacity:.42,depthWrite:false}));
  L.ghostBad=M_(new T3.MeshBasicMaterial({color:new T3.Color('#ff5a4d'),transparent:true,opacity:.42,depthWrite:false}));
  L.shadow=M_(new T3.MeshBasicMaterial({map:canvas(64,64,(g,w,h)=>{const r=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);r.addColorStop(0,'rgba(0,0,0,.45)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,w,h)}),transparent:true,depthWrite:false}));
  /* ---- shared geometry ---- */
  const coneProfile=[[0,.72],[.035,.72],[.05,.69],[.16,.06],[.17,.04],[0,.04]].map(([x,y])=>new T3.Vector2(x,y));
  const GEO={cone:G_(new T3.LatheGeometry(coneProfile,18)),coneBand:G_(new T3.CylinderGeometry(.093,.124,.1,18,1,true)),coneBand2:G_(new T3.CylinderGeometry(.072,.087,.06,18,1,true)),
    coneBase:G_(new T3.BoxGeometry(.4,.04,.4)),board:G_(new T3.BoxGeometry(1.8,.2,.03)),leg:G_(new T3.BoxGeometry(.05,.95,.05)),foot:G_(new T3.BoxGeometry(.06,.05,.62)),
    lampBody:G_(new T3.CylinderGeometry(.07,.07,.05,12)),lampLens:G_(new T3.SphereGeometry(.065,12,8,0,Math.PI*2,0,Math.PI/2)),signPlate:G_(new T3.PlaneGeometry(.92,.92)),
    signLeg:G_(new T3.BoxGeometry(.035,1.2,.035)),flare:G_(new T3.CylinderGeometry(.022,.022,.3,8)),flame:G_(new T3.ConeGeometry(.05,.22,8)),glow:G_(new T3.PlaneGeometry(1.4,1.4)),
    shadow:G_(new T3.PlaneGeometry(1,1)),handle:G_(new T3.CylinderGeometry(.018,.018,1.2,8)),paddle:G_(new T3.CircleGeometry(.23,8))};
  const mk=(g,m,x,y,z,parent,rx,ry,rz)=>{const o=new T3.Mesh(g,m);o.position.set(x||0,y||0,z||0);if(rx||ry||rz)o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=true;o.receiveShadow=true;if(parent)parent.add(o);return o};
  const blob=(g,w,d)=>{const s=new T3.Mesh(GEO.shadow,L.shadow);s.rotation.x=-Math.PI/2;s.scale.set(w,d,1);s.position.y=.012;s.renderOrder=1;s.castShadow=false;g.add(s);return s};
  /* builders: model space +x = across (the long side of a sawhorse), -z = the face (a sign faces -z before yaw) */
  function cone(){const g=new T3.Group();mk(GEO.coneBase,L.black,0,.02,0,g);mk(GEO.cone,L.orange,0,0,0,g);mk(GEO.coneBand,L.white,0,.43,0,g);mk(GEO.coneBand2,L.white,0,.57,0,g);blob(g,.6,.6);return g}
  function sawhorse(){const g=new T3.Group();for(const y of[.62,.9]){const b=mk(GEO.board,L.stripe,0,y,0,g)}
    for(const s of[-1,1])for(const t of[-1,1]){const l=mk(GEO.leg,L.wood,s*.78,.47,t*.14,g);l.rotation.x=t*.28}
    for(const s of[-1,1])mk(GEO.foot,L.steel,s*.78,.025,0,g);
    const lp=new T3.Group();lp.position.set(.62,1.02,0);g.add(lp);mk(GEO.lampBody,L.black,0,0,0,lp);const ln=mk(GEO.lampLens,L.amber,0,.02,0,lp);ln.castShadow=false;g.userData.lamp=ln;blob(g,2.1,.8);return g}
  function sign(){const g=new T3.Group();const p=mk(GEO.signPlate,L.signFace,0,1.42,-.06,g);p.rotation.y=Math.PI;p.castShadow=true;
    for(const s of[-1,1]){const f=mk(GEO.signLeg,L.steel,s*.28,.62,.0,g);f.rotation.x=-.22;const b=mk(GEO.signLeg,L.steel,s*.28,.62,.2,g);b.rotation.x=.38}
    mk(GEO.foot,L.black,0,.03,.05,g).scale.set(10,1,.5);blob(g,1.1,.9);return g}
  function flare(lit){const g=new T3.Group();const s=mk(GEO.flare,L.flare,0,.024,0,g);s.rotation.z=Math.PI/2;
    const fl=mk(GEO.flame,L.flame,.17,.09,0,g);fl.castShadow=false;fl.visible=!!lit;const gw=new T3.Mesh(GEO.glow,L.glow);gw.rotation.x=-Math.PI/2;gw.position.set(.15,.03,0);gw.visible=!!lit;g.add(gw);
    g.userData.flame=fl;g.userData.glow=gw;return g}
  const BUILD={cone,sawhorse,sign,flare};
  /* the STOP/SLOW paddle a flagger holds (held in the right hand: put it on the dude root at about (.32,1.0,.15)) */
  function paddle(){const g=new T3.Group();mk(GEO.handle,L.steel,0,.6,0,g);
    const face=(txt,bg,fg,ry)=>{const m=M_(new T3.MeshStandardMaterial({map:canvas(128,128,(c,w,h)=>{c.fillStyle=bg;c.beginPath();for(let i=0;i<8;i++){const an=Math.PI/8+i*Math.PI/4;c.lineTo(w/2+Math.cos(an)*60,h/2+Math.sin(an)*60)}c.closePath();c.fill();c.strokeStyle='#fff';c.lineWidth=5;c.stroke();
      c.fillStyle=fg;c.font='bold 34px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,w/2,h/2+2)}),transparent:true,alphaTest:.3,roughness:.5,side:T3.FrontSide}));
      const d=new T3.Mesh(G_(new T3.PlaneGeometry(.48,.48)),m);d.position.y=1.32;d.rotation.y=ry;g.add(d);return d};
    face('STOP','#c8201c','#fff',0);face('SLOW','#ff8a1c','#111',Math.PI);return g}

  /* ---- the manager ---- */
  const S={list:[],kinds:KINDS,mats:L,seq:0,ghostG:null};
  const free=new Set();/* meshes made here, removed in dispose */
  function place(p){const m=p.mesh;const y=a.groundAt?a.groundAt(p.x,p.z):0;m.position.set(p.x,y+(p.stackOn?.33:0),p.z);m.rotation.set(0,p.yaw,0);p.y=m.position.y}
  S.add=(kind,x,z,yaw,o)=>{o=o||{};if(!BUILD[kind])return null;const mesh=BUILD[kind](o.lit);a.wmAdd(mesh);free.add(mesh);
    const p={id:++S.seq,kind,x,z,yaw:yaw||0,y:0,lit:!!o.lit,burn:o.burn!=null?o.burn:150,state:'placed',stack:1,stackOn:null,mesh,vx:0,vy:0,vz:0,spin:0,ax:0,knocked:0,by:null};
    if(kind==='cone'&&o.stackOn&&o.stackOn.kind==='cone'&&o.stackOn.state==='placed'){const b=o.stackOn;p.stackOn=b;b.stack=2;p.x=b.x;p.z=b.z;p.yaw=b.yaw}
    place(p);S.list.push(p);return p};
  S.remove=p=>{const i=S.list.indexOf(p);if(i>=0)S.list.splice(i,1);if(p.stackOn){p.stackOn.stack=1;p.stackOn=null}
    for(const q of S.list)if(q.stackOn===p){q.stackOn=null;q.stack=1;place(q)}
    if(p.mesh&&p.mesh.parent)p.mesh.parent.remove(p.mesh);return p};
  S.carryMesh=(kind,n)=>{const g=new T3.Group();n=n||1;for(let i=0;i<n;i++){const m=BUILD[kind](false);
      if(kind==='cone'){m.position.y=i*.16;m.scale.setScalar(.8)}else if(kind==='flare'){m.position.set(0,i*.05,0);m.rotation.y=Math.PI/2}
      else if(kind==='sawhorse'){m.scale.setScalar(.72);m.position.set(0,-.55,.05)}else if(kind==='sign'){m.scale.setScalar(.6);m.position.set(0,-.62,.05)}
      m.traverse(o=>{if(o.isMesh&&o.material===L.shadow)o.visible=false});g.add(m)}free.add(g);return g};
  S.paddle=()=>{const g=paddle();free.add(g);return g};
  S.free=g=>{if(g&&g.parent)g.parent.remove(g);free.delete(g)};
  /* footprint, axis-aligned in the world */
  S.foot=p=>{const K=KINDS[p.kind],c=Math.abs(Math.cos(p.yaw)),s=Math.abs(Math.sin(p.yaw)),hw=(K.w*c+K.d*s)/2,hd=(K.w*s+K.d*c)/2;return{x0:p.x-hw,x1:p.x+hw,z0:p.z-hd,z1:p.z+hd}};
  S.near=(x,z,r,f)=>{let best=null,bd=r;for(const p of S.list){if(f&&!f(p))continue;const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;best=p}}return best};
  /* snapping: 0.25 m grid; within 1.4 m (along the road) of a placed prop's line, take its line; a cone over a lone cone stacks */
  S.snap=(kind,x,z,yaw,o)=>{o=o||{};const q=v=>Math.round(v*4)/4;let sx=q(x),sz=q(z),line=null;
    if(kind==='cone'){const st=S.near(x,z,.38,p=>p.kind==='cone'&&p.state==='placed'&&p.stack<2&&!p.stackOn);if(st)return{x:st.x,z:st.z,yaw:st.yaw,stack:st,line:st.z}}
    let bd=1.4;for(const p of S.list){if(p.state!=='placed')continue;const d=Math.abs(p.z-z);if(d<bd&&Math.abs(p.x-x)<6){bd=d;line=p.z}}if(line!=null)sz=line;
    /* neighbours on the line: butt up against the nearest one instead of overlapping it */
    const K=KINDS[kind];for(const p of S.list){if(p.state!=='placed'||Math.abs(p.z-sz)>.5)continue;const Kp=KINDS[p.kind],gap=(K.w+Kp.w)/2+.02;const dx=sx-p.x;if(Math.abs(dx)<gap&&kind!=='flare'&&p.kind!=='flare')sx=q(p.x+Math.sign(dx||1)*gap)}
    return{x:sx,z:sz,yaw:o.yaw!=null?o.yaw:yaw,stack:null,line}};
  S.ghost=(kind,x,z,yaw,ok)=>{if(!S.ghostG||S.ghostG.userData.kind!==kind){S.ghostOff();const g=BUILD[kind](kind==='flare');g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.userData.m0=o.material;o.material=L.ghostOk}});g.userData.kind=kind;a.wmAdd(g);free.add(g);S.ghostG=g}
    const g=S.ghostG;g.visible=true;g.position.set(x,(a.groundAt?a.groundAt(x,z):0)+(o2(x,z,kind)?.33:0)+.01,z);g.rotation.set(0,yaw,0);
    if(g.userData.ok!==ok){g.userData.ok=ok;g.traverse(o=>{if(o.isMesh)o.material=ok?L.ghostOk:L.ghostBad})}};
  const o2=(x,z,kind)=>kind==='cone'&&S.list.some(p=>p.kind==='cone'&&p.state==='placed'&&p.x===x&&p.z===z&&p.stack===1&&!p.stackOn);
  S.ghostOff=()=>{if(S.ghostG){S.free(S.ghostG);S.ghostG=null}};
  /* a vehicle's contact circles against standing props: knock them flying, report how much the car is slowed */
  S.hit=(circles,vx,vz,speed,who)=>{let slow=0;const hits=[];if(speed<.6)return{slow,hits};
    for(const p of S.list){if(p.state==='flying')continue;const K=KINDS[p.kind];let hit=false;
      for(const c of circles){const f=S.foot(p),cx=Math.max(f.x0,Math.min(c.x,f.x1)),cz=Math.max(f.z0,Math.min(c.z,f.z1));if(Math.hypot(cx-c.x,cz-c.z)<c.r){hit=true;break}}
      if(!hit)continue;knock(p,vx,vz,speed,who);hits.push(p);slow=Math.max(slow,K.cls==='medium'?.22:K.cls==='soft'?.03:0)}
    return{slow,hits}};
  function knock(p,vx,vz,speed,who){const K=KINDS[p.kind],l=Math.hypot(vx,vz)||1,ux=vx/l,uz=vz/l,side=(Math.random()-.5)*1.2,k=Math.min(1.25,.75+speed/30)/Math.sqrt(K.mass+.2);
    p.state='flying';p.knocked++;p.by=who||null;p.vx=(ux+(-uz)*side*.6)*speed*k;p.vz=(uz+ux*side*.6)*speed*k;p.vy=Math.min(9,2+speed*.35)*(K.mass<.5?1:.6);
    p.spin=(Math.random()<.5?-1:1)*(6+speed*.6);p.ax=Math.random()*Math.PI;p.air=0;
    if(p.stackOn){p.stackOn.stack=1;p.stackOn=null}for(const q of S.list)if(q.stackOn===p){q.stackOn=null;q.stack=1;q.state='flying';q.vx=p.vx*.9;q.vz=p.vz*.9;q.vy=p.vy+1;q.spin=-p.spin;q.ax=Math.random()*3;q.air=0}
    if(S.onKnock)try{S.onKnock(p,speed,who)}catch(_){}}
  S.knock=knock;
  S.step=dt=>{for(const p of S.list){if(p.kind==='flare'&&p.lit){p.burn-=dt;if(p.burn<=0)p.lit=false;const u=p.mesh.userData;if(u.flame){u.flame.visible=p.lit;u.glow.visible=p.lit;if(p.lit){const f=.85+.3*Math.sin((p.t=(p.t||0)+dt)*31)*Math.sin(p.t*17);u.flame.scale.set(1,f,1);u.glow.material.opacity=1}}}
      if(p.state!=='flying')continue;p.air+=dt;p.vy-=20*dt;p.x+=p.vx*dt;p.z+=p.vz*dt;let y=p.mesh.position.y+p.vy*dt;const gy=a.groundAt?a.groundAt(p.x,p.z):0;
      if(a.collide&&p.air>.05){const q={x:p.x,z:p.z};a.collide(q,.15);if(q.x!==p.x||q.z!==p.z){p.vx*=-.35;p.vz*=-.35;p.x=q.x;p.z=q.z}}
      p.ax+=p.spin*dt;
      if(y<=gy){y=gy;if(Math.abs(p.vy)>2.2){p.vy*=-.32;p.vx*=.6;p.vz*=.6;p.spin*=.6}else{p.vy=0;p.vx*=Math.pow(.02,dt);p.vz*=Math.pow(.02,dt);p.spin*=Math.pow(.05,dt)}}
      p.mesh.position.set(p.x,y,p.z);
      const tip=Math.PI/2;/* lying on its side when it settles */
      if(Math.hypot(p.vx,p.vz)<.25&&y<=gy+.001&&Math.abs(p.vy)<.1){p.state='down';p.mesh.rotation.set(tip,p.yaw,p.ax%(Math.PI*2),'YXZ');p.mesh.position.y=gy+(p.kind==='cone'?.15:p.kind==='sawhorse'?.12:.05)}
      else p.mesh.rotation.set(p.ax,p.yaw+p.ax*.3,p.ax*.5)}};
  /* stand a knocked prop back up (picking it up and putting it down again does the same) */
  S.upright=p=>{p.state='placed';p.vx=p.vy=p.vz=0;place(p)};
  S.dispose=()=>{S.ghostOff();for(const p of S.list)if(p.mesh&&p.mesh.parent)p.mesh.parent.remove(p.mesh);for(const g of free)if(g.parent)g.parent.remove(g);free.clear();S.list.length=0;
    for(const g of R.geo)try{g.dispose()}catch(_){}for(const m of R.mat)try{m.dispose()}catch(_){}for(const t of R.tex)try{t.dispose()}catch(_){}R.geo.length=R.mat.length=R.tex.length=0};
  return S}

HT.Props={KINDS,create,wrap};
if(typeof module!=='undefined'&&module.exports)module.exports=HT.Props;
})(typeof window!=='undefined'?window:globalThis);
