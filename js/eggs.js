/* High Trust · HT.Eggs — small things your dad finds around town (docs/base.md, "Easter eggs")
 * Seven of them, each findable and in the wholesome-dad register. Found ones are kept in SAVE.base.eggs and listed in the pause
 * menu under "Things your dad found" (unfound ones show as ??? with a hint).
 *   gnome   a perfectly ordinary lawn gnome, on a different Maple Heights lawn every day (E to look at it)
 *   lights  the one house whose Christmas lights are still up, with a slowly deflating snowman (E at its front walk)
 *   phone   a pay phone at the Fill-Er-Up that rings when you walk by; it's always a wrong number (E to answer)
 *   smoker  the smoker behind Barracks B at Fort Sensible: it is always exactly 225°F (E)
 *   honk    honk "shave and a haircut" in any car (five taps of H, then wait): somebody answers "two bits"
 *   mug     the glovebox in Walt's car (G in any borrowed car checks the glovebox)
 *   bigfoot a cardboard Bigfoot on the range's backstop berm: hit it
 * Hooks: HT.Jobs 'pose' (per frame), HT.Base.on('interact') (E prompts), keydown H/G (horn rhythm, glovebox).
 */
(function(){'use strict';
const HT=window.HT=window.HT||{};
const Eggs={};HT.Eggs=Eggs;
const J=()=>HT.Jobs;const A=()=>HT.Jobs&&HT.Jobs.api;const B=()=>HT.Base;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const LIST=[
  {id:'gnome',name:'The Gnome',hint:'Somebody\'s lawn, somewhere on Maple. A different one tomorrow.',found:'A perfectly ordinary lawn gnome. It was on a different lawn yesterday. Gnomes don\'t move.'},
  {id:'lights',name:'Still Up',hint:'One house never took its Christmas lights down.',found:'The Kowalskis\' Christmas lights. They say they\'re "up for next year already". Efficient.'},
  {id:'phone',name:'Wrong Number',hint:'Something rings at the gas station.',found:'The pay phone at the Fill-Er-Up. It is always for somebody else.'},
  {id:'smoker',name:'225',hint:'Something smells great behind the barracks at Fort Sensible.',found:'The smoker behind Barracks B. It is always exactly 225°F. Nobody knows who feeds it.'},
  {id:'honk',name:'Two Bits',hint:'Shave and a haircut...',found:'Honked "shave and a haircut" and somebody answered "two bits". Community.'},
  {id:'mug',name:'World\'s Okayest Dad',hint:'Check the glovebox in Walt\'s car.',found:'A mug in Walt\'s glovebox: WORLD\'S OKAYEST DAD. You took it. Walt will understand.'},
  {id:'bigfoot',name:'Proof',hint:'Something watches the range from the top of the far berm. Bring something with reach.',found:'You hit a cardboard Bigfoot at a hundred meters. Nobody will believe you.'}];
Eggs.LIST=LIST;
const S={L:null,root:null,parts:{},simT:0,ring:0,ringOn:false,honks:[],honkT:0,said:{},taught:{}};Eggs.S=S;
function sv(){try{const s=A().SV();if(s&&s.base&&!s.base.eggs)s.base.eggs={};return s&&s.base}catch(_){return null}}
function has(id){const s=sv();return !!(s&&s.eggs&&s.eggs[id])}
function find(id,line){const s=sv();if(!s||s.eggs[id])return;const day=(()=>{try{return A().SV().day||1}catch(_){return 1}})();s.eggs[id]={day};try{A().save()}catch(_){}
  const e=LIST.find(q=>q.id===id),n=LIST.filter(q=>s.eggs[q.id]).length;try{A().HUD.banner&&A().HUD.banner({kind:'trust',kicker:'Things your dad found · '+n+'/'+LIST.length,title:e.name.toUpperCase(),sub:e.found,dur:3.6})}catch(_){try{A().feed('Found: '+e.name,'trust',n+'/'+LIST.length)}catch(__){}}
  try{HT.Audio.tone({f:660,to:990,type:'triangle',d:.18,gain:.1,bus:'ui'});HT.Audio.tone({f:990,to:1320,type:'triangle',d:.22,gain:.08,bus:'ui',at:.16})}catch(_){}}
Eggs.list=()=>{const s=sv();return LIST.map(e=>({id:e.id,name:e.name,hint:e.hint,text:e.found,found:!!(s&&s.eggs&&s.eggs[e.id])}))};
Eggs.find=find;
const say=(who,t,front)=>{try{A().radio(who,t,front)}catch(_){}};
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
const MT={};function mt(k,o){return MT[k]||(MT[k]=new THREE.MeshStandardMaterial(o))}

/* ================= the props ================= */
function merged(parts){/* [geometry, matrix, colour] -> one vertex-coloured mesh */const g=new (HT.World.GB)();for(const[geo,m,c]of parts){g.addGeo(geo,m,1,(()=>{const k=lin(c);return[k.r,k.g,k.b]})());geo.dispose()}
  const mesh=new THREE.Mesh(g.geo(),mt('eggv',{vertexColors:true,roughness:.7}));mesh.castShadow=true;mesh.receiveShadow=true;return mesh}
const M4=(x,y,z,ry=0,rx=0,rz=0,s=1,sy,sz)=>{const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.set(s,sy==null?s:sy,sz==null?s:sz);o.updateMatrix();return o.matrix};
function gnomeMesh(){const T=THREE;return merged([[new T.CylinderGeometry(.11,.14,.22,10),M4(0,.11,0),'#2f5f9e'],[new T.SphereGeometry(.085,10,8),M4(0,.27,0),'#f0c9a0'],
  [new T.ConeGeometry(.1,.2,10),M4(0,.2,.05,0,-1.3),'#f4f2ea'],[new T.ConeGeometry(.095,.26,10),M4(0,.44,0,0,.15),'#c8312c'],[new T.SphereGeometry(.03,6,5),M4(0,.27,.085),'#e8a07a'],
  [new T.BoxGeometry(.06,.05,.09),M4(-.05,.025,.03),'#3a2a1a'],[new T.BoxGeometry(.06,.05,.09),M4(.05,.025,.03),'#3a2a1a'],[new T.CylinderGeometry(.02,.02,.14,6),M4(.1,.18,.03,0,0,.5),'#8a6a45']])}
function snowman(){const T=THREE;return merged([[new T.SphereGeometry(.55,14,10),M4(0,.5,0,0,0,0,1,.8),'#f4f6f8'],[new T.SphereGeometry(.4,14,10),M4(.08,1.05,0,0,0,-.25,1,.8),'#f4f6f8'],
  [new T.SphereGeometry(.28,14,10),M4(.22,1.45,0,0,0,-.5,1,.75),'#f4f6f8'],[new T.ConeGeometry(.05,.22,8),M4(.25,1.45,.27,0,1.5),'#ff8a2a'],[new T.CylinderGeometry(.2,.22,.25,12),M4(.3,1.7,0,0,0,-.55),'#1d1d1d'],
  [new T.TorusGeometry(.3,.06,6,14),M4(.12,1.24,0,0,Math.PI/2,-.35),'#c8312c']])}
function phoneMesh(){const T=THREE;return merged([[new T.BoxGeometry(.12,1.9,.12),M4(0,.95,0),'#5f6670'],[new T.BoxGeometry(.6,.85,.32),M4(0,1.45,.12),'#9aa3ab'],[new T.BoxGeometry(.5,.62,.04),M4(0,1.5,.29),'#2a2d31'],
  [new T.BoxGeometry(.1,.3,.08),M4(-.2,1.5,.33),'#1d1d1d'],[new T.BoxGeometry(.66,.14,.38),M4(0,1.94,.12),'#2f6fb5'],[new T.BoxGeometry(.18,.18,.04),M4(.08,1.38,.31),'#c9cdd1']])}
function smokerMesh(){const T=THREE;return merged([[new T.CylinderGeometry(.42,.42,1.3,16),M4(0,.95,0,0,0,Math.PI/2),'#1e1f21'],[new T.CylinderGeometry(.3,.3,.7,14),M4(.75,1.25,0),'#1e1f21'],
  [new T.CylinderGeometry(.06,.06,.9,8),M4(.75,1.9,0),'#2a2b2d'],[new T.BoxGeometry(.06,.6,.06),M4(-.5,.3,-.3),'#2a2b2d'],[new T.BoxGeometry(.06,.6,.06),M4(-.5,.3,.3),'#2a2b2d'],[new T.BoxGeometry(.06,.6,.06),M4(.5,.3,-.3),'#2a2b2d'],
  [new T.BoxGeometry(.06,.6,.06),M4(.5,.3,.3),'#2a2b2d'],[new T.CylinderGeometry(.07,.07,.02,12),M4(0,1.38,.36,0,Math.PI/2),'#e8e2d0'],[new T.BoxGeometry(.5,.05,.04),M4(0,1.05,.44),'#8a6a45'],
  /* a folding lawn chair beside it */[new T.BoxGeometry(.55,.05,.5),M4(-1.4,.45,.2),'#2c7a45'],[new T.BoxGeometry(.55,.6,.05),M4(-1.4,.75,-.05,0,-.25),'#2c7a45'],[new T.BoxGeometry(.04,.45,.04),M4(-1.65,.22,.4),'#c9c9c4'],[new T.BoxGeometry(.04,.45,.04),M4(-1.15,.22,.4),'#c9c9c4']])}
function bigfootTex(){const c=document.createElement('canvas');c.width=128;c.height=256;const x=c.getContext('2d');x.clearRect(0,0,128,256);x.fillStyle='#5b3a22';
  x.beginPath();x.ellipse(64,70,30,34,0,0,6.283);x.fill();x.beginPath();x.moveTo(30,90);x.quadraticCurveTo(10,170,40,250);x.lineTo(88,250);x.quadraticCurveTo(118,170,98,90);x.closePath();x.fill();
  x.beginPath();x.moveTo(36,110);x.quadraticCurveTo(0,140,14,200);x.lineTo(28,198);x.quadraticCurveTo(26,150,46,130);x.fill();x.beginPath();x.moveTo(92,110);x.quadraticCurveTo(128,100,120,60);x.lineTo(108,58);x.quadraticCurveTo(110,96,86,104);x.fill();
  x.fillStyle='#d9b48a';x.beginPath();x.ellipse(64,76,16,18,0,0,6.283);x.fill();x.fillStyle='#1d1d1d';x.beginPath();x.arc(57,72,2.5,0,6.283);x.arc(71,72,2.5,0,6.283);x.fill();
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t}

/* where things are (metres); the gnome's lawn depends on the in-game day */
function gnomeSpot(a){const def=a.WORLD;const hp=(def.housePorches||[]).filter(p=>p.hood==='maple');if(!hp.length)return null;let day=1;try{day=a.SV().day||1}catch(_){}
  const p=hp[(day*7+3)%hp.length];return{x:p.x+2.2,z:p.z+p.face[1]*2.4,yaw:Math.atan2(p.face[0],p.face[1]),day}}
function lightsHouse(a){const def=a.WORLD;let best=null,bd=1e9;for(const h of def.houses){if(h.home)continue;const d=Math.hypot(h.cx-112,h.cz-60);if(d<bd){bd=d;best=h}}return best}
const PHONE={x:244.6,z:35.2,yaw:0},SMOKER_OFF={dx:4.5,dz:5.4};

function build(a){const T=THREE,root=new T.Group();root.name='eggs';S.root=root;S.L=a.L;S.parts={};const d=B()&&B().def();
  /* the gnome */
  {const g=gnomeMesh();g.scale.setScalar(1.15);root.add(g);S.parts.gnome={mesh:g}}
  /* the Christmas lights: a string of bulbs along the front eave and the porch rail, and a sad inflatable snowman */
  {const h=lightsHouse(a);if(h){const front=h.face==='s'?(h.z1+1)*2-.05:h.z0*2+.05,nz=h.face==='s'?1:-1,x0=h.x0*2+.4,x1=(h.x1+1)*2-.4,n=Math.floor((x1-x0)/.42);
      const geo=new T.SphereGeometry(.07,6,5),cols=['#ff3b30','#34c759','#ffcc00','#0a84ff','#ff9f0a'];const im=new T.InstancedMesh(geo,new T.MeshBasicMaterial({toneMapped:false}),n*2);const m4=new T.Matrix4(),c=new T.Color();
      for(let r=0;r<2;r++)for(let i=0;i<n;i++){const x=x0+i*(x1-x0)/(n-1),sag=Math.sin(((i%6)/6)*Math.PI)*.12;m4.makeTranslation(x,(r?1.05:2.85)-sag,front+nz*(r?.9:.35));im.setMatrixAt(r*n+i,m4);
        c.set(cols[(i+r*2)%cols.length]).convertSRGBToLinear().multiplyScalar(2.4);im.setColorAt(r*n+i,c)}im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;root.add(im);
      const wire=new T.Mesh(new T.BoxGeometry(x1-x0,.015,.015),mt('wire',{color:lin('#1f3a1f')}));wire.position.set((x0+x1)/2,2.88,front+nz*.35);root.add(wire);
      const sm=snowman();sm.position.set(x1-1.2,0,front+nz*3.2);sm.rotation.y=nz>0?0:Math.PI;root.add(sm);S.parts.lights={im,sm,x:(x0+x1)/2,z:front+nz*3,front,nz,house:h}}}
  /* the pay phone at the Fill-Er-Up */
  {const m=phoneMesh();m.position.set(PHONE.x,0,PHONE.z);m.rotation.y=PHONE.yaw;root.add(m);S.parts.phone={mesh:m}}
  /* the smoker behind Barracks B */
  if(d){const b=d.bld.barracks2,x=b.x1+SMOKER_OFF.dx,z=b.z0+SMOKER_OFF.dz;const m=smokerMesh();m.position.set(x,0,z);m.rotation.y=-Math.PI/2;root.add(m);S.parts.smoker={mesh:m,x,z}}
  /* Bigfoot on the backstop berm, 100 m out (a hit mesh in L.solids, like the range targets) */
  if(d){const R=d.range;const m=new T.Mesh(new T.PlaneGeometry(.55,1.1),new T.MeshStandardMaterial({map:bigfootTex(),transparent:true,alphaTest:.4,side:T.DoubleSide,roughness:.9}));
    m.position.set(d.bld.bermW.x1-.8,5.15,R.lanes[1]+1.3);m.rotation.y=Math.PI/2;root.add(m);m.userData.onShot=hit=>{find('bigfoot');S.parts.bigfoot.down=6;try{HT.FX&&HT.FX.impact(hit.point,new THREE.Vector3(1,0,0),'wood',{decal:false})}catch(_){}return true};S.parts.bigfoot={mesh:m,down:0}}
  a.L.group.add(root)}

/* ================= per frame ================= */
function tick(){const a=A();if(!a||!a.L||!a.L.ow||!a.WORLD||!HT.World||!HT.World.GB)return;if(S.L!==a.L||!S.root)build(a);if(S.root.parent!==a.L.group)a.L.group.add(S.root);
  const dt=Math.min(.1,Math.max(0,a.simT-S.simT));S.simT=a.simT;
  const bf=S.parts.bigfoot;if(bf){if(!a.L.solids.includes(bf.mesh)){a.L.solids.push(bf.mesh);try{a.rebuildTargets()}catch(_){}}if(bf.down>0){bf.down-=dt;bf.mesh.rotation.z=-1.4}else bf.mesh.rotation.z=0}
  if(a.mode!=='hub'||!dt)return;const P=a.P,px=P.pos.x,pz=P.pos.z;
  /* the gnome moves overnight (on day change) */
  const gs=gnomeSpot(a);if(gs&&S.parts.gnome){const g=S.parts.gnome.mesh;if(S.gday!==gs.day){S.gday=gs.day;g.position.set(gs.x,0,gs.z);g.rotation.y=gs.yaw;S.gnomeSaid=false}}
  /* the snowman breathes out, slowly */
  const lt=S.parts.lights;if(lt){const k=.88+.12*Math.sin(a.simT*.35);lt.sm.scale.set(1,k,1);lt.sm.rotation.z=(1-k)*.8;const blink=Math.floor(a.simT*1.5)%2;lt.im.visible=true;if(lt.im.material)lt.im.material.color.setScalar(blink?1:.8)}
  /* the pay phone rings while you are near, until you pick it up (and again next time you come by) */
  const dp=Math.hypot(px-PHONE.x,pz-PHONE.z);if(dp<16&&!a.CV&&!S.answered){S.ring-=dt;if(S.ring<=0){S.ring=2.6;ringSound(dp)}}if(dp>30)S.answered=false;}
function ringSound(d){try{const g=Math.max(.02,.12-d*.006);for(let i=0;i<10;i++)HT.Audio.tone({f:i%2?1180:1320,type:'square',d:.045,gain:g,at:i*.05});for(let i=0;i<10;i++)HT.Audio.tone({f:i%2?1180:1320,type:'square',d:.045,gain:g,at:.6+i*.05})}catch(_){}}
const CALLS=["Is this Pizza Palace? ...Then why did you answer like that?","Hi, is your refrigerator running? ...Mine too. Okay, bye.","Is Gary there? ...Which Gary? ...I'll call back.",
  "Hello, this is a courtesy call about your car's extended warranty. ...It's a minivan? Never mind. God bless.","Mom? ...Sorry. You have a very mom voice.","Is this the hardware store? Do you have three-quarter-inch... hello?"];

/* ================= E prompts ================= */
function interact(prompt){const a=A();if(!a||a.mode!=='hub'||a.CV||prompt)return null;const P=a.P,px=P.pos.x,pz=P.pos.z;
  const g=S.parts.gnome&&S.parts.gnome.mesh;if(g&&Math.hypot(px-g.position.x,pz-g.position.z)<2.2)return{txt:'Look at the gnome',fn:()=>{say('you',has('gnome')?pick(["It moved. Gnomes don't move. It moved.","Same gnome. Different lawn. I'm not crazy.","Hi, little guy. Who drove you here?"]):"Huh. A lawn gnome. Perfectly ordinary. Nothing weird about it.",true);find('gnome')}};
  const lt=S.parts.lights;if(lt&&Math.hypot(px-lt.x,pz-lt.z)<4)return{txt:'Admire the Christmas lights',fn:()=>{say('Mrs. Kowalski',pick(["They're up for next year already. Saves time.","We leave them up. Dave says it's a 'lifestyle'.","Every year we say we'll take them down. Every year it's next year."]),true);find('lights')}};
  if(Math.hypot(px-PHONE.x,pz-PHONE.z)<2.2)return{txt:S.answered?'Pick up the pay phone':'Answer the pay phone',fn:()=>{S.answered=true;say('Caller',pick(CALLS),true);setTimeout(()=>say('you',pick(["Wrong number. It's always a wrong number.","...I'm going to start answering 'Pizza Palace'."])),2600);find('phone')}};
  const sm=S.parts.smoker;if(sm&&Math.hypot(px-sm.x,pz-sm.z)<2.6)return{txt:'Check the smoker',fn:()=>{say('you',pick(["225. Exactly 225. It's always 225.","Two-two-five. I didn't touch anything. Nobody touches anything.","225 degrees. Brisket's coming along. Whose brisket? Doesn't matter. Coming along."]),true);find('smoker')}};
  return null}

/* ================= horn rhythm and the glovebox (keys the game passes through while driving) ================= */
const GLOVE=["Napkins from 2009.","A tire gauge, a single sock and an emergency granola bar from two presidents ago.","Thirty-eight ketchup packets. Organized.","The car's manual, still in the plastic.","A map of a state they don't live in.","Sunglasses. Somebody's been looking for these."];
addEventListener('keydown',e=>{const a=A();if(!a||a.mode!=='hub'||!a.CV||e.repeat)return;const k=e.key.toLowerCase(),c=a.CV;
  if(k==='h'&&c.type!=='jet'){const t=performance.now()/1000;S.honks=S.honks.filter(x=>t-x<2.4);S.honks.push(t);clearTimeout(S.honkTO);
    S.honkTO=setTimeout(()=>{const n=S.honks.length;if(n===5){/* shave and a haircut... */setTimeout(()=>{try{HT.Audio.tone({f:440,type:'square',d:.18,gain:.05});HT.Audio.tone({f:330,type:'square',d:.3,gain:.05,at:.32})}catch(_){}say(pick(['Phil','Marcy','Ted','Gil','Bev']),'*honk honk* ...Two bits!',true);find('honk')},500)}S.honks=[]},900)}
  if(k==='g'&&c.owner==='neighbour'&&Math.abs(c.spd)<1){if(/walt/i.test(c.name||'')){say('you',has('mug')?"Just the mug's dust outline now. Sorry, Walt.":"A mug. 'WORLD'S OKAYEST DAD'. ...I'm keeping this.",true);find('mug')}else say('you',pick(GLOVE),true)}});
/* the first borrowed car teaches the glovebox */
function teachGlove(a){const c=a.CV;if(!c||c.owner!=='neighbour'||S.taught.glove)return;const s=sv();const m=s?(s.taught||(s.taught={})):S.taught;if(m.glove)return;m.glove=1;S.taught.glove=1;try{a.feed('G · check the glovebox (parked)','info')}catch(_){}}

function hook(){const Jb=J(),Bs=B();if(!Jb||!Jb.on||!Bs||!Bs.on){setTimeout(hook,50);return}
  Jb.on('pose',()=>{try{tick();const a=A();if(a&&a.CV)teachGlove(a)}catch(err){if(!S.err){S.err=1;console.warn('[eggs]',err)}}});Bs.on('interact',p=>interact(p))}
hook();
Eggs.spots=()=>{const a=A();const gs=gnomeSpot(a);const lt=S.parts.lights,sm=S.parts.smoker,bf=S.parts.bigfoot;
  return{gnome:gs,lights:lt?{x:lt.x,z:lt.z}:null,phone:PHONE,smoker:sm?{x:sm.x,z:sm.z}:null,bigfoot:bf?(()=>{const v=new THREE.Vector3();bf.mesh.getWorldPosition(v);return{x:v.x,y:v.y,z:v.z}})():null}};
})();
