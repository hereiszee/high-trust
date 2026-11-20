/* =====================================================================
   PORCH LIGHT (SPEC3 2.22): a repeatable package guard, and the wave-0 smoke test of the whole job path:
   laptop giver -> brief -> drive -> stages ([CP] 'deliveries', 'pirates') -> checkpoint retry -> result -> payout -> save -> fridge replay.
   The Dadazon truck drops parcels on 4 porches on a Maple street. Porch pirates come for them. Set up the lawn chair somewhere
   sensible: a seated dad scares off anyone heading for a porch within 12 m (6 m standing). Catch the ones who get a parcel
   before they're 40 m away (run into them: they give up), zip-tie them, and carry the parcel back. 3 parcels lost = fail.
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
const TRUCK_SPEED=7,PIRATES=3,SEAT_R=12,STAND_R=6,LOST_D=40;
const LINES={deter:["That dad's in a lawn chair. Facing the street. With a lemonade. Abort.","Nope. Lawn chair guy. Lawn chair guys see everything.","He waved at me. Why did he wave. I'm out."],
  grab:["Thanks for shopping!","Free shipping, baby!","Mine now!"],give:["Okay okay okay. It's a nose hair trimmer. I don't even want it.","I do cardio! ...I don't do cardio."],
  ret:["Ma'am, your package. It's a... 'Turbo Nose Hair Trimmer.'","Your parcel, sir. Sorry, it's been through a lot.","Signed, sealed, re-delivered."],thanks:["Please don't tell anyone.","Oh! You're the Watch now? Thank you!","You are a saint. A sweaty saint."]};
const pick=a=>a[Math.floor(Math.random()*a.length)];
/* the delivery street: the 4 Maple houses nearest the home house (not ours), porch points on their street side */
let STREET=null;
function street(){if(STREET)return STREET;const a=A(),W=a&&a.WORLD,T=2;if(!W||!W.houses)return null;
  const home=W.houses.find(h=>h.home)||W.houses[0];const regionOK=h=>!W.hoods||!a.roads||true;
  const cand=W.houses.filter(h=>!h.home&&h.face&&Math.hypot(h.cx-home.cx,h.cz-home.cz)>8&&Math.hypot(h.cx-home.cx,h.cz-home.cz)<90).sort((p,q)=>Math.hypot(p.cx-home.cx,p.cz-home.cz)-Math.hypot(q.cx-home.cx,q.cz-home.cz));
  const sameFace=cand.filter(h=>h.face===cand[0].face&&Math.abs((h.face==='s'?h.z1:h.z0)-(cand[0].face==='s'?cand[0].z1:cand[0].z0))<=1).slice(0,4);
  const hs=(sameFace.length>=4?sameFace:cand.slice(0,4)).sort((p,q)=>p.cx-q.cx);
  const porches=hs.map((h,k)=>{const s=h.face==='s'?1:-1,z=(s>0?(h.z1+1)*T:h.z0*T)+s*1.1;return{k,x:h.cx,z,hx:h.cx,hz:h.cz,face:s}});
  const cx=porches.reduce((s,p)=>s+p.x,0)/porches.length,cz=porches.reduce((s,p)=>s+p.z,0)/porches.length,s0=porches[0].face;
  STREET={porches,cx,cz,road:{x:cx,z:cz+s0*7},face:s0};return STREET}
/* props */
function parcel(){const a=A(),g=new a.THREE.Group();const b=a.box(.46,.3,.36,'#b8874f',0,.15,0,g);a.box(.47,.035,.08,'#d9c9a0',0,.3,0,g);a.box(.2,.004,.14,'#f4f1ea',.08,.302,.09,g);
  a.box(.06,.004,.06,'#f0a020',-.14,.302,.11,g);return g}
