/* =====================================================================
   EVERYBODY WAVES (SPEC3 2.20): the finale. Everyone you helped helps.
   The first Riverside Flats Street Festival is today, on Main St between 2nd and 4th. The Wholesaler (Act 3: the regional fence who
   bought the stolen-goods trade for three neighbourhoods; a businessman in a good coat) wants it to fail, because a street that
   throws a party is a street that calls the police on his trucks. Every stage is a short, sharper reprise of a job you already did:
     1 PLAN       (Good Fences)        the folding table at festival HQ: HT.Plan's crew-roles board, the whole cast to posts.
     2 TAIL       (Following Distance) his courier leaves with a radio. Bands, his mirror, and Earl's No. 9 shuttle as the swap car.
     3 ROOF       (Higher Ground, Hands Off) the Community Center roof, Doug's rifle with beanbags, four plants in the crowd forming
                  up for the parade. Tells through the scope; mark them for the crowd walker (E) or drop them (click), but never
                  with a child or your family within 25 m of the man: that is what makes it hard.
     4 ROADBLOCK  (Cone Zone)          the stolen stage truck comes up 3rd St. Hank's pickup full of cones, the carpool vans.
     5 DEFEND     (Heavy Lifting)      the stage goes back up while his crew push from Mill St. Carry the crates yourself.
                  Families on the porches: hands only within 25 m of them.
     6 CHASE      (Brake Check, Minivan Roundup) he runs. The crew's cars ride in convoy behind you (HT.Convoy when it is on
                  main, a breadcrumb follower until then); G calls the box.
     7 HANDS UP   a conversation, not a shoot-out. Malik hands you the zip-tie.
     8 FESTIVAL   the epilogue (js/jobs/_finale-fest.js): walk the street at dusk, everyone has a line about what you did in THEIR
                  job, Riverside trust goes to 100 block by block on screen, everybody waves, the credits roll over a slow drive
                  home with the family, and free roam comes back with festival bunting and everything open.
   Every stage is a [CP]. Gameplay time is the dt the hooks get. Files: js/jobs/finale.js (this: core, plan, tail),
   js/jobs/_finale-street.js (roof, roadblock, defend), js/jobs/_finale-end.js (chase, hands up), js/jobs/_finale-fest.js
   (festival, credits, post-game). Tests: node dev/jobs-check.js finale --retry --replay --shots; node dev/jobs/finale.js.
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api,G=()=>window.__ht;
const HTx=window.HT;
/* ---------------- the shared systems this job stands on, and its own helper files ---------------- */
const D=typeof document!=='undefined'?document:null;
function js(id,src,ok){if(!D||!D.head||ok()||D.getElementById(id))return;const s=D.createElement('script');s.id=id;s.src=src;D.head.appendChild(s)}
function css(id,href){if(!D||!D.head||D.getElementById(id))return;const l=D.createElement('link');l.id=id;l.rel='stylesheet';l.href=href;D.head.appendChild(l)}
if(D&&D.createElement){js('ht-tail-js','js/tail.js',()=>HTx.Tail&&HTx.Tail.create);js('ht-plan-js','js/crewplan.js',()=>HTx.Plan&&HTx.Plan._ver);css('ht-plan-css','css/plan.css');
  js('ht-convoy-js','js/convoy.js',()=>HTx.Convoy&&HTx.Convoy.create);/* HT.Convoy (Minivan Roundup's): the crew's cars in the chase */
  for(const f of['_finale-street','_finale-end','_finale-fest'])js('ht-'+f,'js/jobs/'+f+'.js',()=>false)}
const ID='finale';
/* cinematic moments (the wave, the credits): the HUD steps aside, the subtitles stay */
if(D&&D.head&&!D.getElementById('fin-style')){const st=D.createElement('style');st.id='fin-style';
  st.textContent='.ht-obj,.ht-cmp,.ht-me,.ht-wi,.ht-mm,.ht-hp,.ht-drv,.ht-wp,.ht-gd,.ht-trust,.ht-cash,.ht-keys,.ht-tag,.ht-pr,.ht-xh,.ht-crew,.ht-feed{transition:opacity .4s}'+
    'body.fin-cine .ht-obj,body.fin-cine .ht-cmp,body.fin-cine .ht-me,body.fin-cine .ht-wi,body.fin-cine .ht-mm,body.fin-cine .ht-hp,body.fin-cine .ht-drv,body.fin-cine .ht-wp,body.fin-cine .ht-gd,body.fin-cine .ht-trust,body.fin-cine .ht-cash,body.fin-cine .ht-keys,body.fin-cine .ht-tag,body.fin-cine .ht-pr,body.fin-cine .ht-xh,body.fin-cine .ht-crew,body.fin-cine .ht-feed{opacity:0!important}';D.head.appendChild(st)}
const cine=on=>{try{D.body.classList.toggle('fin-cine',!!on)}catch(_){}};
const FN=HTx.Finale=HTx.Finale||{stages:{}};
const hyp=Math.hypot,clamp=(v,a,b)=>v<a?a:v>b?b:v,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const yawTo=(dx,dz)=>Math.atan2(-dx,-dz)/* player and cars: forward=(-sin,-cos) */,cyaw=(dx,dz)=>Math.atan2(dx,dz)/* characters: root.rotation.y */;
const pick=a=>a[Math.floor(Math.random()*a.length)];
Object.assign(FN,{A,G,ID,hyp,clamp,wrap,yawTo,cyaw,pick,cine});
const TL=()=>HTx.Tail&&HTx.Tail.create?HTx.Tail:null,PL=()=>HTx.Plan&&HTx.Plan._ver?HTx.Plan:null,PP=()=>{const p=HTx.People;return p&&p.ok?p:null};
FN.TL=TL;FN.PL=PL;FN.PP=PP;

/* ================= the world, in metres (TILE 2; tile t -> metres 2t..2t+2). Riverside streets: =================
   Main St asphalt z 40-46 (x 304-448), Ash St z 68-74, Mill St z 96-102, Dock St z 124-130;
   River Rd x 312-318, 2nd St x 344-350, 3rd St x 376-382, 4th St x 408-414, 5th St x 440-446. */
const W={
  fest:{x0:351,x1:407,z0:40,z1:46},                 /* the festival: Main St between 2nd and 4th, closed to traffic */
  ring:{x:424,z:44.5},                              /* where you pull up: Main St in front of the Community Center */
  hq:{x:399.5,z:43.2},                              /* the folding table at the east end of the festival */
  stage:{x:357,z:43,w:9,d:6},                       /* the bandstand at the west end */
  porches:[{x:387,z:47.6},{x:393,z:47.6},{x:399,z:47.6},{x:405,z:47.6}],/* the 3rd-4th St rowhouse stoops on Main St's south side */
  courier:{x:411.5,z:28,yaw:Math.PI},               /* his gray sedan on 4th St, nose south */
  yard:{x:398,z:128.5},                             /* where the courier pulls up: Dock St by Warehouse Row */
  truck:{x:404,z:128.5},                            /* the festival's stage truck, stolen, on Dock St */
  shuttle:{x:311,z:84,yaw:Math.PI},                 /* Earl's No. 9 shuttle, River Rd, kerbside, nose south */
  ladder:{x:439.6,z:55},                            /* Community Center east wall */
  hank:{x:381.2,z:78.5,yaw:0},                      /* Hank's pickup, 3rd St just south of Ash, in the northbound lane, nose north */
  block:{xl:374.2,xr:383.8,z0:83,z1:97},            /* where a roadblock on 3rd St counts (the truck drives -z) */
  benny:{x:368.5,z:41.6,yaw:-Math.PI/2},            /* Benny's truck behind the stage (crates come off its back) */
  sedan:{x:410,z:97.5,yaw:-Math.PI/2}};             /* the Wholesaler's black sedan, Mill St at 4th, nose east */
FN.W=W;

/* ================= the cast ================= */
/* id -> People key (or role), display name, colour for lines. Never restyled: crew and family are their own models. */
const CAST={
  you:{name:'You'},gary:{key:'gary',name:'Gary'},rick:{key:'rick',name:'Coach Rick'},dave:{key:'dave',name:'Big Dave'},doug:{key:'doug',name:'Doug'},
  rosa:{key:'rosa',name:'Rosa'},earl:{key:'earl',name:'Earl'},dee:{key:'dee',name:'Pastor Dee'},benny:{key:'benny',name:'Benny'},
  hank:{key:'nb_pops',name:'Hank'},sal:{giver:'sal',name:'Sal'},barb:{key:'nb_gran',name:'Barb'},okafor:{key:'nb_office',name:'Ms. Okafor'},
  jen:{key:'wife',name:'Jen'},tyler:{key:'son',name:'Tyler'},maddie:{key:'daughter',name:'Maddie'},
  malik:{key:'nb_kid',name:'Malik',scale:.86},adeyemi:{key:'nb_marcus',name:'Mr. Adeyemi'},mrsA:{key:'nb_lucia',name:'Mrs. Adeyemi'},
  ferreira:{key:'nb_kenji',name:'Mr. Ferreira'},ramos:{key:'nb_mei',name:'Mrs. Ramos'},tre:{key:'thug_hoodie',name:'Tre'},dez:{key:'nb_teen',name:'Dez'},
  marcus:{key:'nb_sweater',name:'Marcus'},lyle:{key:'thug_cap',name:'Lyle'},
  wholesaler:{key:'boss',name:'The Wholesaler'},courier:{key:'thug_jacket',name:'Courier'}};
FN.CAST=CAST;
const NB=['nb_gran','nb_pops','nb_office','nb_sweater','nb_teen','nb_kenji','nb_marcus','nb_mei','nb_lucia'];
const STREET=['thug_hoodie','thug_track','thug_beanie','thug_red','thug_fro','thug_jacket','thug_brown','thug_cap','thug_f_hood','thug_f_leather'];
FN.NB=NB;FN.STREET=STREET;
/* every model the finale shows: preloaded as soon as the job is offered, and the job waits for them before any scene shows them */
const CAST_KEYS=['dad_gary','dad_rick','dad_dave','dad_doug','earl','dee','rosa','benny','wife','son','daughter','nb_kid','boss',...NB,...STREET];
let castP=null;
function preloadCast(){const pp=PP();if(!pp||!pp.preload)return null;if(castP)return castP;
  try{const R=pp.roles||{};if(!R.hank)R.hank='nb_pops';if(!R.okafor)R.okafor='nb_office';if(!R.barb)R.barb='nb_gran'}catch(_){}
  const want=CAST_KEYS.filter(k=>(pp.keys||[]).includes(k)&&!pp.has(k));castP=pp.preload(want).catch(()=>{});return castP}
function castReady(){const pp=PP();if(!pp)return true;return CAST_KEYS.every(k=>!(pp.keys||[]).includes(k)||pp.has(k))}
FN.preloadCast=preloadCast;FN.castReady=castReady;

/* ================= resources: everything this job makes, freed at the end ================= */
let RES=null;
function res(){return RES||(RES={geo:[],mat:[],tex:[],veh:[],cars:[],el:[],kmat:null,kmatE:null,people:[]})}
function freeRes(){const r=RES;RES=null;if(!r)return;const a=A();
  for(const c of r.cars)unregisterCar(c);for(const o of r.veh){try{o.parent&&o.parent.remove(o);o.userData&&o.userData.dispose&&o.userData.dispose()}catch(_){}}
  for(const g of r.geo)try{g.dispose()}catch(_){}for(const m of r.mat)try{m.dispose()}catch(_){}for(const t of r.tex)try{t.dispose()}catch(_){}
  for(const e of r.el)try{e.remove()}catch(_){}for(const p of r.people)try{p.d.root.parent&&p.d.root.parent.remove(p.d.root)}catch(_){}
  if(a&&a.P&&a.P.dude)a.P.dude.root.visible=true}
FN.res=res;FN.freeRes=freeRes;
/* one merged vertex-coloured mesh for a whole set of boxes (stalls, the stage, bunting poles): one draw call, one shared material */
function kit(store){const pos=[],col=[],nor=[],idx=[];let n=0;const T=A().THREE,c=new T.Color();
  const K={add(w,h,d,hex,x,y,z,ry,rx){c.set(hex).convertSRGBToLinear();const hw=w/2,hh=h/2,hd=d/2,cs=Math.cos(ry||0),sn=Math.sin(ry||0),cx=Math.cos(rx||0),sx=Math.sin(rx||0);
      const F=[[[1,0,0],[[hw,-hh,-hd],[hw,hh,-hd],[hw,hh,hd],[hw,-hh,hd]]],[[-1,0,0],[[-hw,-hh,hd],[-hw,hh,hd],[-hw,hh,-hd],[-hw,-hh,-hd]]],
        [[0,1,0],[[-hw,hh,-hd],[-hw,hh,hd],[hw,hh,hd],[hw,hh,-hd]]],[[0,-1,0],[[-hw,-hh,hd],[-hw,-hh,-hd],[hw,-hh,-hd],[hw,-hh,hd]]],
        [[0,0,1],[[hw,-hh,hd],[hw,hh,hd],[-hw,hh,hd],[-hw,-hh,hd]]],[[0,0,-1],[[-hw,-hh,-hd],[-hw,hh,-hd],[hw,hh,-hd],[hw,-hh,-hd]]]];
      const tr=v=>{let[X,Y,Z]=v;const y1=Y*cx-Z*sx,z1=Y*sx+Z*cx;Y=y1;Z=z1;return[X*cs+Z*sn,Y,-X*sn+Z*cs]};
      for(const[nv,vs]of F){const nn=tr(nv);for(const v of vs){const p=tr(v);pos.push(p[0]+x,p[1]+y,p[2]+z);nor.push(nn[0],nn[1],nn[2]);col.push(c.r,c.g,c.b)}idx.push(n,n+1,n+2,n,n+2,n+3);n+=4}return K},
    mesh(emissive){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);
      const R=store||res();if(emissive){if(!R.kmatE){R.kmatE=new T.MeshBasicMaterial({vertexColors:true,toneMapped:false});R.mat.push(R.kmatE)}}else if(!R.kmat){R.kmat=new T.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:0});R.mat.push(R.kmat)}
      R.geo.push(g);const m=new T.Mesh(g,emissive?R.kmatE:R.kmat);m.castShadow=!emissive;m.receiveShadow=!emissive;return m},get n(){return n}};return K}
FN.kit=kit;
/* a canvas sign on a board (banners, the HQ sign, the shuttle's "9") */
function sign(lines,o){o=o||{};const a=A(),T=a.THREE,cv=D.createElement('canvas');cv.width=o.pw||512;cv.height=o.ph||160;const g=cv.getContext('2d');
  g.fillStyle=o.bg||'#2f6b3f';g.fillRect(0,0,cv.width,cv.height);if(o.border!==false){g.strokeStyle=o.fg||'#f6f1e3';g.lineWidth=8;g.strokeRect(6,6,cv.width-12,cv.height-12)}
  g.fillStyle=o.fg||'#f6f1e3';g.textAlign='center';g.textBaseline='middle';const L=[].concat(lines);const fs=o.fs||Math.min(64,cv.height/(L.length+.6));g.font='800 '+fs+'px system-ui, sans-serif';
  L.forEach((t,i)=>g.fillText(t,cv.width/2,cv.height/2+(i-(L.length-1)/2)*fs*1.12,cv.width-24));
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace||tex.colorSpace;tex.anisotropy=4;const m=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false});const geo=new T.PlaneGeometry(o.w||2,(o.w||2)*cv.height/cv.width);
  const R=res();R.tex.push(tex);R.mat.push(m);R.geo.push(geo);return new T.Mesh(geo,m)}
FN.sign=sign;

/* ================= people ================= */
/* a character from the cast (or a neighbour key). Everyone is posed every frame by FN.people(); no hitboxes (neighbours have none) */
function person(id,x,z,o){o=o||{};const a=A(),pp=PP(),c=CAST[id]||{key:id};let d=null;
  try{if(c.giver)d=a.makeDude({giver:c.giver});else if(pp){const k=c.key||id;d=pp.make(k,{scale:o.scale||c.scale})}}catch(_){d=null}
  if(!d){try{d=a.makeDude(NB.includes(c.key)?{role:'neighbour',variant:c.key}:{shirt:'#7a8796',pants:'#2b2f36'})}catch(_){d=null}}if(!d)return null;
  try{a.equip(d,null)}catch(_){}if(d.meshes)d.meshes.length=0;
  const p={id,d,x,z,yaw:o.yaw||0,tx:null,tz:null,speed:0,mode:o.mode||'stand',moving:false,wave:0,waveT:0,talk:o.talk||null,name:c.name||o.name||'',tag:o.tag||null,hidden:false,ph:Math.random()*6,face:null};
  d.root.position.set(x,a.groundAt(x,z),z);d.root.rotation.y=p.yaw;a.wmAdd(d.root);res().people.push(p);(FN.live||(FN.live=[])).push(p);return p}