function lawnChair(){const a=A(),g=new a.THREE.Group(),al='#c8ccd0';
  for(const s of[-1,1]){a.box(.03,.03,.62,al,s*.27,.36,0,g);a.box(.03,.42,.03,al,s*.27,.18,.28,g);a.box(.03,.42,.03,al,s*.27,.18,-.24,g);const back=a.box(.03,.62,.03,al,s*.27,.62,.34,g);back.rotation.x=-.25;a.box(.03,.03,.36,al,s*.27,.58,-.02,g)}
  for(let i=0;i<5;i++){a.box(.54,.012,.07,i%2?'#2f8f5a':'#f4f1ea',0,.37,-.24+i*.12,g)}
  for(let i=0;i<5;i++){const w=a.box(.54,.07,.012,i%2?'#2f8f5a':'#f4f1ea',0,.46+i*.1,.36+i*.026,g);w.rotation.x=-.25}
  const cup=new a.THREE.Mesh(new a.THREE.CylinderGeometry(.04,.035,.12,10),a.mat('#f2e35a'));cup.position.set(.33,.42,-.1);g.add(cup);return g}
function truckModel(){const a=A();const o=a.makeVehicle('workvan','#2e4a6b')||a.makeVanBox('#2e4a6b');a.wmAdd(o);return o}
J.register('porch',{
  def:{giver:'dadazon',giverName:'Dadazon Tracking',giverLook:{shirt:'#f0a020',pants:'#2a2a2a',cap:'#f0a020'},hood:'maple',title:'Porch Light',
    role:'Dadazon · Out for delivery: 4 packages on Maple',place:'Your street, Maple Heights',
    lines:["OUT FOR DELIVERY: 4 packages on Maple. Estimated arrival: between 9:00 am and the heat death of the universe.",
      "Doug's group chat says the porch pirate is back. Gray hoodie. Fast. Has a tote bag.",
      "Set up a lawn chair where you can see the porches. A dad in a lawn chair is the most powerful deterrent known to science."],
    obj:'Guard 4 porches while the truck delivers. Catch any porch pirate before he gets 40 m away, then put the parcel back.',
    crew:[],weapons:['pistol','beanbag'],from:{home:'laptop'},
    get start(){const s=street();return s?{x:s.road.x,z:s.road.z}:null},
    unlock:{done:['gary']},/* SPEC3 3.3 gates it behind done.hoa (wave 2); the smoke test opens after the first job so it can be played now */
    repeatable:true,pay:50,par:0,winTrust:0,roam:true,order:90,
    stages:['deliveries','pirates'],stageLabels:{deliveries:'The deliveries',pirates:'The pirates'},failPolicy:'escalate',
    medals:['Finished','No parcel lost','No parcel lost, every pirate caught or scared off, nobody hurt'],
    radio:[['you',"Okay. Lawn chair's in the back. Lemonade's in the cupholder. Let's watch some porches."]],
    endLine:"The street's parcels are where they belong. Somebody on Maple has a Turbo Nose Hair Trimmer and a secret."},
  start(M,o){const a=A(),S=street();M.noCars=false;M.porches=S.porches.map(p=>({k:p.k,x:p.x,z:p.z,state:'wait',mesh:null}));M.lost=0;M.saved=0;M.caught=0;M.deterred=0;M.hurt=0;M.pir=[];M.spawned=0;M.spawnT=6;
    a.wmSetWindow(a.wmWindow(S.cx,S.cz,26));
    /* the lawn chair rides in the back of your car until you grab it */
    const c=M.car,ch=lawnChair();a.wmAdd(ch);const r={x:Math.cos(c.yaw),z:-Math.sin(c.yaw)},f={x:-Math.sin(c.yaw),z:-Math.cos(c.yaw)};
    const q=a.wmSnap(c.pos.x-f.x*3.2,c.pos.z-f.z*3.2);ch.position.set(q.x,0,q.z);ch.rotation.y=c.yaw;M.chair={mesh:ch,x:q.x,z:q.z,placed:false,held:false};
    /* the delivery truck drives the street and stops at each porch */
    const pts=[];const ln=S.porches.map(p=>({x:p.x,z:p.z+S.face*6}));const L0={x:ln[0].x-26,z:ln[0].z},L1={x:ln[ln.length-1].x+26,z:ln[ln.length-1].z};
    pts.push(L0,...ln.map((p,k)=>Object.assign({stop:k},p)),L1);M.truck={obj:truckModel(),pts,k:0,x:L0.x,z:L0.z,yaw:-Math.PI/2,wait:0,done:false};
    M.exitsP=[{x:L0.x-6,z:L0.z+S.face*2},{x:L1.x+6,z:L1.z+S.face*2}];
    if(!o||!o.checkpoint)a.radio('you',"There's the truck. Grab the chair out of the back.",true)},
  upd(dt,M,F){const a=A(),P=a.P;truck(dt,M);chairUpd(dt,M,F);pirates(dt,M,F);parcels(M,F);
    const seated=M.chair.placed&&Math.hypot(P.pos.x-M.chair.x,P.pos.z-M.chair.z)<1.2;M.seated=seated;
    const onPorch=M.porches.filter(p=>p.state==='porch').length,left=M.porches.length-M.porches.filter(p=>p.state!=='wait').length;
    F.objs.push([M.stage==='deliveries'?'Deliveries · '+(M.porches.length-left)+'/'+M.porches.length:'Parcels safe on porches · '+onPorch+'/'+M.porches.length,false]);
    if(!M.chair.placed)F.objs.push([M.chair.held?'Set up the lawn chair where you can see the porches':'Grab the lawn chair from the back of your car',false]);
    else F.objs.push([seated?'On watch · pirates avoid porches within '+SEAT_R+' m':'Sit in the lawn chair to watch the street',seated]);
    if(M.lost)F.objs.push(['Parcels lost · '+M.lost+'/3',false,'warn']);
    F.meters.push({id:'parcels',label:'Parcels',v:onPorch,max:M.porches.length,style:'pips'});
    const ch=M.pir.find(p=>p.st==='run');if(ch){const d=Math.hypot(ch.e.pos.x-ch.from.x,ch.e.pos.z-ch.from.z);F.meters.push({id:'getaway',label:'Getaway',v:d,max:LOST_D,style:'bar',warn:LOST_D*.7,sub:Math.round(LOST_D-d)+' m left'})}
    if(M.lost>=3)return a.endMission(false,"Three parcels gone. Doug is drafting a strongly worded post.","The pirates won this round.");
    const busy=M.pir.some(p=>p.st==='walk'||p.st==='run')||M.porches.some(p=>p.state==='dropped'||p.state==='carry');
    if(M.stage==='pirates'&&M.spawned>=PIRATES&&!busy&&!M.pir.some(p=>p.e.state==='surrender')){if(!M.exitOpen){M.exitOpen=true;M.saved=M.porches.filter(p=>p.state==='porch').length;a.addTrust(.5*M.saved);a.radio('you',"Street's quiet. Chair goes back in the car.",true)}}},
  save:M=>({porches:M.porches.map(p=>p.state==='carry'||p.state==='dropped'||p.state==='stolen'?'porch':p.state),lost:M.lost,chair:M.chair.placed?{x:M.chair.x,z:M.chair.z}:null,truck:M.truck.done}),
  load(M,s){const a=A();M.porches.forEach((p,k)=>{p.state=s.porches[k]||'wait';if(p.state==='porch'){p.mesh=parcel();a.wmAdd(p.mesh);p.mesh.position.set(p.x,0,p.z)}});M.lost=s.lost||0;
    if(s.chair){M.chair.placed=true;M.chair.x=s.chair.x;M.chair.z=s.chair.z;M.chair.mesh.position.set(s.chair.x,0,s.chair.z)}
    if(s.truck){M.truck.done=true;M.truck.obj.visible=false}M.spawned=0;M.spawnT=4},
  payout:(M,ok)=>ok?[['Parcels saved ×'+M.saved,15*M.saved],...(M.caught?[['Pirates zip-tied ×'+M.caught,0]]:[]),...(ok&&!M.lost&&!M.hurt?[['Not a scratch on a single box',40]]:[])]:[],
  medal:M=>M.lost?1:(!M.hurt&&M.caught+M.deterred>=PIRATES)?3:2,
  end(M,ok){},
  test:{/* dev/jobs-check.js drives this: place the chair badly so pirates come, tackle, zip-tie, return the parcels */
    step:(a,t,o)=>porchBot(a,t,o),
    sample:()=>({porches:['wait','wait','wait','wait'].map(state=>({state})),lost:1,chair:{placed:false,mesh:{position:{set(){}}}},truck:{done:false,obj:{}}})}
});
function truck(dt,M){const a=A(),T=M.truck;if(T.done)return;const p=T.pts[T.k];if(!p){T.done=true;T.obj.visible=false;return}
  if(T.wait>0){T.wait-=dt;if(T.wait<=0&&p.stop!=null){const P_=M.porches[p.stop];P_.state='porch';P_.mesh=parcel();a.wmAdd(P_.mesh);P_.mesh.position.set(P_.x,0,P_.z);P_.mesh.rotation.y=Math.random();a.snd&&a.snd('cuff',.4);T.k++}}
  else{const dx=p.x-T.x,dz=p.z-T.z,d=Math.hypot(dx,dz);if(d<.4){if(p.stop!=null)T.wait=2.2;else T.k++}else{const s=Math.min(d,TRUCK_SPEED*dt);T.x+=dx/d*s;T.z+=dz/d*s;T.yaw=Math.atan2(-dx,-dz)}}
  T.obj.position.set(T.x,a.groundAt(T.x,T.z),T.z);T.obj.rotation.set(0,T.yaw+Math.PI/2,0);
  if(T.k>=T.pts.length-1&&!T.done&&M.porches.every(p=>p.state!=='wait')){if(M.stage==='deliveries'){a.CP.mark('pirates');a.radio('you',"Truck's gone. Now we wait. Nobody's porch gets pirated on my watch.",true)}}
  if(T.k>=T.pts.length){T.done=true;T.obj.visible=false}}