function unperson(p){if(!p)return;const r=res(),k=r.people.indexOf(p);if(k>=0)r.people.splice(k,1);const l=FN.live||[],j=l.indexOf(p);if(j>=0)l.splice(j,1);try{p.d.root.parent&&p.d.root.parent.remove(p.d.root)}catch(_){}}
/* walk toward (tx,tz) at speed; stand; face. Returns true when arrived */
function walkTo(p,x,z,sp){p.tx=x;p.tz=z;p.speed=sp||1.3}
function peopleTick(dt){const a=A(),l=FN.live||[];for(const p of l){if(!p.d||!p.d.root.parent)continue;let mv=false;
    if(p.tx!=null){const dx=p.tx-p.x,dz=p.tz-p.z,dd=hyp(dx,dz);if(dd>.15){const s=Math.min(dd,p.speed*dt);p.x+=dx/dd*s;p.z+=dz/dd*s;p.yaw=cyaw(dx,dz);mv=true}else{p.tx=null;if(p.arrive){const f=p.arrive;p.arrive=null;f(p)}}}
    if(!mv&&p.face){p.yaw=p.yaw+wrap(cyaw(p.face.x-p.x,p.face.z-p.z)-p.yaw)*Math.min(1,dt*4)}
    p.moving=mv;p.d.root.position.set(p.x,a.groundAt(p.x,p.z)+(p.y||0),p.z);p.d.root.rotation.y=p.yaw;p.d.root.visible=!p.hidden;
    if(p.waveT>0)p.waveT-=dt;try{a.pose(p.d,dt,{moving:mv,speed:mv?p.speed:0,mode:p.mode})}catch(_){}}}
/* the wave: the right arm up and over, on the People bones, after the animation mixer (the 'pose' hook) */
function waveTick(dt){const l=FN.live||[];const t=FN.t||0;for(const p of l){if(!(p.waveT>0)||!p.d||!p.d.rb)continue;const b=p.d.rb.bones;if(!b)continue;const k=Math.min(1,p.waveT*2,(FN.waveLen||2.2)-p.waveT+.4);
    const ua=b.Bip01_R_UpperArm,fa=b.Bip01_R_Forearm;if(ua){ua.rotation.z-=1.9*k;ua.rotation.x+=Math.sin((t+p.ph)*7)*.35*k}if(fa)fa.rotation.z-=.6*k}}
function wave(p,len){if(!p)return;p.waveT=len||2.2;FN.waveLen=len||2.2}
Object.assign(FN,{person,unperson,walkTo,wave});

/* ================= lines: our own queue onto the radio subtitles (never more than the game's 4-line queue; never blocks play) ================= */
function say(who,text,front){const M=A().M;if(!M||!M.fn)return;const q=M.fn.q,t=M.fn.t||0;if(front){q.unshift([who,text,t]);if(q.length>8)q.length=8}else q.push([who,text,t]);if(q.length>14)q.splice(1,q.length-14)}
function sayAll(list){for(const[w,t]of list)say(w,t)}
function lineTick(dt,M){const F=M.fn;F.qT-=dt;/* a line that waited 14 s is stale: the moment has passed */while(F.q.length>1&&(F.t-(F.q[0][2]||0))>14)F.q.shift();if(F.qT<=0&&F.q.length){const[w,t]=F.q.shift();const c=CAST[w];A().radio(w==='you'?'you':(c&&c.name)||w,t,true);F.qT=Math.max(2.2,t.length*.052)+.25}}
const once=(M,k)=>{const s=M.fn.said;if(s[k])return false;s[k]=1;return true};
Object.assign(FN,{say,sayAll,once,hush:M=>{if(M&&M.fn){M.fn.q.length=0;M.fn.qT=0}}});

/* ================= cars this job places (scripted or borrowable) ================= */
function car(type,color,x,z,yaw,o){o=o||{};const a=A();const obj=a.makeVehicle(type,color)||a.makeVanBox(color);a.wmAdd(obj);res().veh.push(obj);
  obj.position.set(x,a.groundAt(x,z),z);obj.rotation.set(0,yaw+Math.PI/2,0);
  const v={obj,type,x,z,yaw,spd:0,S:a.carSize({obj}),entry:null};if(o.drive){v.entry=a.registerCar(obj,x,z);if(v.entry){v.entry.yaw=yaw;v.entry.pos.set(x,0,z);v.entry.name=o.name||'Earl';v.entry.owner=o.owner||'crew';a.syncCar(v.entry);res().cars.push(v.entry)}}
  return v}
function placeCar(v,x,z,yaw,dt,steer){const a=A();v.x=x;v.z=z;v.yaw=yaw;v.obj.position.set(x,a.groundAt(x,z),z);v.obj.rotation.set(0,yaw+Math.PI/2,0);
  const Vh=HTx.Vehicles;if(Vh&&Vh.update&&dt)try{Vh.update(v.obj,{dt,speed:v.spd||0,steer:steer||0,braking:(v.spd||0)<.3})}catch(_){}}
function unregisterCar(e){const a=A(),L=a&&a.L;if(!L||!e)return;if(a.CV===e)try{a.exitCar()}catch(_){}
  const k=(L.cars||[]).indexOf(e);if(k>=0)L.cars.splice(k,1);if(e.col){const j=(L.colliders||[]).indexOf(e.col);if(j>=0)L.colliders.splice(j,1)}
  if(e.meshes&&L.solids){const s=new Set(e.meshes);L.solids=L.solids.filter(m=>!s.has(m))}}
Object.assign(FN,{car,placeCar,unregisterCar});
/* a road route through waypoints (right-hand lane, filleted corners), and a metre-by-metre check that it stays on road tiles */
function route(pts){const a=A(),Gr=a.roads();let out=[];for(let i=1;i<pts.length;i++){const r=Gr&&Gr.route(pts[i-1],pts[i]);const p=r&&r.points&&r.points.length?r.points:[pts[i-1],pts[i]];
    for(const q of p){const l=out[out.length-1];if(!l||hyp(l.x-q.x,l.z-q.z)>.4)out.push({x:q.x,z:q.z})}}return out}
const ROADCH=',=VlDps|!';
function routeClear(pts,ok){const a=A(),Wd=a.WORLD;const bad=[];for(let i=1;i<pts.length;i++){const p=pts[i-1],q=pts[i],l=hyp(q.x-p.x,q.z-p.z);
    for(let s=0;s<=l;s+=1){const x=p.x+(q.x-p.x)*s/l,z=p.z+(q.z-p.z)*s/l,ch=Wd.map[Math.floor(z/2)]&&Wd.map[Math.floor(z/2)][Math.floor(x/2)];if(!(ok||ROADCH).includes(ch))bad.push({x:+x.toFixed(1),z:+z.toFixed(1),ch})}}return bad}
/* a scripted car on a path: HT.Tail.Rail (accelerates, corners, keeps its gap); a plain follower if tail.js isn't in yet */
function rail(path,o){const Tl=TL();if(Tl&&Tl.Rail&&Tl.poly)return Tl.Rail(Tl.poly(path),Object.assign({max:11.5,acc:3.2,dec:6,corner:6,len:4.8,gap:7},o||{}));
  const P=polyOf(path);const R={P,s:o&&o.s||0,v:0,x:path[0].x,z:path[0].z,yaw:0,done:false,stops:[],holding:null,max:o&&o.max||11.5,
    place(s){R.s=s;const q=P.at(s);R.x=q.x;R.z=q.z;R.yaw=q.yaw},step(dt,c){c=c||{};const want=R.max*(c.speedMul==null?1:c.speedMul)+(c.speedAdd||0);R.v+=clamp(want-R.v,-6*dt,3.2*dt);R.s=Math.min(P.len,R.s+R.v*dt);R.place(R.s);if(R.s>=P.len-.01){R.done=true;R.v=0}}};R.place(R.s);return R}