function chairUpd(dt,M,F){const a=A(),P=a.P,C=M.chair;
  if(C.held){if(!a.P.carry||a.P.carry.kind!=='chair'){C.held=false;return}F.taps.push({d:0,r:1,txt:'Set up the lawn chair here',fn:()=>{const mesh=a.P.carry.mesh;a.wmDrop();a.wmAdd(mesh);const q=a.wmSnap(P.pos.x,P.pos.z);
      C.x=P.pos.x;C.z=P.pos.z;mesh.position.set(C.x,0,C.z);mesh.rotation.y=P.yaw+Math.PI;C.held=false;C.placed=true;a.radio('you',"Perfect. Shade, sightlines, cupholder.",true)}});return}
  if(!a.P.carry&&Math.hypot(P.pos.x-C.x,P.pos.z-C.z)<1.8)F.holds.push({x:C.x,z:C.z,r:1.8,o:C,txt:C.placed?'Move the lawn chair':'Grab the lawn chair',time:.6,fn:()=>{C.held=true;C.placed=false;a.wmCarry('chair',C.mesh,null)}});
  if(!C.placed&&!C.held)F.target={x:C.x,z:C.z,label:'Lawn chair'}}
function deterR(M){const a=A(),P=a.P;return M.seated?{x:M.chair.x,z:M.chair.z,r:SEAT_R}:{x:P.pos.x,z:P.pos.z,r:STAND_R}}
function pirates(dt,M,F){const a=A(),P=a.P;if(M.stage!=='pirates')return;
  if(M.spawned<PIRATES){M.spawnT-=dt;if(M.spawnT<=0){M.spawnT=14;spawnPirate(M)}}
  const D=deterR(M);
  for(const p of M.pir){const e=p.e;if(e.state==='cuffed'){if(p.st!=='done'){p.st='done';M.caught++}continue}if(e.state==='dead'){if(p.st!=='done'){p.st='done';M.hurt++}continue}
    if(e.hp<e.maxhp&&!p.hit){p.hit=true;M.hurt++}
    if(e.state==='surrender'){if(p.st==='run')drop(M,p);p.st='surr';continue}
    if(p.st==='walk'){p.walkT=(p.walkT||0)+dt;if(p.walkT>35){/* stuck on the way (a fence, a parked car): he gives up and leaves */p.st='leave';M.deterred++;go(e,p.exit,3.4,()=>vanish(M,p));continue}
      const t=M.porches[p.t];if(!t||t.state!=='porch'){retarget(M,p);continue}
      if(Math.hypot(t.x-D.x,t.z-D.z)<D.r&&Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z)<45){const n=retarget(M,p,true);if(!n){p.st='leave';M.deterred++;a.radio('Porch pirate',pick(LINES.deter),true);go(e,p.exit,3.4,()=>vanish(M,p))}}
      else if(!e.script)go(e,t,3.6,()=>grab(M,p))}
    else if(p.st==='leave'){p.leaveT=(p.leaveT||0)+dt;if(p.leaveT>25)vanish(M,p)}
    else if(p.st==='run'){p.runT=(p.runT||0)+dt;if(p.runT>40&&Math.hypot(e.pos.x-p.from.x,e.pos.z-p.from.z)<LOST_D){/* wedged with the parcel: it's as good as gone */e.pos.set(p.exit.x,0,p.exit.z)}const d=Math.hypot(e.pos.x-p.from.x,e.pos.z-p.from.z);F.target={x:e.pos.x,z:e.pos.z,label:'Porch pirate'};
      if(Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z)<1.6){a.surrender(e);a.radio('Porch pirate',pick(LINES.give),true);drop(M,p);p.st='surr'}
      else if(d>LOST_D){M.lost++;const pk=M.porches[p.t];pk.state='lost';if(pk.mesh&&pk.mesh.parent)pk.mesh.parent.remove(pk.mesh);a.feed('Parcel lost','bad',M.lost+'/3');p.st='gone';vanish(M,p)}
      else if(!e.script)go(e,p.exit,4.4,()=>{})}
    if(e.state==='surrender'&&!F.target)F.target={x:e.pos.x,z:e.pos.z,label:'Zip-tie'}}}