function polyOf(pts){const Tl=TL();if(Tl&&Tl.poly)return Tl.poly(pts);const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+hyp(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z));
  const len=cum[cum.length-1];return{pts,cum,len,at(s){s=clamp(s,0,len);let i=1;while(i<cum.length-1&&cum[i]<s)i++;const p=pts[i-1],q=pts[i],t=(s-cum[i-1])/((cum[i]-cum[i-1])||1);return{x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t,yaw:yawTo(q.x-p.x,q.z-p.z),i}},
    project(x,z){let best=0,bd=1e9;for(let i=1;i<pts.length;i++){const p=pts[i-1],q=pts[i],dx=q.x-p.x,dz=q.z-p.z,l2=dx*dx+dz*dz||1,t=clamp(((x-p.x)*dx+(z-p.z)*dz)/l2,0,1),px=p.x+dx*t,pz=p.z+dz*t,d=hyp(x-px,z-pz);if(d<bd){bd=d;best=cum[i-1]+t*Math.sqrt(l2)}}return{s:best,d:bd}}}}
Object.assign(FN,{route,routeClear,rail,polyOf});

/* ================= the fade (driven by dt) ================= */
function fadeEl(){const r=res();if(r.fade)return r.fade;const d=D.createElement('div');d.className='fin-fade';d.style.cssText='position:fixed;inset:0;background:#07090c;pointer-events:none;opacity:0;z-index:3;display:flex;align-items:center;justify-content:center;color:#f4efe2;font:700 34px/1.2 var(--ui,system-ui,sans-serif);letter-spacing:.04em;text-shadow:0 2px 12px #000';
  D.body.appendChild(d);r.el.push(d);r.fade=d;return d}
/* fade out, call mid() at black, hold, fade in. txt: a title card while it's black */
function fade(M,mid,o){o=o||{};M.fn.fade={t:0,out:o.out||.6,hold:o.hold||.4,inT:o.inT||.7,mid,done:false,txt:o.txt||'',then:o.then||null}}
function fadeTick(dt,M){const f=M.fn.fade,el=fadeEl();if(!f){if(el.style.opacity!=='0')el.style.opacity='0';return false}f.t+=dt;const a=f.out,b=a+f.hold,c=b+f.inT;
  let op=f.t<a?f.t/a:f.t<b?1:Math.max(0,1-(f.t-b)/f.inT);el.style.opacity=String(op.toFixed(3));el.textContent=f.t>a*.6&&f.t<b+f.inT*.4?f.txt:'';
  if(!f.done&&f.t>=a){f.done=true;try{f.mid&&f.mid()}catch(e){console.error(e)}}if(f.t>=c){M.fn.fade=null;el.style.opacity='0';if(f.then)f.then()}return true}
FN.fade=fade;

/* ================= the plan: HT.Plan's board, the whole cast to posts ================= */
const ROLES=[
  {id:'swap',label:'Swap car',desc:'Waits in the No. 9 shuttle on the tail route',need:1},
  {id:'spotter',label:'Roof spotter',desc:'Next to you on the roof: reads the tells',need:1},
  {id:'walker',label:'Crowd walker',desc:'Walks the plants you mark out of the crowd',need:1},
  {id:'supply',label:'Supply run',desc:'Brings the roadblock: cones, sawhorses, flares',need:1},
  {id:'stage',label:'Stage crew',desc:'Puts the stage back up while you hold the street',need:1},
  {id:'porch',label:'Porch captain',desc:'Keeps the families calm on the stoops',need:1},
  {id:'box',label:'Box car',desc:'Drives the second car when he runs',need:1}];
const CREW=[{id:'gary',name:'Gary',color:'#9fe58a'},{id:'rick',name:'Coach Rick',color:'#ffb347'},{id:'dave',name:'Big Dave',color:'#ff8a7a'},{id:'doug',name:'Doug',color:'#8ac6ff'},
  {id:'rosa',name:'Rosa',color:'#6cc0b5'},{id:'earl',name:'Earl',color:'#a9b8d8'},{id:'dee',name:'Pastor Dee',color:'#c6a2f0'},{id:'benny',name:'Benny',color:'#f2a6c8'},{id:'hank',name:'Hank',color:'#e5c07b'}];
const APT={
  gary:{swap:1,spotter:2,walker:2,supply:3,stage:2,porch:2,box:1},rick:{swap:2,spotter:2,walker:1,supply:2,stage:2,porch:1,box:3},
  dave:{swap:1,spotter:1,walker:2,supply:2,stage:3,porch:2,box:2},doug:{swap:2,spotter:3,walker:1,supply:1,stage:1,porch:1,box:2},
  rosa:{swap:1,spotter:2,walker:2,supply:1,stage:1,porch:3,box:1},earl:{swap:3,spotter:1,walker:2,supply:1,stage:1,porch:2,box:2},
  dee:{swap:1,spotter:2,walker:3,supply:1,stage:1,porch:2,box:1},benny:{swap:2,spotter:1,walker:1,supply:2,stage:3,porch:1,box:3},
  hank:{swap:1,spotter:1,walker:1,supply:3,stage:2,porch:1,box:1}};
/* what each role does at 1, 2 and 3 stars (read by the stages) */
const EFFECTS={swap:[.35,.65,1],spotter:[1.7,1.15,.7],walker:[2.2,2.8,3.4],supply:[{t:60,saw:3,cone:6,flare:1},{t:70,saw:4,cone:8,flare:2},{t:80,saw:5,cone:10,flare:2}],
  stage:[.55,.72,.95],porch:[1.35,1,.7],box:[2.6,3.4,4.4]};
const PLAN_DEF={roles:ROLES,crew:CREW,apt:APT,effects:EFFECTS};
FN.PLAN_DEF=PLAN_DEF;
function perks(){const s=SV();return s&&s.perks?Object.assign({},s.perks):{}}
const SV=()=>{const a=A();return a&&a.SV?a.SV():null};FN.SV=SV;
/* who's on a role and how good they are at it: {id,name,stars,v} (defaults to the auto plan) */
function role(M,rid){const P_=PL(),st=M.fn.plan||{assign:{}};const cid=st.assign[rid];const ctx={perks:perks()};const stars=cid&&P_?P_.stars(PLAN_DEF,cid,rid,ctx):(cid?(APT[cid]||{})[rid]||1:1);
  const c=CREW.find(x=>x.id===cid);return{id:cid||null,name:c?c.name:'Nobody',stars,v:EFFECTS[rid][stars-1]}}
FN.role=role;
const FC={swap:["{n} in the shuttle: you swap, he forgets you. Mostly.","{n} in the shuttle: a swap helps. A bit.","{n} parks the shuttle with the hazards on. He'll sort of help."],
  spotter:["{n} reads a crowd like a box score: tells in under a second.","{n} spots the tells. Give it a beat.","{n} on the roof: you'll be doing most of the reading."],
  walker:["{n} can walk a man out of a crowd with one hand on his shoulder and a compliment.","{n} gets them out. Not fast, not slow.","{n} walks them out. Slowly. With a lot of apologising."],
  supply:["{n} brings every cone in the store and 80 seconds of head start.","{n} brings a good load. 70 seconds.","{n} brings what fits in the car. 60 seconds."],
  stage:["{n} has that stage up before the sound check.","{n} gets the stage up. You'll carry some crates.","{n} on the stage: bring crates. Lots of crates."],
  porch:["{n} on the stoops: nobody panics, nobody even spills.","{n} keeps the families calm.","{n} on the porches: people will get nervous fast."],
  box:["{n} in the box car: he'll be in the slot before you finish saying 'box'.","{n} gets into the slot. Give it a second.","{n} in the box car. Point. Repeat. Point again."]};
function forecast(state){const out=[],P_=PL();if(!P_)return out;const ctx={perks:perks()};
  for(const r of ROLES){const cid=state.assign&&state.assign[r.id];if(!cid){out.push({text:r.label+': nobody yet',tone:'warn'});continue}const s=P_.stars(PLAN_DEF,cid,r.id,ctx),c=CREW.find(x=>x.id===cid);
    out.push({text:FC[r.id][3-s].replace('{n}',c?c.name:cid),tone:s>=3?'good':s<=1?'warn':''})}
  const used=new Set(Object.values(state.assign||{}));const free=CREW.filter(c=>!used.has(c.id)).map(c=>c.name);if(free.length)out.push({text:'Street team (unassigned): '+free.join(', ')+'. They help wherever it gets loud.'});
  return out}
FN.forecast=forecast;

/* ================= the stage dispatcher ================= */
const ORDER=['plan','tail','roof','roadblock','defend','chase','handsup','festival'];
const LABELS={plan:'The plan',tail:'Tail the courier',roof:'The roof',roadblock:'Stop the stage truck',defend:'Hold the street',chase:'Box him in',handsup:'Hands up',festival:'The festival'};
FN.ORDER=ORDER;
function stageOf(M){return M.fn.stage}
/* move to the next stage: clear this one, mark the checkpoint (the snapshot is the world exactly as the next stage starts) */
function advance(M,next,o){const a=A(),F=M.fn;const cur=FN.stages[F.stage];if(cur&&cur.clear)try{cur.clear(M)}catch(e){console.error(e)}
  F.stage=next;F.built=null;F.sub={};if(!(o&&o.quiet))a.CP.mark(next);else M.stage=next}
FN.advance=advance;
function stats(M){return M.fn.st}
const ST0=()=>({wrong:0,smokes:0,beans:0,lethal:0,civHit:0,cuffs:0,downs:0,hurt:0,calmMin:100,tailSus:0,swapped:0,loudChase:0,boxT:0,block:'',truck:'',talk:[],tied:0,zipDad:0});

J.register(ID,{
  def:{giver:'family',giverName:'Everybody',giverLook:{shirt:'#f0c05a',pants:'#2f3a4a'},hood:'river',title:'Everybody Waves',
    role:'Everyone · The first Riverside Flats Street Festival',place:'Main St, Riverside Flats',
    lines:["Jen: \"Honey. There are eleven people in our kitchen. Earl brought a bus schedule. Benny brought a cooler. Hank brought two hundred zip-ties and says not to tell his wife.\"",
      "Dee: \"The first Riverside street festival is today. Everybody's coming. And I do mean everybody. Even the ones who used to stand outside the laundromat.\"",
      "Gary: \"The Wholesaler wants it to fail. Smoke bombs, our stage truck, a crew in the crowd. So: a plan. Posts for everyone. Then we stop him, without ruining a single funnel cake.\""],
    obj:'Run the festival: assign the whole cast to posts, tail his courier, watch the crowd from the roof, stop the stage truck, hold the street, box him in, and finish it with a conversation and a zip-tie.',
    crew:[],weapons:['pistol','beanbag'],from:{home:'family'},start:{x:W.ring.x,z:W.ring.z},site:null,
    unlock:{done:['gary','rick','dave','doug','earl','dee','rosa','benny','duke','taxi','hoa','mower','tail','crossing','tow','overwatch','pawn','moving','cargo','cones','talk','sabotage','brake','bike','arrest','heist','roundup'],
      trust:80,trustR:80},
    pay:2500,par:0,roam:true,order:5,winTrust:0,
    stages:ORDER,stageLabels:LABELS,failPolicy:'escalate',
    medals:['Finished','The Wholesaler zip-tied, by you','Zip-tied, and not one live round in the whole finale'],
    radio:[['dee',"Festival HQ is the folding table by 4th St. Everybody's there. Come assign us before Benny gives away all the ice cream."]],
    endLine:'Everybody waves.'},
  start(M,o){freeRes();FN.live=[];FN.t=0;const cp=o&&o.checkpoint;preloadCast();
    M.fn={stage:'plan',built:null,sub:{},q:[],qT:0,said:{},st:ST0(),plan:(PL()&&PL().load(ID))||null,seen:seen(),waitT:0,fade:null,t:0};M.noCars=false;M.score=0;
    const a=A();a.wmSetWindow(a.wmWindow(380,70,58));
    if(!cp)say('dee',"Festival HQ is the folding table at the east end. Walk over and press E. Everyone's waiting on you, no pressure.")},
  upd(dt,M,F){const a=A(),fn=M.fn;if(!fn)return;fn.t+=dt;FN.t=fn.t;lineTick(dt,M);const fading=fadeTick(dt,M);
    if(!castReady()&&!fn.castOk&&fn.waitT<20){fn.waitT+=dt;preloadCast();F.objs.push(['Everybody is on their way to the festival…',false]);return}fn.castOk=true;
    const S=FN.stages[fn.stage];if(!S){F.objs.push(['Loading the festival…',false]);return}
    if(fn.built!==fn.stage){fn.built=fn.stage;fn.sub={};M.stage=fn.stage;FN.clearPressed();try{S.build(M)}catch(e){console.error('[finale] build '+fn.stage,e)}}
    peopleTick(dt);if(FN.timerTick)FN.timerTick(dt,M);S.upd(dt,M,F,fading);fn.objs=F.objs.map(o=>o[0])},
  pose(dt){waveTick(dt)},
  save(M){const f=M.fn;return{stage:f.stage,plan:f.plan?{assign:Object.assign({},f.plan.assign)}:null,st:f.st,seen:f.seen,x:f.carry||null}},
  load(M,s){if(!s||!M.fn)return;const f=M.fn;f.stage=s.stage||'plan';f.built=null;if(s.plan)f.plan={assign:Object.assign({},s.plan.assign),entry:null};f.st=Object.assign(ST0(),s.st||{});f.seen=Object.assign(f.seen||{},s.seen||{});f.carry=s.x||null},
  payout(M,ok){if(!ok)return[];const s=M.fn.st,out=[];const home=!s.smokes&&!s.downs&&!s.civHit;if(home)out.push(['Everyone home',500]);out.push(['Hands up · The Wholesaler zip-tied',1000]);
    if(s.cuffs)out.push(['Second chances at the festival ×'+s.cuffs,0]);if(s.wrong)out.push(['Wrong calls ×'+s.wrong+' (Dee apologised for you)',0]);return out},
  medal(M){const s=M.fn.st;M.score=Math.max(0,100-s.wrong*5-s.smokes*15-s.civHit*20);return s.tied?(M.kills||s.lethal?2:3):1},
  end(M,ok){if(!ok)return;try{FN.storyEnd&&FN.storyEnd(M)}catch(e){console.error(e)}},
  camera(dt){const M=A().M;if(!M||!M.fn||M.state!=='go')return undefined;const S=FN.stages[M.fn.stage];if(S&&S.camera){const r=S.camera(dt,M);return r?true:undefined}return undefined},
  fire(){const M=A().M;if(!M||!M.fn)return undefined;const S=FN.stages[M.fn.stage];if(S&&S.fire){const r=S.fire(M);return r?true:undefined}return undefined},
  vehicle(car,dt){const M=A().M;if(!M||!M.fn)return;const S=FN.stages[M.fn.stage];if(S&&S.vehicle)S.vehicle(car,dt,M)},
  hud(st){const M=A().M;if(!M||!M.fn)return;const S=FN.stages[M.fn.stage];if(S&&S.hud)S.hud(st,M)},
  home(id,active){if(id==='family'&&!active){preloadCast()}return undefined},
  test:{give(a){/* the whole campaign done, both meters past 80: what the gate asks for */const s=a.SV();if(s){s.world.bridgeOpen=true;s.flags.act2Intro=true;s.prog=s.prog||{}}
      try{const H=G();H.prog.trust=Math.max(H.prog.trust,82);H.prog.trustR=Math.max(H.prog.trustR||0,82);H.prog.act=3}catch(_){}preloadCast()},
    step:(a,t,o)=>FN.bot?FN.bot(a,t,o):null,cpNode:false}
});
/* first viewings (long scenes are skippable once you've seen them): kept in SAVE.jobs.finale.plan.seen */
function seen(){const s=SV();const r=s&&s.jobs&&s.jobs[ID];const p=r&&r.plan;return Object.assign({},p&&p.seen||{})}
function markSeen(M,k){M.fn.seen[k]=true;const s=SV();if(!s||!HTx.Save||!HTx.Save.jobRec)return;const r=HTx.Save.jobRec(s,ID);if(!r.plan||typeof r.plan!=='object')r.plan={};r.plan.seen=Object.assign({},r.plan.seen||{},{[k]:true});try{HTx.Save.touch&&HTx.Save.touch('jobs')}catch(_){}}
FN.markSeen=markSeen;
/* free everything when the job is no longer running (won, lost, abandoned): a system hud handler, like the other jobs' safety nets */
J.on('hud',()=>{const a=A();if(!a)return;const M=a.M;const keep=M&&M.def&&M.def.id===ID&&a.mode==='mission';
  if(!keep&&RES){try{FN.offStage&&FN.offStage(M)}catch(_){}freeRes();FN.live=[]}});