function spawnPirate(M){const a=A(),S=street(),ex=M.exitsP[M.spawned%2],q=a.wmSnap(ex.x,ex.z),e=a.spawnEnemy(q.x,q.z,false);a.equip(e.dude,null);e.gun=null;e.noLeash=true;e.hp=e.maxhp=40;
  const tag=document.createElement('div');tag.className='tag';tag.textContent='PORCH PIRATE';const host=document.getElementById('tags');if(host)host.appendChild(tag);e.tag=tag;
  const p={e,st:'walk',t:-1,exit:M.exitsP[(M.spawned+1)%2],from:null};M.pir.push(p);M.spawned++;retarget(M,p);a.rebuildTargets();
  if(M.spawned===1)a.radio('you',"Gray hoodie. Tote bag. There he is.",true)}
function retarget(M,p,avoid){const a=A(),D=deterR(M),e=p.e;let best=-1,bd=1e9;M.porches.forEach((t,k)=>{if(t.state!=='porch')return;if(avoid&&Math.hypot(t.x-D.x,t.z-D.z)<D.r)return;const d=Math.hypot(t.x-e.pos.x,t.z-e.pos.z);if(d<bd){bd=d;best=k}});
  if(best<0){if(!avoid){p.st='leave';go(e,p.exit,3.4,()=>vanish(M,p))}return false}p.t=best;e.script=null;return true}