/* single key presses for job actions (Z zoom, G the box, X): caught on keydown so a quick tap between two frames is never missed */
const PRESSED=new Set();if(D)addEventListener('keydown',e=>{if(e.repeat)return;const a=A();if(!a||!a.M||!a.M.fn||a.M.state!=='go')return;if(HTx.Menus&&HTx.Menus.isOpen&&HTx.Menus.isOpen())return;PRESSED.add((e.key||'').toLowerCase())});
FN.press=k=>PRESSED.add(k);FN.pressed=k=>{if(PRESSED.has(k)){PRESSED.delete(k);return true}return false};FN.clearPressed=()=>PRESSED.clear();
/* the old built-in ending (index.html finale(): a "One month later" card when the nine original jobs are done, whose "New Saturday"
   wipes the campaign) predates this job: with the festival as the ending, it never shows (its own "Keep driving" flag) */
function retireOld(){const s=SV();if(s&&s.flags&&!s.flags.finale2&&s.jobs&&Object.keys(s.jobs).length)s.flags.finale2=true}FN.retireOld=retireOld;
J.on('hud',retireOld);J.on('home',()=>{retireOld();return undefined});
/* the scripted player for dev/jobs-check.js: each stage has its own (S.bot). o.fail: play well until the roadblock, then build nothing */
FN.bot=function(a,t,o){const M=a.M;if(!M||!M.fn||M.state!=='go')return null;const S=FN.stages[M.fn.stage];if(!S||!S.bot||M.fn.built!==M.fn.stage||M.fn.fade)return null;
  const B=M.fn.bot||(M.fn.bot={});if(B.stage!==M.fn.stage){B.stage=M.fn.stage;B.t0=t;B.s={}}return S.bot(a,t-B.t0,o||{},M,B.s)};


/* ===================================================================== STAGE 1: THE PLAN ===================================================================== */
FN.stages.plan={
  build(M){const a=A(),F=M.fn;FN.festSet(M,0);
    /* everyone around the table */
    const around=[['gary',-1.6,-1.3],['rick',-.4,-1.6],['dave',.9,-1.5],['doug',2,-1],['rosa',-2.1,.4],['earl',-1.5,1.5],['dee',-.2,1.8],['benny',1.1,1.7],['hank',2.3,.8]];
    F.sub.cast=around.map(([id,dx,dz])=>{const p=person(id,W.hq.x+dx,W.hq.z+dz);if(p)p.face={x:W.hq.x,z:W.hq.z};return p}).filter(Boolean);
    const T=a.THREE,g=new T.Group();const k=kit();k.add(2.2,.06,.9,'#e9e4d6',0,.76,0).add(.05,.74,.05,'#9aa0a6',-1,.37,-.38).add(.05,.74,.05,'#9aa0a6',1,.37,-.38).add(.05,.74,.05,'#9aa0a6',-1,.37,.38).add(.05,.74,.05,'#9aa0a6',1,.37,.38)
      .add(.5,.02,.34,'#f4f1ea',-.4,.8,.05).add(.36,.12,.24,'#3a6ea5',.6,.85,-.1).add(.1,.2,.1,'#d94f3d',.15,.89,.2);g.add(k.mesh());
    const s=sign(['FESTIVAL HQ'],{bg:'#2b5d8a',w:1.4,ph:120});s.position.set(0,1.6,-.42);g.add(s);const pole=kit().add(.05,1.7,.05,'#9aa0a6',.68,.85,-.42).add(.05,1.7,.05,'#9aa0a6',-.68,.85,-.42).mesh();g.add(pole);
    g.position.set(W.hq.x,a.groundAt(W.hq.x,W.hq.z),W.hq.z);a.wmAdd(g);F.sub.table=g;
    if(!F.plan)F.plan=PL()?PL().auto(PLAN_DEF,{perks:perks()}):{assign:{swap:'earl',spotter:'doug',walker:'dee',supply:'hank',stage:'benny',porch:'rosa',box:'rick'}};
    if(once(M,'plan0'))sayAll([['earl',"I asked the transit authority for the old No. 9 bus for one day. They said no. Then they said I could have the shuttle van. Then they said 'who is this'."],['benny',"I brought the truck. I brought extra cones. Not the traffic kind."]])},
  upd(dt,M,F){const a=A(),fn=M.fn,P=a.P;const d=hyp(P.pos.x-W.hq.x,P.pos.z-W.hq.z);
    if(fn.sub.board){F.objs.push(['Posts: 1-7 pick a role, then 1-9 a person · Enter: go · Esc: close',false]);return}
    F.objs.push(['Walk to the folding table at Festival HQ and press E to assign posts',false]);F.objs.push(['Everyone you helped is here. Who does what?',false]);
    F.target={x:W.hq.x,z:W.hq.z+1.2,label:'Festival HQ'};
    F.taps.push({x:W.hq.x,z:W.hq.z+.9,r:2.6,txt:'Assign posts at the folding table',fn:()=>openBoard(M)});
    if(d<9&&once(M,'hq'))sayAll([['gary',"Seven posts. Nine of us. Every choice has a consequence. I made a spreadsheet of the consequences."],['dee',"Gary, honey, let them pick."]])},
  clear(M){const F=M.fn;if(F.sub.board){try{F.sub.board.close(true)}catch(_){}F.sub.board=null}}};
function openBoard(M){const P_=PL(),F=M.fn;if(!P_){say('gary',"Hold on, the board's still loading. It's a big board.");return}
  const h=P_.open({def:PLAN_DEF,state:F.plan,ctx:{perks:perks()},kicker:'Everybody Waves · Festival HQ',title:'Posts for everyone',
    you:"You: the courier's tail, the roof, the roadblock, the street, the chase and the last word.",
    intel:[{label:'Festival opens at noon',ok:true},{label:'Smoke bombs: four, somewhere',ok:false},{label:'Our stage truck: stolen',ok:false},{label:'Hank: two hundred zip-ties',ok:true}],
    forecast:s=>forecast(s),goLabel:"Let's go",backLabel:'Not yet',
    onChange:s=>{F.plan=s},
    onGo:s=>{F.plan=s;F.sub.board=null;const sn=seen();try{P_.save(ID,s)}catch(_){}if(Object.keys(sn).length)for(const k in sn)markSeen(M,k);planDone(M)},
    onBack:()=>{F.sub.board=null}});
  F.sub.board=h;return h}
FN.openBoard=openBoard;
function planDone(M){const r=k=>role(M,k);const sp=r('spotter'),sw=r('swap'),su=r('supply');
  sayAll([['you',"Okay. "+sw.name+" in the shuttle, "+sp.name+" on the roof with me, "+su.name+" on supplies. Everybody else: be nice to people."],
    ['dee',"There he is. Gray windbreaker, by the lemonade. He just took a call and he's walking to 4th St."],['doug',"The courier. With a radio. Follow him. Not too close. Not too far. You know this."]]);
  advance(M,'tail')}

/* ===================================================================== STAGE 2: TAIL THE COURIER ===================================================================== */
/* his route: 4th St south to Ash, west to River Rd, south to Mill, east to 5th, south to Dock, west to the yard */
const TAIL_WP=[{x:W.courier.x,z:W.courier.z},{x:410,z:71},{x:315,z:71},{x:315,z:99},{x:443,z:99},{x:443,z:127},{x:W.yard.x,z:W.yard.z}];
FN.TAIL_WP=TAIL_WP;
const TK={wait:10,max:9.5,watch:4,watchR:[18,85],lostD:150,spookFail:2.5};
FN.stages.tail={
  build(M){const a=A(),F=M.fn,S=F.sub;FN.festSet(M,0);
    const path=route(TAIL_WP);S.P=polyOf(path);S.path=path;
    S.sed=car('sedan','#8f969c',W.courier.x,W.courier.z,W.courier.yaw);S.rail=rail(path,{max:TK.max,len:S.sed.S.l,gap:6});S.rail.place(0);
    S.courier=person('courier',W.courier.x-2.2,W.courier.z+3.5);if(S.courier){S.courier.d.root.visible=true;walkTo(S.courier,W.courier.x-1.1,W.courier.z,1.6);S.courier.arrive=p=>{p.hidden=true;S.inCar=true}}
    /* Earl's No. 9 shuttle: a borrowable van on River Rd (E to swap into it) */
    const sw=role(M,'swap');S.shuttle=car('workvan','#e3a32a',W.shuttle.x,W.shuttle.z,W.shuttle.yaw,{drive:true,name:sw.name.replace(/^(Coach|Pastor|Big) /,'')});
    const nine=sign(['No. 9'],{bg:'#1d3557',fg:'#ffd23f',w:.9,pw:256,ph:110});nine.position.set(0,1.85,0);nine.rotation.y=Math.PI/2;S.shuttle.obj.add(nine);
    S.driver=person(sw.id||'earl',W.shuttle.x-1.9,W.shuttle.z-1.2);if(S.driver)S.driver.face={x:W.shuttle.x+4,z:W.shuttle.z};
    S.truck=car('workvan','#d8d2c4',W.truck.x,W.truck.z,-Math.PI/2);const ts=sign(['STAGE & SOUND · RIVERSIDE FESTIVAL'],{bg:'#f2efe6',fg:'#2b5d8a',w:2.6,ph:80});ts.position.set(0,1.75,1.03);S.truck.obj.add(ts);
    const Tl=TL();S.T=Tl?Tl.create({bands:{close:14,ideal:[14,60],losing:105,lost:TK.lostD},lostT:12}):null;S.watch=0;S.losT=0;S.t=0;
    if(once(M,'tail0'))say('doug',"Reminder: ideal band is 14 to 60 metres. Inside 14 he sees your face. Past 105 you're just a guy driving.")},
  upd(dt,M,F){const a=A(),S=M.fn.sub,r=S.rail,p=playerCar();S.t+=dt;
    /* the sedan waits for its driver, then drives */
    if(S.t>TK.wait&&!r.done)r.step(dt,{});const t={x:r.x,z:r.z,yaw:r.yaw,spd:r.v,stopped:r.v<.5};placeCar(S.sed,r.x,r.z,r.yaw,dt);
    if(S.inCar&&S.courier){unperson(S.courier);S.courier=null}
    if(!p){F.objs.push(['Get in the minivan and follow the gray sedan',false]);F.target={x:a.VAN.pos.x,z:a.VAN.pos.z,label:'Minivan'};if(S.t>TK.wait+25)return tailFail(M,'lost',"He drove off while you were still on the sidewalk.");if(S.t>TK.wait+2)tailMeter(M,F,null);return}
    const d=hyp(t.x-p.x,t.z-p.z);let R=null;
    if(S.T&&S.t>TK.wait){if((S.losT-=dt)<=0){S.losT=.1;const Tl=TL(),grid={map:a.WORLD.map,block:a.WORLD.losblock||'#htVcTfrxA',tile:2};S.los=Tl.los(t.x,t.z,p.x,p.z,{grid})}
      R=S.T.tick(dt,{t,p,carId:p.id,carType:p.type,los:S.los,sight:S.los});if(S.t-TK.wait<10)S.T.S.lose=Math.max(0,(S.T.S.lose||0)-dt*2.2);M.fn.st.tailSus=Math.max(M.fn.st.tailSus,R.sus|0)}
    else if(S.t>TK.wait)R={band:d<14?'close':d<60?'ideal':d<105?'losing':'lost',d,sus:0};
    tailMeter(M,F,R);
    if(R&&R.spooked)return tailFail(M,'spooked',"He saw the minivan in his mirror one time too many. He's gone, and so is the radio.");
    if(R&&R.lost||d>TK.lostD+30)return tailFail(M,'lost',"You lost him. Somewhere a gray sedan is laughing at you.");
    /* the swap: E next to the No. 9 shuttle (the game's own "Borrow" prompt on foot, or ours from the driver's seat) */
    const sh=S.shuttle.entry;if(sh&&a.CV&&a.CV!==sh&&!S.swapped){const ds=hyp(a.CV.pos.x-sh.pos.x,a.CV.pos.z-sh.pos.z);if(ds<9&&Math.abs((a.CV.car||a.CV).spd||0)<3)F.taps.push({d:ds,r:9,txt:'Swap into the No. 9 shuttle',fn:()=>swapNow(M)})}
    if(a.CV===sh&&!S.swapped)swapNow(M,true);
    if(!S.swapped&&r.s>S.P.project(W.shuttle.x,W.shuttle.z).s-120&&once(M,'swapHint'))say(role(M,'swap').id||'earl',"Shuttle's on River Rd, hazards on. Pull up beside it and press E. I'll take the minivan home. Slowly. With love.");
    if(!r.done){F.objs.push(['Tail the gray sedan · stay 14-60 m back, out of his mirror',false]);F.objs.push([S.swapped?'Swapped into the No. 9 shuttle':'Optional: swap into the No. 9 shuttle on River Rd (E beside it)',S.swapped]);F.target={x:t.x,z:t.z,label:'Gray sedan'};
      if(r.s>S.P.len*.45&&once(M,'mid'))sayAll([['doug',"He's doing a loop. Classic. That's how you know he's a professional, or lost."]]);return}
    /* he's parked at the yard: watch the handoff, stopped, at a respectful distance */
    F.objs.push(['He parked on Dock St. Stop 18-85 m away and watch the handoff',false]);F.target={x:t.x,z:t.z,label:'The handoff'};
    const still=Math.abs((a.CV.car||a.CV).spd||0)<1,okD=d>TK.watchR[0]&&d<TK.watchR[1];if(still&&okD)S.watch+=dt;else S.watch=Math.max(0,S.watch-dt*.5);
    F.meters.push({id:'watch',label:'Watching',v:S.watch,max:TK.watch,style:'bar',icon:'eye',sub:!okD?(d<=TK.watchR[0]?'too close':'too far'):still?'hold still':'stop the car'});
    if(S.watch>=TK.watch&&!S.done){S.done=true;sayAll([['you',"He's handing the radio to a guy in a truck. That's... that's OUR stage truck. It says 'Riverside Festival' on it."],
        ['doug',"Hawk to everybody. Our truck, his yard. Hold on. Dee says there are men in the crowd with backpacks. Get on the Community Center roof. I've got the rifle and the beanbags."],['you',"You said 'Hawk'."],['doug',"I did not."]]);
      M.fn.st.swapped=S.swapped?1:0;advance(M,'roof')}},
  clear(M){const S=M.fn.sub;if(S.courier)unperson(S.courier);if(S.driver)unperson(S.driver)}};
function playerCar(){const a=A(),e=a.CV;if(!e)return null;return{x:e.pos.x,z:e.pos.z,yaw:e.yaw,spd:e.car?e.car.spd:e.spd||0,type:e===a.VAN?'minivan':e.type,id:e===a.VAN?'van':(e.name||'car')+':'+e.type,e}}
FN.playerCar=playerCar;
function tailMeter(M,F,R){if(!R){F.meters.push({id:'band',label:'Following',v:200,max:200,style:'bands',zones:[[0,14,'bad','Too close'],[14,60,'good','Ideal'],[60,105,'warn','Losing him'],[105,200,'bad','Lost']],sub:'get in a car'});return}
  F.meters.push({id:'band',label:'Following',v:Math.min(200,R.d),max:200,style:'bands',zones:[[0,14,'bad','Too close'],[14,60,'good','Ideal'],[60,105,'warn','Losing him'],[105,200,'bad','Lost']],sub:Math.round(R.d)+' m'});
  F.meters.push({id:'sus',label:'His mirror',v:R.sus||0,max:100,style:'ring',icon:'eye'})}
function swapNow(M,already){const a=A(),S=M.fn.sub,sh=S.shuttle.entry;if(S.swapped||!sh)return;S.swapped=true;if(!already){try{a.exitCar();a.enterCar(sh);a.M.car=a.M.car}catch(_){}}
  const k=role(M,'swap').v;if(S.T){try{S.T.swap('shuttle9','workvan',false)}catch(_){}S.T.S.sus=Math.max(0,(S.T.S.sus||0)*(1-k));S.T.S.lose=0}
  /* the swap driver takes the minivan back to the festival */
  if(S.driver){unperson(S.driver);S.driver=null}const V=a.VAN;V.pos.set(W.ring.x+6,0,W.ring.z);V.yaw=-Math.PI/2;if(V.car)V.car.spd=0;try{G().syncVan&&G().syncVan()}catch(_){}
  say(role(M,'swap').id||'earl',k>=1?"Shuttle's yours. To him you're a brand new car. A brand new, very yellow car.":"Shuttle's yours. He might remember the yellow. Hang back a little.");a.feed('Swapped into the No. 9 shuttle','info',k>=1?'his mirror forgets you':'his mirror forgets a little')}
function tailFail(M,why,line){M.loseWhy='tail:'+why;A().endMission(false,line,why==='spooked'?'He made you.':'You lost him.')}