function go(e,t,speed,then){e.script={kind:'to',x:t.x,z:t.z,speed,then}}
function grab(M,p){const a=A(),t=M.porches[p.t];if(!t||t.state!=='porch'||p.st!=='walk')return retarget(M,p);t.state='stolen';p.st='run';p.from={x:t.x,z:t.z};
  if(t.mesh){if(t.mesh.parent)t.mesh.parent.remove(t.mesh);t.mesh.position.set(0,.95,.35);p.e.dude.root.add(t.mesh)}a.radio('Porch pirate',pick(LINES.grab),true);a.feed('A parcel is walking away','bad');go(p.e,p.exit,4.4,()=>{})}
function drop(M,p){const a=A(),t=M.porches[p.t];if(!t||t.state!=='stolen')return;t.state='dropped';if(t.mesh){if(t.mesh.parent)t.mesh.parent.remove(t.mesh);a.wmAdd(t.mesh);const q=a.wmSnap(p.e.pos.x+.8,p.e.pos.z);t.mesh.position.set(q.x,0,q.z);t.dx=q.x;t.dz=q.z}}
function vanish(M,p){const a=A(),e=p.e;e.script={kind:'incar'};e.state='dead';e.hp=0;if(e.tag){e.tag.remove();e.tag=null}if(e.dude.root.parent)e.dude.root.parent.remove(e.dude.root);const k=a.enemies.indexOf(e);if(k>=0)a.enemies.splice(k,1);if(p.st!=='gone')p.st='done';a.rebuildTargets()}
function parcels(M,F){const a=A(),P=a.P;
  for(const t of M.porches){if(t.state==='dropped'&&!a.P.carry)F.holds.push({x:t.dx,z:t.dz,r:1.7,o:t,txt:'Pick up the parcel',time:.7,fn:()=>{t.state='carry';a.wmCarry('box',t.mesh,t)}});
    if(t.state==='dropped'&&!F.target)F.target={x:t.dx,z:t.dz,label:'Parcel'}}
  const c=a.P.carry;if(c&&c.kind==='box'){const t=c.it;F.target={x:t.x,z:t.z,label:'Porch'};F.objs.push(['Carry the parcel back to its porch',false]);
    F.taps.push({x:t.x,z:t.z,r:2.2,txt:'Put the parcel back',fn:()=>{const mesh=c.mesh;a.wmDrop();a.wmAdd(mesh);mesh.position.set(t.x,0,t.z);t.state='porch';a.radio('you',pick(LINES.ret),true);a.radio('Neighbour',pick(LINES.thanks));a.feed('Parcel returned','trust','+0.5 trust')}})}}