/* ===================================================================== festival props (shared by every stage) ===================================================================== */
/* level 0: setting up (barriers, a few stalls); 1: stalls up, stage frame; 2: the stage built; 3: the evening (string lights, everything) */
FN.festSet=function(M,level){const F=M.fn;if(F.festL===level&&F.fest&&F.fest.parent)return;if(F.fest){try{F.fest.parent&&F.fest.parent.remove(F.fest)}catch(_){}}
  const a=A(),T=a.THREE,g=new T.Group(),k=kit(),f=W.fest;
  /* barriers at both ends (sawhorses in festival blue) */
  for(const x of[f.x0-1.2,f.x1+1.4])for(let z=f.z0+.8;z<f.z1;z+=1.9){k.add(1.6,.12,.08,'#2b5d8a',x,.95,z,Math.PI/2).add(1.6,.1,.08,'#f4f1ea',x,.65,z,Math.PI/2).add(.06,1,.5,'#9aa0a6',x,.5,z-.7).add(.06,1,.5,'#9aa0a6',x,.5,z+.7)}
  /* stalls: canopies along both kerbs */
  const cols=['#d94f3d','#f2b53a','#3a8fd9','#5fb35f','#e07bb5','#f08a3a','#7a6ad9'];let i=0;
  const stall=(x,z,face)=>{const c=cols[i++%cols.length];k.add(2.6,.06,2,c,x,2.35,z).add(2.66,.25,.04,c,x,2.2,z+face*1.0).add(.05,2.3,.05,'#c9ccd0',x-1.25,1.15,z-.95).add(.05,2.3,.05,'#c9ccd0',x+1.25,1.15,z-.95).add(.05,2.3,.05,'#c9ccd0',x-1.25,1.15,z+.95).add(.05,2.3,.05,'#c9ccd0',x+1.25,1.15,z+.95)
    .add(2.2,.75,.6,'#efe9dc',x,.38,z+face*.55).add(2.24,.05,.64,c,x,.78,z+face*.55);if(level>=1)k.add(.3,.2,.25,'#f4d38a',x-.6,.88,z+face*.5).add(.25,.25,.25,'#d9a15c',x+.4,.9,z+face*.55)};
  const xs=level>=1?[365,371,377,383,389,395]:[371,383,395];for(const x of xs){stall(x,f.z0+1.05,1);stall(x+2,f.z1-1.05,-1)}
  /* the bandstand: a frame at level 1, a deck with a backdrop from level 2 */
  const s=W.stage;if(level>=1){k.add(s.w,.08,s.d,'#6b4f3a',s.x,.06,s.z);for(const dx of[-1,1])for(const dz of[-1,1])k.add(.14,3.4,.14,'#454a50',s.x+dx*(s.w/2-.2),1.7,s.z+dz*(s.d/2-.2))}
  if(level>=2){k.add(s.w,.9,s.d,'#5a4232',s.x,.45,s.z).add(s.w+.1,.06,s.d+.1,'#7a5a44',s.x,.92,s.z).add(.3,2.6,s.d,'#2b5d8a',s.x-s.w/2+.2,2.2,s.z).add(s.w,.25,.3,'#2b2e33',s.x,3.45,s.z-s.d/2+.1).add(s.w,.25,.3,'#2b2e33',s.x,3.45,s.z+s.d/2-.1)
    .add(.7,1.1,.6,'#1e2024',s.x-s.w/2+1,1.45,s.z-s.d/2+.6).add(.7,1.1,.6,'#1e2024',s.x-s.w/2+1,1.45,s.z+s.d/2-.6).add(.04,1.2,.04,'#30343a',s.x+1.8,1.5,s.z).add(.9,.35,.6,'#f2efe6',s.x-1,1.1,s.z+1.6)
    .add(1.2,.6,.03,'#f4f1ea',s.x+3,1.3,s.z-s.d/2-.05);for(let z=s.z-s.d/2+.4;z<s.z+s.d/2;z+=.6)k.add(.4,.25,.55,'#6b4f3a',s.x+s.w/2+.25,.13+(.0),z)}
  const m=k.mesh();g.add(m);
  if(level>=2){const b=sign(['RIVERSIDE FLATS','STREET FESTIVAL'],{bg:'#2b5d8a',fg:'#ffd23f',w:4.8,ph:200});b.position.set(s.x-s.w/2+.36,2.5,s.z);b.rotation.y=Math.PI/2;g.add(b)}
  /* the banner over the street at 4th St (from the start: it's the festival's front door) */
  {const pk=kit().add(.12,5.4,.12,'#8a8f96',f.x1+.4,2.7,f.z0-.6).add(.12,5.4,.12,'#8a8f96',f.x1+.4,2.7,f.z1+.6).mesh();g.add(pk);const b=sign(['RIVERSIDE FLATS STREET FESTIVAL · TODAY · EVERYBODY WELCOME'],{bg:'#f2efe6',fg:'#2b5d8a',w:7.2,pw:1024,ph:100});b.position.set(f.x1+.4,4.7,(f.z0+f.z1)/2);b.rotation.y=Math.PI/2;g.add(b)}
  /* bunting from level 1; string lights at level 3 (emissive bulbs in one mesh) */
  if(level>=1)g.add(FN.bunting(f.x0,f.x1,f.z0-.2,f.z1+.2,4.7,level>=3));
  g.position.set(0,0,0);a.wmAdd(g);F.fest=g;F.festL=level};
/* bunting and string lights zig-zagging across the street: flags in one mesh, bulbs in another */
FN.bunting=function(x0,x1,z0,z1,y,lights,store){const a=A(),T=a.THREE,g=new T.Group(),k=kit(store),kb=kit(store),cols=['#d94f3d','#f2b53a','#3a8fd9','#5fb35f','#f4f1ea','#e07bb5'];let n=0;
  for(let x=x0;x<=x1;x+=8){const xa=x,xb=Math.min(x1,x+8);k.add(.1,y+.2,.1,'#8a8f96',xa,(y+.2)/2,z0-.4).add(.1,y+.2,.1,'#8a8f96',xa,(y+.2)/2,z1+.4);
    for(let i=0;i<=14;i++){const t=i/14,zz=z0+(z1-z0)*t,xx=xa+(xb-xa)*t,sag=Math.sin(t*Math.PI)*.7;k.add(.24,.27,.02,cols[n++%cols.length],xx,y-sag-.16,zz,Math.atan2(xb-xa,z1-z0)+Math.PI/2,0);
      if(lights)kb.add(.11,.13,.11,i%2?'#ffe9a8':'#fff2c9',xx+.3,y-sag-.05,zz)}}
  g.add(k.mesh());if(lights&&kb.n)g.add(kb.mesh(true));return g};
/* the plan and tail bots (the other stages carry their own) */
FN.stages.plan.bot=(a,t,o,M,B)=>{const P=a.P;if(a.CV){a.exitCar();return}if(!B.at){P.pos.set(W.hq.x,0,W.hq.z+1.6);a.collide(P.pos,.35);B.at=1;return}
  if(!M.fn.sub.board&&t%15===5){a.useTap=true;return}if(M.fn.sub.board&&t%15===10)M.fn.sub.board.key('Enter')};
FN.stages.tail.bot=(a,t,o,M,B)=>{const S=M.fn.sub,r=S.rail,P=a.P;
  if(!a.CV){const V=a.VAN;P.pos.set(V.pos.x+2.4,0,V.pos.z);a.collide(P.pos,.35);if(t%6===3)a.enterCar(V);return}
  const e=a.CV,c=e.car||e;let k;
  const back=34;if(!r.done&&r.s<back){c.spd=0;return}if(r.done){/* stop 40 m behind his car on his route */k=S.P.at(Math.max(0,S.P.len-40))}else k=S.P.at(Math.max(0,r.s-back))
  /* swap into the shuttle when he passes it */
  if(!S.swapped&&!o.noswap&&S.shuttle.entry){const sh=S.shuttle.entry;const ds=S.P.project(sh.pos.x,sh.pos.z).s;if(r.s>ds+10&&r.s<ds+120){a.exitCar();P.pos.set(sh.pos.x+2.2,0,sh.pos.z);a.enterCar(sh);return}}
  e.pos.set(k.x,0,k.z);e.yaw=k.yaw;c.spd=r.done?0:r.v;if(c!==e)c.x=k.x,c.z=k.z;a.syncCar(e)};
})();