/* the scripted player for dev/jobs-check.js: o.fail = sit on your hands until three parcels are lost */
function porchBot(a,t,o){const M=a.M,P=a.P;if(!M||M.state!=='go'||!M.porches)return null;const tp=(x,z)=>{P.pos.set(x,0,z);a.collide(P.pos,.35)};
  if(a.CV){a.exitCar();return null}
  if(o&&o.fail){if(!M.chair.placed&&!M.chair.held){tp(M.chair.x+1,M.chair.z);a.keys.e=true}else if(M.chair.held){a.keys.e=false;const S=street();tp(S.cx+60,S.cz);a.useTap=true}return null}
  a.keys.e=false;
  if(!M.chair.placed&&!M.chair.held){tp(M.chair.x+1,M.chair.z);a.keys.e=true;return null}
  if(M.chair.held){const S=street();tp(S.cx+40,S.cz+S.face*4);a.useTap=true;return null}/* far enough that the first pirate comes */
  const sur=M.pir.find(p=>p.e.state==='surrender');if(sur){tp(sur.e.pos.x+1,sur.e.pos.z);a.useTap=true;return null}
  const run=M.pir.find(p=>p.st==='run');if(run){tp(run.e.pos.x+.8,run.e.pos.z);return null}
  const c=P.carry;if(c&&c.kind==='box'){tp(c.it.x+.5,c.it.z);a.useTap=true;return null}
  const dr=M.porches.find(t=>t.state==='dropped');if(dr){tp(dr.dx+.5,dr.dz);a.keys.e=true;return null}
  if(M.exitOpen){const e=M.car;tp(e.pos.x+2.5,e.pos.z);a.useTap=true;return null}
  if(M.stage==='pirates'&&M.spawned>=1&&t%60===0){/* sit back down once the first one is caught: the rest should be scared off */const C=M.chair;if(M.caught>=1){C.x=street().cx;C.z=street().cz;C.mesh.position.set(C.x,0,C.z);tp(C.x+.3,C.z)}}
  return null}
})();
