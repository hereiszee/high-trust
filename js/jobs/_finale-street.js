/* =====================================================================
   EVERYBODY WAVES, stages 3-5 (loaded by js/jobs/finale.js): THE ROOF, THE ROADBLOCK, HOLD THE STREET.
   ===================================================================== */
(function(){'use strict';const FN=window.HT&&HT.Finale;if(!FN)return;const{A,G,W,hyp,clamp,wrap,yawTo,cyaw,pick,person,unperson,walkTo,say,sayAll,once,role,kit,sign,advance,fade}=FN;
const D=document;
const famIds=['jen','tyler','maddie'];
/* the 25 m rule: everyone in the family and every child, wherever they stand this stage */
function minors(M){return(M.fn.sub.kids||[]).filter(p=>p&&p.d&&p.d.root.parent&&!p.hidden)}
function nearKid(M,x,z){let b=1e9;for(const p of minors(M))b=Math.min(b,hyp(p.x-x,p.z-z));return b}
FN.nearKid=nearKid;
/* the family and the kids at the festival: placed by every stage that shows the street */
function family(M,spots){const S=M.fn.sub;S.kids=[];const ids=['jen','tyler','maddie','malik','kid1','kid2'];ids.forEach((id,i)=>{const sp=spots[i];if(!sp)return;
  const p=person(id.startsWith('kid')?'nb_kid':id,sp.x,sp.z,{scale:id.startsWith('kid')?.8+.06*i:undefined});if(!p)return;p.name=(FN.CAST[id]||{}).name||'Kid';p.face=sp.face||null;p.home={x:sp.x,z:sp.z};S.kids.push(p)})}
FN.family=family;

/* ===================================================================== STAGE 3: THE ROOF ===================================================================== */
const RK={tell:[1.7,1.15,.7],fuse:[70,92,114,136],smokeFail:2,bolt:1.1,beans:6,zoom:[3.5,7],civFail:2,kidR:25,walkT:2.2};
/* plants: what gives them away through the scope. Behaviour, never a look: they're from the same crowd as everyone else */
const TELLS=["touching his ear every few seconds: earpiece","backpack straps pulled tight. Heavy for a festival","not watching the parade: watching the exits","checking his watch. Then the stage. Then his watch","no funnel cake, no lemonade, no kid, no smile. Just standing"];
const CIV=["holding three funnel cakes. Not suspicious, just ambitious","filming the marching band on a tablet","explaining the parade route to a toddler","waiting in line for lemonade. Patiently","waving at somebody on a porch","wearing a T-shirt that says WORLD'S OKAYEST GRANDPA"];
function roofInfo(){const a=A(),s=a.WORLD&&a.WORLD.sites&&a.WORLD.sites.roof;if(!s)return null;const r=s.roof||{x0:416,z0:48,x1:438,z1:60},y=FN.roofY!=null?FN.roofY:(s.roofY||7)+.9;/* the slab top is 0.9 m over roofY (measured below once it streams in) */
  return{r,y,van:{x:r.x0+1.2,z:r.z0+1.1},b:s.building||{x0:416,z0:48,x1:438,z1:60},bottom:{x:s.ladder.bottom.x+.4,z:s.ladder.bottom.z},top:{x:s.ladder.top.x-.4,z:s.ladder.top.z}}}
/* the roof slab's real height, by a ray down onto the building (once it's streamed in) */
function measureRoof(){if(FN.roofY!=null)return;const a=A(),T=a.THREE,R=roofInfo();if(!R)return;const rc=new T.Raycaster(new T.Vector3((R.r.x0+R.r.x1)/2,40,(R.r.z0+R.r.z1)/2),new T.Vector3(0,-1,0),0,60);
  const h=rc.intersectObjects(a.L.solids||[],false).find(i=>i.point.y>4&&i.point.y<12);if(h)FN.roofY=h.point.y}
function roofOn(M,on){const a=A(),R=roofInfo(),L=a.L,S=M.fn.sub;if(!R||!L)return;
  if(on&&!S.roofCols){const b=R.b;S.bld=L.colliders.find(c=>(c.h==null||c.h>R.y)&&c.x0<=b.x0+.5&&c.x1>=b.x1-.5&&c.z0<=b.z0+.5&&c.z1>=b.z1-.5)||null;if(S.bld){S.bldH=S.bld.h;S.bld.h=R.y}
    const r=R.r,t=.3,H=R.y+2.2;S.roofCols=[[r.x0-t,r.z0-t,r.x1+t,r.z0],[r.x0-t,r.z1,r.x1+t,r.z1+t],[r.x0-t,r.z0,r.x0,r.z1],[r.x1,r.z0,r.x1+t,r.z1]].map(c=>{const o={x0:c[0],z0:c[1],x1:c[2],z1:c[3],h:H};L.colliders.push(o);return o})}
  else if(!on&&S.roofCols){if(S.bld){if(S.bldH==null)delete S.bld.h;else S.bld.h=S.bldH;S.bld=null}for(const c of S.roofCols){const k=L.colliders.indexOf(c);if(k>=0)L.colliders.splice(k,1)}S.roofCols=null}}
/* Doug's rifle with beanbags: your loadout waits at the bottom of the ladder */
function borrowRifle(M){const a=A(),P=a.P,S=M.fn.sub,H=G();if(S.borrowed||!H.give)return;S.borrowed={lo:Object.assign({},P.loadout),ammo:JSON.parse(JSON.stringify(P.ammo||{})),cur:P.cur};
  P.loadout.side=null;P.loadout.p1=null;P.loadout.p2=null;H.give('hunter',{mag:RK.beans,extra:0})}
function returnRifle(M){const a=A(),P=a.P,S=M&&M.fn&&M.fn.sub,H=G();if(!S||!S.borrowed)return;const b=S.borrowed;S.borrowed=null;P.loadout.p1=null;P.loadout.p2=null;P.loadout.side=null;
  for(const k of['side','p1','p2']){const id=b.lo[k];if(id&&H.give)H.give(id,{mag:0,extra:0})}for(const id in b.ammo)if(P.ammo[id])Object.assign(P.ammo[id],b.ammo[id]);if(P.ammo.hunter&&!Object.values(b.lo).includes('hunter'))delete P.ammo.hunter;
  if(H.swap&&b.cur&&P.weapons.includes(b.cur))H.swap(b.cur,true);a.P.aim=false}
FN.returnRifle=returnRifle;
/* the crowd forming up for the parade: neighbours, kids, family, and four plants who look exactly like everybody else */
function crowd(M){const S=M.fn.sub,f=W.fest;S.crowd=[];const keys=FN.NB.concat(FN.STREET.slice(0,6));let k=0;
  family(M,[{x:358.5,z:39.2},{x:361,z:44},{x:362.5,z:44.6},{x:364,z:43.2},{x:366.5,z:41.6},{x:369,z:44.4}]);for(const p of S.kids){p.lo=352;p.hi=376}
  for(let i=0;i<22;i++){const x=356+Math.random()*48,z=f.z0+.8+Math.random()*(f.z1-f.z0-1.6);const p=person(keys[k++%keys.length],x,z);if(!p)continue;p.tell=CIV[i%CIV.length];p.lo=352;p.hi=405;p.next=Math.random()*6;S.crowd.push(p)}
  const pk=['nb_sweater','thug_beanie','nb_office','thug_track'];S.plants=pk.map((key,i)=>{const x=376+i*8+Math.random()*4,z=f.z0+1+Math.random()*4;const p=person(key,x,z);if(!p)return null;
    p.plant=true;p.tell=TELLS[i%TELLS.length];p.fuse=RK.fuse[i];p.st='mill';p.lo=370;p.hi=406;p.next=Math.random()*4;S.crowd.push(p);return p}).filter(Boolean)}
function mill(M,dt,p){if(p.st&&p.st!=='mill')return;p.next-=dt;if(p.next<=0&&p.tx==null){p.next=5+Math.random()*9;const f=W.fest;walkTo(p,clamp(p.x+(Math.random()-.5)*14,p.lo||352,p.hi||405),f.z0+.8+Math.random()*(f.z1-f.z0-1.6),.9+Math.random()*.4)}
  if(p.tx==null&&!p.face)p.face={x:W.stage.x,z:W.stage.z}}
FN.stages.roof={
  build(M){const a=A(),S=M.fn.sub;FN.festSet(M,1);FN.extras(M,'stoops');measureRoof();crowd(M);S.scope=false;S.zoom=0;S.bolt=0;S.beans=RK.beans;S.focus=null;S.focusT=0;S.handled=0;S.smokes=[];S.up=false;S.t=0;
    const sp=role(M,'spotter'),wk=role(M,'walker');S.tellT=sp.v;S.walkV=wk.v;S.walker=person(wk.id||'dee',W.hq.x-1,W.hq.z+1.5);if(S.walker){S.walker.st='idle';S.walker.home={x:W.hq.x-1,z:W.hq.z+1.5}}
    S.spotter=person(sp.id||'doug',437,51.5);if(S.spotter)S.spotter.hidden=true;
    /* right mouse toggles the scope (a pure toggle); Z zooms */
    S.onDown=e=>{if(e.button===2&&S.up&&!M.fn.fade&&(D.pointerLockElement||(matchMedia&&matchMedia('(pointer:coarse)').matches))&&!(HT.Menus&&HT.Menus.isOpen&&HT.Menus.isOpen())){S.scope=!S.scope;if(!S.scope)a.P.aim=false;e.preventDefault()}};D.addEventListener('mousedown',S.onDown,true);
    S.lab=D.createElement('div');S.lab.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2;font:600 13px/1.25 var(--ui,system-ui,sans-serif)';D.body.appendChild(S.lab);FN.res().el.push(S.lab);
    if(once(M,'roof0'))sayAll([['doug',"Ladder's on the east wall of the Community Center. Hold E at the bottom. I'm already up here. I brought snacks and the beanbags."]])},
  upd(dt,M,F,fading){const a=A(),S=M.fn.sub,P=a.P,R=roofInfo();S.t+=dt;measureRoof();
    for(const p of S.crowd)if(!p.plant||p.st==='mill')mill(M,dt,p);for(const p of S.kids){if(p.tx==null&&Math.random()<dt*.08)walkTo(p,clamp(p.home.x+(Math.random()-.5)*6,352,375),clamp(p.home.z+(Math.random()-.5)*3,40.8,45.2),1)}
    plants(dt,M,F);walker(dt,M);smokeTick(dt,M);
    if(S.smokes.length>=RK.smokeFail){M.loseWhy='roof:smoke';return a.endMission(false,"Two smoke bombs went off in the parade line. Everyone's fine. Everyone's also gone home.","The parade scattered.")}
    if(M.fn.st.civHit>=RK.civFail){M.loseWhy='roof:civilians';return a.endMission(false,"Two beanbags, two wrong people. Rosa is icing a grandpa. Doug has taken the rifle back.","Wrong people.")}
    if(!S.up){if(S.handled>=S.plants.length){F.objs.push(['Done up here',true]);return}
      F.objs.push(['Climb onto the Community Center roof: hold E at the ladder (east wall)',false]);F.objs.push(['Plants in the crowd: '+S.handled+'/'+S.plants.length+' handled',false]);F.target={x:W.ladder.x,z:W.ladder.z,label:'Ladder'};
      if(!fading)F.holds.push({x:R.bottom.x,z:R.bottom.z,r:2.2,o:S,txt:'Climb the ladder',time:.8,fn:()=>climb(M,true)});smokeMeter(M,F);return}
    /* on the roof */
    P.pos.y=R.y;P.pos.x=clamp(P.pos.x,R.r.x0+.3,R.r.x1-.3);P.pos.z=clamp(P.pos.z,R.r.z0+.3,R.r.z1-.3);if(P.cur!=='hunter'&&P.weapons.includes('hunter'))G().swap&&G().swap('hunter',true);
    P.aim=!!S.scope;if(FN.pressed('z')&&S.scope)S.zoom=(S.zoom+1)%RK.zoom.length;S.bolt=Math.max(0,S.bolt-dt);
    if(S.handled>=S.plants.length){S.scope=false;P.aim=false;F.objs.push(['All four handled. Climb down: hold E at the ladder (east side of the roof)',false]);F.target={x:R.top.x,z:R.top.z,label:'Ladder'};
      if(once(M,'roofDone'))sayAll([['doug',"That's four. Hawk to everybody: four for four."],['dee',"We're not doing call signs, Doug."],['doug',"Our stage truck just left the yard. It's coming up 3rd St. Hank's on 3rd and Ash with the pickup. GO."]]);
      if(!fading)F.holds.push({x:R.top.x,z:R.top.z,r:2.6,o:S,txt:'Climb down',time:.6,fn:()=>climb(M,false)});return}
    focusTick(dt,M);
    F.objs.push([S.scope?'Hold on a face until '+(role(M,'spotter').name)+' reads the tell · E: mark for '+role(M,'walker').name+' · Click: beanbag · Z: zoom':'Right mouse: scope in (toggle) · read the crowd on Main St',false]);
    F.objs.push(['Plants handled · '+S.handled+'/'+S.plants.length,false]);F.objs.push(['Never with a child or your family within 25 m of him: mark him instead',false]);
    smokeMeter(M,F);
    if(S.scope&&S.focus&&S.focus.revealed&&!S.focus.marked&&!S.focus.down)F.taps.push({d:0,r:1,txt:'Mark him for '+role(M,'walker').name,fn:()=>markIt(M,S.focus)});
    if(once(M,'onroof'))sayAll([[role(M,'spotter').id||'doug',"Right mouse to look through the scope. Hold on someone and I'll tell you what I see. E sends "+role(M,'walker').name+" to walk him out. A click is a beanbag, if no kid is near him."],['doug',"Four plants. Smoke bombs. One goes off, we cope. Two, the parade's over."]])},
  camera(dt,M){const a=A(),S=M.fn.sub,P=a.P;const R=roofInfo();if(!S.up||!S.scope||M.fn.fade)return false;const cam=a.camera;
    cam.position.set(P.pos.x-Math.sin(P.yaw)*.7,R.y+(P.crouch?1.2:1.62),P.pos.z-Math.cos(P.yaw)*.7);cam.rotation.set(P.pitch,P.yaw,0,'YXZ');
    const z=RK.zoom[S.zoom],fov=2*Math.atan(Math.tan(70*Math.PI/360)/z)*180/Math.PI;cam.fov=fov;cam.updateProjectionMatrix();if(P.dude)P.dude.root.visible=false;const sc=D.getElementById('scope');if(sc)sc.style.display='none';
    for(const p of FN.live||[])if(p.d&&p.d.rb)p.d.rb.skip=1e6;return true},
  fire(M){const S=M.fn.sub;if(!S.up)return false;S.fires=(S.fires||0)+1;if(S.scope)shoot(M);else A().feed('Scope in first (right mouse)','info');return true},
  hud(st,M){const S=M.fn.sub;if(!S.up)return;st.crosshair=Object.assign({},st.crosshair||{},{hidden:!!S.scope});st.gadgets=[{id:'fin-beans',label:'Beanbags ×'+S.beans,key:'Click',on:true},{id:'fin-zoom',label:RK.zoom[S.zoom]+'× zoom',key:'Z',on:S.zoom>0}];
    labels(M);if(D.body.classList.contains('ow-scoped')!==!!S.scope)D.body.classList.toggle('ow-scoped',!!S.scope)},
  clear(M){const a=A(),S=M.fn.sub;if(S.onDown)D.removeEventListener('mousedown',S.onDown,true);roofOn(M,false);returnRifle(M);D.body.classList.remove('ow-scoped');if(a.P.dude)a.P.dude.root.visible=true;
    if(S.lab)S.lab.innerHTML='';a.camera.fov=70;a.camera.updateProjectionMatrix();for(const p of(S.crowd||[]).concat(S.kids||[],[S.walker,S.spotter]))unperson(p);S.smokes&&S.smokes.forEach(s=>s.g.parent&&s.g.parent.remove(s.g))},
  bot(a,t,o,M,B){const S=M.fn.sub,P=a.P,R=roofInfo();if(!S.up){if(S.handled>=S.plants.length){if(!B.down){B.down=1;climb(M,false,true)}return}if(!B.c){B.c=1;climb(M,true,true)}return}
    if(S.handled>=S.plants.length){if(!B.down){B.down=1;climb(M,false,true)}return}
    S.scope=true;const tg=S.plants.find(p=>!p.marked&&!p.down&&p.st!=='gone');if(!tg)return;const e={x:P.pos.x-Math.sin(P.yaw)*.7,y:R.y+1.62,z:P.pos.z-Math.cos(P.yaw)*.7};
    const dx=tg.x-e.x,dz=tg.z-e.z,dy=1.3-e.y;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));
    if(tg.revealed&&S.focus===tg){if(nearKid(M,tg.x,tg.z)>RK.kidR+1&&S.bolt<=0&&S.beans>0&&!B.noShoot)shoot(M);else if(t%10===0)markIt(M,tg)}}};
function climb(M,up,instant){const a=A(),S=M.fn.sub,P=a.P;if(a.CV)try{a.exitCar()}catch(_){}const mid=()=>{measureRoof();const R=roofInfo();roofOn(M,up);S.up=up;if(up){borrowRifle(M);/* the spotter has set up at the north-west corner, over the festival */P.pos.set(R.van.x,R.y,R.van.z);P.yaw=Math.atan2(-(394-R.van.x),-(43.4-R.van.z));P.pitch=-.2;if(S.spotter){S.spotter.hidden=false;S.spotter.x=R.van.x+1.3;S.spotter.z=R.van.z+.9;S.spotter.y=R.y;S.spotter.face={x:380,z:43}}}
    else{const R=roofInfo();S.scope=false;returnRifle(M);P.pos.set(R.bottom.x+.6,0,R.bottom.z);P.pos.y=0;P.yaw=Math.PI/2;if(S.spotter)S.spotter.hidden=true;if(M.fn.stage==='roof'&&S.handled>=S.plants.length)advance(M,'roadblock')}};
  if(instant)mid();else fade(M,mid,{out:.45,hold:.25,inT:.5})}
function smokeMeter(M,F){const S=M.fn.sub;const nxt=S.plants.filter(p=>p.st==='mill'||p.st==='go').map(p=>p.fuse).sort((x,y)=>x-y)[0];
  F.meters.push({id:'smoke',label:'Smoke',v:S.smokes.length,max:RK.smokeFail,style:'pips',warn:1});if(nxt!=null)F.widgets.push({id:'fuse',kind:'timer',label:'Next move',v:Math.max(0,nxt),hot:nxt<15})}
/* the plants: mill about; when the fuse runs out, walk to the parade line and pop smoke */
function plants(dt,M,F){const S=M.fn.sub;for(const p of S.plants){if(p.down||p.marked||p.st==='gone')continue;p.fuse-=dt;
  if(p.st==='mill'&&p.fuse<=0){p.st='go';walkTo(p,W.stage.x+6+Math.random()*8,W.fest.z0+2+Math.random()*2,1.4);p.arrive=()=>{p.st='smoke';smoke(M,p.x,p.z);M.fn.st.smokes++;p.st='gone';walkTo(p,W.fest.x0-6,p.z,2.6);p.arrive=q=>{q.hidden=true};
      A().feed('Smoke bomb in the parade line','bad',S.smokes.length+'/'+RK.smokeFail);say('dee',pick(["Smoke! Everybody's fine! It smells like burnt popcorn!","That's one. Kids are fine. The tuba player is coughing in B flat."]))}}}}
function smoke(M,x,z){const a=A(),T=a.THREE,S=M.fn.sub,g=new T.Group(),R=FN.res();if(!S.smokeMat){S.smokeMat=new T.MeshStandardMaterial({color:new T.Color('#cfd3d6'),transparent:true,opacity:.75,depthWrite:false,roughness:1});R.mat.push(S.smokeMat);S.smokeGeo=new T.SphereGeometry(1,10,8);R.geo.push(S.smokeGeo)}
  for(let i=0;i<7;i++){const m=new T.Mesh(S.smokeGeo,S.smokeMat);m.position.set((Math.random()-.5)*2,.6+Math.random()*1.5,(Math.random()-.5)*2);m.scale.setScalar(.6);g.add(m)}g.position.set(x,0,z);a.wmAdd(g);S.smokes.push({g,t:0})}
function smokeTick(dt,M){for(const s of M.fn.sub.smokes){s.t+=dt;const k=Math.min(1,s.t/2.5);s.g.children.forEach((m,i)=>{m.scale.setScalar(.6+k*1.8+i*.1);m.position.y+=dt*.25});s.g.visible=s.t<22}}
/* what the scope is on: the nearest person to the aim ray */
function aimRay(M){const a=A(),P=a.P,R=roofInfo();const e={x:P.pos.x-Math.sin(P.yaw)*.7,y:R.y+(P.crouch?1.2:1.62),z:P.pos.z-Math.cos(P.yaw)*.7};const d={x:-Math.sin(P.yaw)*Math.cos(P.pitch),y:Math.sin(P.pitch),z:-Math.cos(P.yaw)*Math.cos(P.pitch)};return{e,d}}
function under(M){const S=M.fn.sub,{e,d}=aimRay(M);let best=null,ba=1e9;for(const p of S.crowd){if(p.hidden||p.st==='gone'||S.kids.includes(p)||(p.d&&HT.People&&HT.People.isProtected&&HT.People.isProtected(p.d)))continue;/* a kid or the family is never under the scope */const vx=p.x-e.x,vy=1.3-e.y,vz=p.z-e.z,l=Math.hypot(vx,vy,vz);
    const c=(vx*d.x+vy*d.y+vz*d.z)/l,ang=Math.acos(clamp(c,-1,1)),lim=Math.max(.012,Math.atan(.55/l));if(ang<lim&&ang<ba){ba=ang;best=p}}return best}
function focusTick(dt,M){const S=M.fn.sub;if(!S.scope){S.focus=null;S.focusT=0;return}const p=under(M);if(p!==S.focus){S.focus=p;S.focusT=0}if(!p)return;S.focusT+=dt;
  if(!p.revealed&&S.focusT>=S.tellT&&!S.kids.includes(p)){p.revealed=true;const who=role(M,'spotter').id||'doug';say(who,p.plant?"Him. "+cap(p.tell)+".":pick(["Nope. That one's "+p.tell+".","Not him: "+p.tell+"."]),true);if(p.plant&&once(M,'firstTell'))say('doug',"E marks him for "+role(M,'walker').name+". Or a beanbag, if nobody small is near him. Your call.")}}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function markIt(M,p){const S=M.fn.sub;if(!p||p.marked||p.down)return;if(!p.revealed){say(role(M,'spotter').id||'doug',"Give me a second on him first.",true);return}p.marked=true;S.queue=(S.queue||[]).concat([p]);
  say(role(M,'walker').id||'dee',p.plant?"On my way. Gray? No. The other one. Got him.":"On my way. Are you sure? Okay. I'm sure you're sure.",true)}
/* the crowd walker: to the marked man, a word, walk him out east (a civilian: an apology, and back) */
function walker(dt,M){const S=M.fn.sub,w=S.walker;if(!w)return;if(w.st==='idle'){const p=(S.queue||[]).shift();if(!p)return;w.st='to';w.tgt=p;}
  const p=w.tgt;if(w.st==='to'){walkTo(w,p.x+.8,p.z,S.walkV);if(hyp(w.x-p.x,w.z-p.z)<1.4){w.st='word';w.t=RK.walkT;p.tx=null;p.face={x:w.x,z:w.z};w.face={x:p.x,z:p.z}}}
  else if(w.st==='word'){w.t-=dt;if(w.t<=0){if(p.plant){w.st='out';p.st='walked';p.face=null;walkTo(p,W.fest.x1+5,W.fest.z1+2,1.5);walkTo(w,W.fest.x1+4,W.fest.z1+1.2,1.5);p.arrive=q=>{q.hidden=true;q.st='gone'};S.handled++;
        A().feed('Plant walked out of the crowd','trust',role(M,'walker').name);say(role(M,'walker').id||'dee',pick(["Let's get you some air, sir. And let's leave the backpack with Hank.","You look like a man who needs a lemonade and a long walk in the other direction."]))}
      else{M.fn.st.wrong++;w.st='back';p.marked=false;p.face=null;say(role(M,'walker').id||'dee',pick(["Sorry, sir! Wrong person! Enjoy the parade! Have a coupon!","My mistake, ma'am. You look wonderful. Carry on."]));A().feed('Wrong call','bad','he was just '+p.tell.split('.')[0])}}}
  else if(w.st==='out'){if(w.tx==null){w.st='back'}}
  else if(w.st==='back'){walkTo(w,w.home.x,w.home.z,S.walkV);if(hyp(w.x-w.home.x,w.z-w.home.z)<.6)w.st='idle'}}
/* the beanbag: a ray from the scope; only if no child or family member is within 25 m of the man */
function shoot(M){const a=A(),S=M.fn.sub;if(S.bolt>0)return;if(S.beans<=0){say('doug',"That's all the beanbags. Mark them for "+role(M,'walker').name+".",true);return}
  const p=under(M);const kid=p?nearKid(M,p.x,p.z):1e9;
  if(p&&kid<RK.kidR){a.feed('Not with kids within 25 m of him','bad',Math.round(kid)+' m · mark him instead (E)');if(once(M,'kidblock'))say('doug',"Kids right there. Not a chance. Mark him. "+role(M,'walker').name+" will walk him out.",true);S.bolt=.5;return}
  S.bolt=RK.bolt;S.beans--;M.fn.st.beans++;try{HT.Audio&&HT.Audio.gun&&HT.Audio.gun('beanbag')}catch(_){}try{a.snd&&a.snd('shot',.4)}catch(_){}
  if(!p)return;if(p.plant&&!p.down&&p.st!=='gone'){p.down=true;p.st='down';p.tx=null;p.mode='hands';S.handled++;a.feed('Beanbag · he dropped the backpack','trust');try{HT.People.hit(p.d,false)}catch(_){}
    setT(M,1.2,()=>{p.mode='kneel'});say('rosa',pick(["Got him. He's fine. He's furious, but he's fine.","Down and done. Hank, zip-tie, please. The festival-blue one."]),true)}
  else if(!p.plant){M.fn.st.civHit++;p.mode='hands';setT(M,2,()=>{p.mode='stand'});a.feed('Wrong person','bad','that was a neighbour');say('rosa',"That was a GRANDPA. He's fine. He's filing a complaint with me personally.",true)}}
function setT(M,t,fn){(M.fn.timers||(M.fn.timers=[])).push({t,fn})}
FN.setT=setT;FN.timerTick=(dt,M)=>{const L=M.fn.timers;if(!L)return;for(let i=L.length-1;i>=0;i--){L[i].t-=dt;if(L[i].t<=0){const f=L[i].fn;L.splice(i,1);try{f()}catch(e){console.error(e)}}}};
/* labels over the faces you've read (screen space; pooled spans) */
function labels(M){const a=A(),S=M.fn.sub;if(!S.lab)return;const list=S.scope?S.crowd.filter(p=>p.revealed&&!p.hidden&&p.st!=='gone'):[];let html='';
  for(const p of list){const q=a.project(p.x,p.y!=null?2.1:2.1,p.z);if(q.behind)continue;const kid=nearKid(M,p.x,p.z),col=p.down?'#9fe58a':p.marked?'#8ac6ff':p.plant?'#ffb347':'#c9ced6';
    html+=`<div style="position:absolute;left:${q.x}px;top:${q.y}px;transform:translate(-50%,-100%);background:rgba(10,12,16,.72);color:${col};padding:3px 7px;border-radius:6px;border:1px solid ${col};white-space:nowrap">${p.down?'Down':p.marked?'Marked':p.plant?'PLANT':'Neighbour'}${p.plant&&!p.down&&!p.marked?(kid<RK.kidR?' · kids '+Math.round(kid)+' m · mark':' · clear'):''}</div>`}
  if(S.scope){const f=S.focus;const k=f?Math.min(1,S.focusT/S.tellT):0;html+=`<div style="position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border:2px solid rgba(255,255,255,.75);border-radius:50%"></div><div style="position:absolute;left:50%;top:50%;width:2px;height:2px;margin:-1px;background:#fff"></div>`+
    (f&&!f.revealed?`<div style="position:absolute;left:50%;top:calc(50% + 34px);transform:translateX(-50%);width:80px;height:5px;background:rgba(0,0,0,.5);border-radius:3px"><div style="width:${(k*100)|0}%;height:100%;background:#ffd23f;border-radius:3px"></div></div>`:'')+
    `<div style="position:absolute;inset:0;box-shadow:inset 0 0 0 9999px rgba(0,0,0,0);background:radial-gradient(circle at 50% 50%,transparent 38%,rgba(0,0,0,.88) 39%)"></div>`}
  if(S.labHtml!==html){S.labHtml=html;S.lab.innerHTML=html}}

/* ===================================================================== STAGE 4: THE ROADBLOCK ===================================================================== */
const BK={truckV:10,arriveZ:52,dec:5,vanAt:12,need:2.6,stopShort:1.6};
const BLOCK_ZONE={xl:W.block.xl,xr:W.block.xr,z0:W.block.z0,z1:W.block.z1};
FN.stages.roadblock={
  build(M){const a=A(),S=M.fn.sub,su=role(M,'supply');FN.festSet(M,1);const Pp=HT.Props;S.props=Pp?Pp.create(a):null;FN.res().props=S.props;
    S.load=Object.assign({},su.v);S.time=su.v.t;S.left={sawhorse:su.v.saw,cone:su.v.cone,flare:su.v.flare,sign:1};S.kinds=['sawhorse','cone','sign','flare'];S.kind=0;S.t=0;S.ph='build';
    S.pickup=FN.car('pickup','#b23a2a',W.hank.x,W.hank.z,W.hank.yaw);
    /* what's on the tailgate (visual): a stack that shrinks as you take things */
    S.hank=person(su.id||'hank',W.hank.x-1.4,W.hank.z+3.2);if(S.hank){S.hank.face={x:380,z:90}}
    if(once(M,'rb0'))sayAll([[su.id||'hank',"Every cone in the store. Every sawhorse. Two hundred zip-ties. On the house. Just this once. Don't tell my wife."],
      ['you',"Sawhorses across the lane, the sign a few metres before them, a lit flare at the wall. Then it looks official."]]);
  },
  upd(dt,M,F){const a=A(),S=M.fn.sub,P=a.P;S.t+=dt;if(S.props)S.props.step(dt);
    const plan=S.props?readNow(M):null;S.plan=plan;
    if(S.ph==='build'){S.time-=dt;if(FN.pressed('x'))cycle(M);
      /* the carpool van arrives: Rick and the Okafors */
      if(!S.van&&S.t>BK.vanAt){S.van=FN.car('minivan','#3c6fa8',377.4,90,Math.PI/2);S.vanItem=true;sayAll([['rick',"Carpool van, parked across the west lane. The Okafors are in the back, eating chips, very calm."],['you',"East lane's on me."]])}
      const c=P.carry;const held=c&&c.kind&&c.kind.startsWith('fin:')?c.kind.slice(4):null;
      if(!held){const d=hyp(P.pos.x-(W.hank.x),P.pos.z-(W.hank.z+2.6));const k=S.kinds[S.kind];
        if(d<3.2){F.holds.push({x:W.hank.x,z:W.hank.z+2.6,r:3.2,o:S,txt:'Grab '+(k==='cone'?'two cones':k==='flare'?'a lit flare':'a '+(k==='sign'?'ROAD WORK AHEAD sign':k))+' ('+S.left[k]+' left · X: something else)',time:.45,fn:()=>grab(M)})}
        F.target={x:W.hank.x,z:W.hank.z+2.4,label:"Hank's tailgate"};if(S.props)S.props.ghostOff()}
      else{/* the ghost where it would go */const yaw=held==='sign'?Math.PI:0;const fx=P.pos.x-Math.sin(P.yaw)*1.4,fz=P.pos.z-Math.cos(P.yaw)*1.4;const sn=S.props.snap(held,fx,fz,yaw,{yaw});
        const ok=a.walkable(a.tx(sn.x),a.tx(sn.z))!==false;S.props.ghost(held,sn.x,sn.z,sn.yaw,ok);if(ok)F.taps.push({d:0,r:1,txt:'Put the '+held+' down here',fn:()=>place(M,held,sn)});F.target={x:380.5,z:89,label:'The gap'}}
      F.objs.push(['Build a roadblock on 3rd St before the truck comes · '+Math.ceil(Math.max(0,S.time))+' s',false]);
      F.objs.push(['Hold E at the tailgate to grab · E to put it down · X: switch item',false]);
      F.objs.push([plan?plan.text:'',plan&&plan.first,plan&&!plan.first?'warn':'']);
      F.widgets.push({id:'eta',kind:'timer',label:'Truck',v:Math.max(0,S.time),hot:S.time<12});
      F.meters.push({id:'wall',label:'Roadblock',v:plan?plan.rank:0,max:5,style:'bar',sub:plan?plan.verdict:'clear',warn:4,warnBelow:true});
      if(S.time<=0){S.ph='truck';if(S.props)S.props.ghostOff();if(P.carry)dropCarry(M);startTruck(M);say('doug',"Here it comes. Nobody be a hero. Be a sawhorse.")}
      if(S.t>4&&S.flagger==null&&S.props&&S.props.list.length){S.flagger=true;say(role(M,'supply').id||'hank',"I'll hold the paddle. I've been waiting my whole life to hold the paddle.")}
      if(S.hank&&S.flagger&&!S.hank.posted){S.hank.posted=true;walkTo(S.hank,383,93.4,1.6);S.hank.face={x:383,z:110}}return}
    if(S.ph==='truck'){truckTick(dt,M,F);return}
    if(S.ph==='stopped'){const d=S.driver;F.objs.push(['The truck stopped. Zip-tie the driver (E)',false]);if(d&&d.state==='surrender')F.target={x:d.pos.x,z:d.pos.z,label:'Zip-tie'};
      if(d&&d.state==='cuffed'&&!S.done){S.done=true;M.fn.st.cuffs++;M.fn.st.block=plan?plan.verdict:'stop';sayAll([['sal',"I'll tow it back to the stage. Gently. Like it's my own truck. It's not. It's better."],['benny',"Speakers are in the back! I hear them! They're fine!"],
          ['dee',"His crew's coming up from Mill St. The stage goes back up, the families stay on the porches, and nobody touches a funnel cake."]]);advance(M,'defend')}}},
  hud(st,M){},
  clear(M){const a=A(),S=M.fn.sub;if(a.P.carry&&String(a.P.carry.kind).startsWith('fin:'))dropCarry(M);if(S.hank)unperson(S.hank)},
  bot(a,t,o,M,B){const S=M.fn.sub,P=a.P;if(S.ph!=='build'){if(S.ph==='stopped'&&S.driver&&S.driver.state==='surrender'){P.pos.set(S.driver.pos.x+1.2,0,S.driver.pos.z);if(t%6===0)a.useTap=true}return}
    if(o.fail){P.pos.set(W.hank.x+3,0,W.hank.z-6);return}
    /* east lane: two sawhorses side by side at z 90, a sign 12 m before it, a flare at the wall; then wait */
    const want=[['sawhorse',381.1,90.2,0],['sawhorse',383.0,90.2,0],['sign',381,104,Math.PI],['flare',381,91.6,0]];const k=B.k||0;if(k>=want.length){P.pos.set(386,0,84);return}
    const w=want[k];const c=P.carry;if(!c){S.kind=S.kinds.indexOf(w[0]);P.pos.set(W.hank.x,0,W.hank.z+2.6);grab(M);return}
    P.pos.set(w[1],0,w[2]);const sn=S.props.snap(w[0],w[1],w[2],w[3],{yaw:w[3]});place(M,w[0],sn);B.k=k+1}};
function cycle(M){const S=M.fn.sub;for(let i=1;i<=4;i++){const k=(S.kind+i)%4;if(S.left[S.kinds[k]]>0){S.kind=k;A().feed('Next from the tailgate: '+S.kinds[k],'info');return}}}
function grab(M){const a=A(),S=M.fn.sub;let k=S.kinds[S.kind];if(!(S.left[k]>0)){cycle(M);k=S.kinds[S.kind];if(!(S.left[k]>0)){say(role(M,'supply').id||'hank',"That's everything. I'd bring more but I'd have to sell the store.",true);return}}
  const n=k==='cone'?Math.min(2,S.left[k]):1;S.left[k]-=n;const g=S.props.carryMesh(k,n);a.wmCarry('fin:'+k,g,{n,kind:k});if(!(S.left[k]>0))cycle(M)}
function place(M,k,sn){const a=A(),S=M.fn.sub,c=a.P.carry;if(!c)return;S.props.add(k,sn.x,sn.z,sn.yaw,{lit:k==='flare',stackOn:sn.stack});c.it.n--;S.props.free(c.mesh);a.wmDrop();
  if(c.it.n>0){const g=S.props.carryMesh(k,c.it.n);a.wmCarry('fin:'+k,g,c.it)}else S.props.ghostOff();try{a.snd&&a.snd('cuff',.3)}catch(_){}}
function dropCarry(M){const a=A(),S=M.fn.sub,c=a.P.carry;if(!c)return;try{S.props&&S.props.free(c.mesh)}catch(_){}a.wmDrop();if(c.it&&c.it.kind)S.left[c.it.kind]=(S.left[c.it.kind]||0)+(c.it.n||1)}
function readNow(M){const a=A(),S=M.fn.sub,rb=HT.Jobs.get('cones')&&HT.Jobs.get('cones').readBlock;const items=[];
  for(const p of S.props.list){if(p.state==='flying')continue;const f=S.props.foot(p),cls=p.state==='down'?(p.kind==='flare'?'signal':'soft'):HT.Props.KINDS[p.kind].cls;items.push({x0:f.x0,x1:f.x1,z0:f.z0,z1:f.z1,cls:p.kind==='sign'&&p.state!=='down'?'medium':cls,kind:p.kind,lit:p.lit,down:p.state==='down'})}
  const cars=[];if(S.van)cars.push(S.van);if(S.pickup)cars.push(S.pickup);for(const v of cars){const hl=v.S.l/2,hw=v.S.w/2,c=Math.abs(Math.cos(v.yaw)),s=Math.abs(Math.sin(v.yaw)),hx=s*hl+c*hw,hz=c*hl+s*hw;items.push({x0:v.x-hx,x1:v.x+hx,z0:v.z-hz,z1:v.z+hz,cls:'hard',kind:'car'})}
  for(const e of a.L.cars||[]){if(!e.obj||e===a.CV)continue;if(Math.abs(e.pos.x-380)>8||e.pos.z<BLOCK_ZONE.z0-4||e.pos.z>BLOCK_ZONE.z1+4)continue;const S_=a.carSize(e),c=Math.abs(Math.cos(e.yaw)),s=Math.abs(Math.sin(e.yaw)),hl=S_.l/2,hw=S_.w/2,hx=s*hl+c*hw,hz=c*hl+s*hw;items.push({x0:e.pos.x-hx,x1:e.pos.x+hx,z0:e.pos.z-hz,z1:e.pos.z+hz,cls:'hard',kind:'car'})}
  if(S.hank&&S.flagger&&S.hank.posted&&S.hank.tx==null)items.push({x0:S.hank.x-.45,x1:S.hank.x+.45,z0:S.hank.z-.3,z1:S.hank.z+.3,cls:'soft',kind:'crew',flagger:true});
  if(rb){const r=rb(items,{zone:BLOCK_ZONE,need:BK.need,lane:380.5});r.text=wording(r);return r}
  return{first:null,verdict:'clear',rank:0,text:'(the roadblock reader is loading)'}}
function wording(r){const g=r.top;if(!g)return"Nothing in the road yet. He won't even slow down.";const v=g.verdict;
  return v==='airtight'?'Airtight: two cars and a lit flare. He stops. He might even apologise.':v==='stop'?'He stops: '+g.why+'.':v==='gap'?'He drives through the gap ('+(g.pass?g.pass.w.toFixed(1):'?')+' m). Close it.':
    v==='cones'?'Only cones: he drives right over them. Sawhorses or a car.':v==='bully'?"Sawhorses he'd push through: add the sign before it, the flagger or a lit flare.":v==='shove'?"One car he can shove: make it official (sign, flare) or add another car.":g.why}
function startTruck(M){const a=A(),S=M.fn.sub;const path=FN.avoidCars(FN.route([{x:W.truck.x+10,z:W.truck.z},{x:380.5,z:112},{x:380.5,z:BK.arriveZ-6}]),{skip:e=>Math.abs(e.pos.x-380)<6&&e.pos.z>80&&e.pos.z<97});S.tP=FN.polyOf(path);S.tr=FN.car('workvan','#d8d2c4',path[0].x,path[0].z,FN.yawTo(path[1].x-path[0].x,path[1].z-path[0].z));
  const ts=sign(['STAGE & SOUND · RIVERSIDE FESTIVAL'],{bg:'#f2efe6',fg:'#2b5d8a',w:2.6,ph:80});ts.position.set(0,1.75,1.03);S.tr.obj.add(ts);S.ts=0;S.tv=BK.truckV;S.frozen=null}
function truckTick(dt,M,F){const a=A(),S=M.fn.sub,T=S.tr;const pl=S.frozen||S.plan;const q0=S.tP.at(S.ts);
  /* freeze the read once he's close (what he sees is what he gets) */if(!S.frozen&&pl&&pl.first&&q0.z-pl.first.z1<30&&q0.x<386)S.frozen=pl;
  let cap=BK.truckV;const front=T.S.l/2;if(pl&&pl.first&&q0.x<386){const d=q0.z-front-(pl.first.z1+BK.stopShort);cap=Math.min(cap,Math.sqrt(Math.max(0,2*BK.dec*d)))}
  S.tv+=clamp(cap-S.tv,-BK.dec*1.6*dt,3*dt);S.ts=Math.min(S.tP.len,S.ts+S.tv*dt);const q=S.tP.at(S.ts);T.spd=S.tv;FN.placeCar(T,q.x,q.z,q.yaw,dt);
  if(S.props&&S.tv>.6){const f={x:-Math.sin(q.yaw),z:-Math.cos(q.yaw)};const circ=[0,1.6,-1.6].map(o=>({x:q.x+f.x*o,z:q.z+f.z*o,r:1.25}));const h=S.props.hit(circ,f.x*S.tv,f.z*S.tv,S.tv,'truck');if(h&&h.slow)S.tv*=1-h.slow*.3}
  F.objs.push(['The stage truck is coming up 3rd St',false]);F.target={x:q.x,z:q.z,label:'Stage truck'};
  if(S.tv<.3&&pl&&pl.first&&S.ts>20){S.ph='stopped';const e=a.spawnEnemy(q.x-1.6,q.z,false);a.equip(e.dude,null);e.gun=null;e.noLeash=true;e.hp=e.maxhp=60;a.surrender(e);e.driver=true;S.driver=e;a.rebuildTargets();
    M.fn.st.truck='stopped';say('stage truck driver',pick(["Okay! Okay. That's a lot of sawhorses. Is that a man with a STOP paddle? I respect the paddle.","Fine! It's your truck anyway! The radio said this would be easy!"]),true);return}
  if(q.z<BK.arriveZ){M.loseWhy='roadblock:through';M.fn.st.truck='through';a.endMission(false,"The stage truck drove right through and parked across Main St. The parade has nowhere to go. "+(pl?wording(pl):''),'He got through.')}}

/* ===================================================================== STAGE 5: HOLD THE STREET ===================================================================== */
const DK={crate:6,bubble:25,wave:13,calmDrain:3.2,tip:12,heavyFrom:3,maxWaves:12,messT:4,tackle:1.5,crewV:3.2};
const STREETS=[{x:347,z0:99,z1:48},{x:379,z0:99,z1:48}];
FN.stages.defend={
  build(M){const a=A(),S=M.fn.sub;FN.festSet(M,'build',0);FN.extras(M,'setup',{n:4,skipPorch:[0,1,2,3]});S.ring=FN.bubbleRing(M,396,47.6,25);S.pct=0;S.calm=100;S.t=0;S.waveT=6;S.wave=0;S.pushers=[];S.crates=0;S.hold=null;
    S.rate=role(M,'stage').v;S.drain=role(M,'porch').v;
    /* the families on the stoops (with your own), the Adeyemis handing out water */
    family(M,[{x:W.porches[0].x,z:W.porches[0].z,face:{x:387,z:40}},{x:W.porches[0].x+1.2,z:W.porches[0].z+.2,face:{x:388,z:40}},{x:W.porches[0].x-1.1,z:W.porches[0].z+.2,face:{x:386,z:40}},
      {x:W.porches[1].x,z:W.porches[1].z,face:{x:393,z:40}},{x:W.porches[1].x+1,z:W.porches[1].z,face:{x:394,z:40}},{x:W.porches[2].x,z:W.porches[2].z,face:{x:399,z:40}}]);
    S.adults=[['adeyemi',W.porches[2].x+1.3,W.porches[2].z],['mrsA',W.porches[3].x,W.porches[3].z],[role(M,'porch').id||'rosa',W.porches[1].x-1.6,W.porches[1].z-1.2]].map(([id,x,z])=>{const p=person(id,x,z);if(p)p.face={x,z:40};return p}).filter(Boolean);
    S.stage=[role(M,'stage').id||'benny','dave'].filter((v,i,ar)=>ar.indexOf(v)===i).map((id,i)=>person(id,W.stage.x+1+i*1.6,W.stage.z-1.6)).filter(Boolean);
    S.benny=FN.car('workvan','#f5d0e0',W.benny.x,W.benny.z,W.benny.yaw);const bs=sign(["BENNY'S BRAIN FREEZE"],{bg:'#f5d0e0',fg:'#b23a6a',w:2.4,ph:80});bs.position.set(0,1.75,1.03);S.benny.obj.add(bs);
    {const k=kit();for(let i=0;i<6;i++)k.add(.7,.5,.6,'#1e2024',W.benny.x+3.2+(i%2)*.75,.25+Math.floor(i/4)*.5,W.benny.z+.8-((i>>1)%2)*.7);S.pile=k.mesh();a.wmAdd(S.pile)}
    /* the street team: whoever isn't on a post, on the two corners */
    const used=new Set(Object.values((M.fn.plan||{}).assign||{}));const free=FN.PLAN_DEF.crew.map(c=>c.id).filter(id=>!used.has(id));while(free.length<2)free.push(['gary','rick','dave','doug'].find(x=>!free.includes(x)));
    S.team=free.slice(0,2).map((id,i)=>{const s=STREETS[i];const p=person(id,s.x+1.5,56);if(p){p.post={x:s.x+1.5,z:56};p.face={x:s.x,z:90};p.st='post'}return p}).filter(Boolean);
    if(once(M,'df0'))sayAll([['rosa',"Families on the porches, crew on the street, and I'm triaging anybody who says 'I'm fine'."],['adeyemi',"We moved in for the schools. We stayed for whatever this is. Water?"],
      ['benny',"Speaker crates on the back of my truck! Every crate you carry to the stage is a minute I don't have to!"]])},
  upd(dt,M,F){const a=A(),S=M.fn.sub,P=a.P;S.t+=dt;
    /* the 25 m rule: hands only near the family and the kids */
    const kid=nearKid(M,P.pos.x,P.pos.z),near=kid<DK.bubble;const carrying=!!(P.carry&&P.carry.kind==='fin:crate');
    if(near||carrying){if(!S.noGun){S.noGun=true;a.holster(true)}M.noGuns=carrying?'Hands are full.':"Not with the family right there. Hands only.";}else if(S.noGun){S.noGun=false;M.noGuns=false;a.holster(false)}
    S.pct=Math.min(100,S.pct+S.rate*dt);FN.festSet(M,'build',S.pct);
    /* crates: Benny's truck -> the stage */
    const pile={x:W.benny.x+3.6,z:W.benny.z+.5};if(!carrying&&!P.carry){if(hyp(P.pos.x-pile.x,P.pos.z-pile.z)<2.6)F.taps.push({x:pile.x,z:pile.z,r:2.6,txt:'Grab a speaker crate',fn:()=>crateGrab(M)})}
    else if(carrying){const st={x:W.stage.x+W.stage.w/2+.6,z:W.stage.z};F.taps.push({x:st.x,z:st.z,r:3,txt:'Put the crate on the stage',fn:()=>crateDrop(M)});if(hyp(P.pos.x-st.x,P.pos.z-st.z)>3)F.target={x:st.x,z:st.z,label:'Stage'};
      /* walk, don't run, with a speaker */if(P.spd>2.6){}}
    waves(dt,M);pushTick(dt,M);teamTick(dt,M);
    const live=S.pushers.filter(p=>p.e.state==='idle'&&!p.gone);
    F.objs.push(['Hold the street while the stage goes back up · '+Math.floor(S.pct)+'%',S.pct>=100]);
    F.objs.push([near?'Hands only here: family within 25 m. Run into them (Shift) to tackle, E to zip-tie':'Tackle troublemakers (sprint into them), E to zip-tie. Beanbags only out past the porches',false]);
    F.objs.push(['Carry speaker crates from Benny\'s truck to the stage (E) to speed it up',false]);
    if(live.length&&!F.target){const n=live.sort((x,y)=>hyp(x.e.pos.x-P.pos.x,x.e.pos.z-P.pos.z)-hyp(y.e.pos.x-P.pos.x,y.e.pos.z-P.pos.z))[0];F.target={x:n.e.pos.x,z:n.e.pos.z,label:n.heavy?'Armed: keep him out past the porches':'Troublemaker'}}
    if(!F.target&&!carrying)F.target={x:pile.x,z:pile.z,label:'Speaker crates'};
    F.meters.push({id:'stage',label:'Stage',v:Math.floor(S.pct),max:100,style:'bar',sub:Math.floor(S.pct)+'%'});F.meters.push({id:'calm',label:'Festival calm',v:Math.round(S.calm),max:100,style:'bar',warn:35,warnBelow:true,icon:'heart'});
    M.fn.st.calmMin=Math.min(M.fn.st.calmMin,S.calm);
    if(S.calm<=0){M.loseWhy='defend:calm';return a.endMission(false,"Too many stalls tipped over. The families went inside. The festival will have to be next Saturday.",'The street emptied.')}
    if(S.pct>=100&&!S.done){S.done=true;for(const p of S.pushers)if(p.e.state==='idle'){p.gone=true;p.e.script={kind:'to',x:p.e.pos.x,z:115,speed:4.5,then:()=>vanish(p)}}
      FN.festSet(M,2);try{HT.Audio&&HT.Audio.music&&HT.Audio.music('victory')}catch(_){}
      sayAll([['benny',"SOUND CHECK! One, two! One, two! ...Is it supposed to play the ice cream song? It's playing the ice cream song."],['doug',"Black sedan on Mill St. Engine running. That's him. He's leaving."],['rick',"Your van's on 2nd St. Keys are in it. We'll be right behind you. Like a convoy. Like a carpool."]]);
      if(P.carry)crateDrop(M,true);advance(M,'chase')}},
  clear(M){const a=A(),S=M.fn.sub;if(S.noGun){M.noGuns=false;a.holster(false);S.noGun=false}if(a.P.carry&&a.P.carry.kind==='fin:crate'){a.wmDrop()}
    for(const p of S.pushers||[])vanish(p);for(const p of(S.kids||[]).concat(S.adults||[],S.stage||[],S.team||[]))unperson(p)},
  bot(a,t,o,M,B){const S=M.fn.sub,P=a.P;const live=S.pushers.filter(p=>!p.gone&&(p.e.state==='idle'||p.e.state==='surrender'));
    const tg=live.find(p=>p.e.state==='surrender')||live.find(p=>!p.heavy&&p.e.pos.z<60);if(tg){if(P.carry)crateDrop(M,true);P.pos.set(tg.e.pos.x+1,0,tg.e.pos.z);a.collide(P.pos,.35);if(tg.e.state==='idle'){a.keys.shift=true;P.moving=true;a.keys.w=true}else{a.keys.shift=false;a.keys.w=false;if(t%4===0)a.useTap=true}return}
    a.keys.shift=false;a.keys.w=false;const hv=live.find(p=>p.heavy);if(hv&&hv.e.pos.z<70){hv.e.hp=0;}
    const ph=t%90;if(!P.carry){if(ph<40)return;P.pos.set(W.benny.x+3.6,0,W.benny.z+1.8);if(t%5===0)a.useTap=true}else{if(ph<80)return;P.pos.set(W.stage.x+W.stage.w/2+.8,0,W.stage.z);if(t%5===2)a.useTap=true}}};
function crateGrab(M){const a=A(),T=a.THREE,g=new T.Group();g.add(kit().add(.62,.48,.5,'#1e2024',0,0,0).add(.4,.3,.02,'#3a3d42',0,0,.26).mesh());a.wmCarry('fin:crate',g,null);g.position.set(0,.84,.4)}
function crateDrop(M,quiet){const a=A(),S=M.fn.sub,c=a.P.carry;if(!c)return;a.wmDrop();if(quiet)return;S.crates++;S.pct=Math.min(100,S.pct+DK.crate);a.feed('Speaker crate on the stage','trust','+'+DK.crate+'%');if(S.crates===1)say('benny',"Careful, that one's the bass. The bass has feelings.")}
/* waves of his crew from Mill St: troublemakers for the stalls (unarmed), and from wave 3 one armed man who stays out past the porches */
function waves(dt,M){const a=A(),S=M.fn.sub;if(S.done)return;S.waveT-=dt;if(S.waveT>0||S.wave>=DK.maxWaves)return;S.wave++;S.waveT=DK.wave;
  const n=S.wave<2?1:2;for(let i=0;i<n;i++){const st=STREETS[(S.wave+i)%2];spawnPusher(M,st.x+(Math.random()-.5)*2,st.z0+i*3)}
  if(S.wave>=DK.heavyFrom&&S.wave%2===1){const st=STREETS[S.wave%2];const e=a.spawnEnemy(st.x,st.z0-6,false);e.noLeash=true;e.loud=1;tag(e,'HIS CREW · ARMED');S.pushers.push({e,heavy:true,st:'fight'});a.rebuildTargets();if(once(M,'heavy'))say('doug',"Armed one on "+(st.x<360?'2nd':'3rd')+" St. Out past the porches you can use the beanbag. Near the families: hands only.",true)}
  if(S.wave===1)say('dee',pick(["Here they come. Up from Mill St. Two of them look like they've never been to a festival. That's sad, actually."]))}
function tag(e,t){const el=D.createElement('div');el.className='tag';el.textContent=t;const host=D.getElementById('tags');if(host){if(e.tag)e.tag.remove();host.appendChild(el);e.tag=el}}
function spawnPusher(M,x,z){const a=A(),S=M.fn.sub;const e=a.spawnEnemy(x,z,false);a.equip(e.dude,null);e.gun=null;e.noLeash=true;e.hp=e.maxhp=50;tag(e,'HIS CREW');
  const stalls=[365,371,377,383,389,395];const sx=stalls[Math.floor(Math.random()*stalls.length)]+1,sz=W.fest.z1-.4;const p={e,heavy:false,st:'walk',tx:sx,tz:sz};
  e.script={kind:'to',x:x,z:60,speed:3.1,then:()=>{e.script={kind:'to',x:sx,z:sz,speed:2.8,then:()=>{p.st='mess';p.t=DK.messT;hold(e)}}}};S.pushers.push(p);a.rebuildTargets()}
function pushTick(dt,M){const a=A(),S=M.fn.sub,P=a.P;const sprint=P.moving&&a.keys.shift&&!a.CV;
  for(const p of S.pushers){const e=p.e;if(p.gone)continue;if(e.state==='cuffed'){if(!p.counted){p.counted=1;M.fn.st.cuffs++}continue}if(e.state==='dead'){if(!p.counted){p.counted=1;M.fn.st.lethal+=p.heavy?0:1}continue}
    if(e.state==='surrender'){continue}
    if(p.heavy){/* inside the bubble he holsters and turns troublemaker: no guns near the families, his either */if(nearKid(M,e.pos.x,e.pos.z)<DK.bubble+3&&e.gun){a.equip(e.dude,null);e.gun=null;e.loud=0;p.heavy=false;p.st='walk';e.script={kind:'to',x:W.stage.x+8,z:W.fest.z1-.4,speed:2.8,then:()=>{p.st='mess';p.t=DK.messT;hold(e)}}}continue}
    if(sprint&&hyp(e.pos.x-P.pos.x,e.pos.z-P.pos.z)<DK.tackle){a.surrender(e);e.script=null;say('troublemaker',pick(["Ow! Okay! I give! Is that a dad? That's a DAD.","Fine! I was only going to knock over the kettle corn!"]),true);continue}
    if(p.st==='mess'){p.t-=dt;S.calm-=DK.calmDrain*S.drain*dt;if(p.t<=0){S.calm-=DK.tip*S.drain;p.st='tipped';a.feed('A stall got knocked over','bad','festival calm');p.gone=true;e.script={kind:'to',x:e.pos.x,z:115,speed:4.5,then:()=>vanish(p)}}}}}
/* an unarmed man is never left without a script (the combat AI would pick him up): stand here */
function hold(e){if(e.state!=='idle')return;e.script={kind:'to',x:e.pos.x,z:e.pos.z,speed:.01,then:()=>hold(e)}}
function vanish(p){const a=A(),e=p.e;if(!e||e.state==='cuffed')return;p.gone=true;e.script={kind:'incar'};e.state='dead';e.hp=0;if(e.tag){e.tag.remove();e.tag=null}if(e.dude.root.parent)e.dude.root.parent.remove(e.dude.root);const k=a.enemies.indexOf(e);if(k>=0)a.enemies.splice(k,1);a.rebuildTargets()}
/* the street team: walk to a troublemaker near their corner, a word, and he sits down on the kerb */
function teamTick(dt,M){const S=M.fn.sub;for(const c of S.team){if(c.st==='post'){const tg=S.pushers.find(p=>!p.gone&&!p.heavy&&p.e.state==='idle'&&!p.claimed&&hyp(p.e.pos.x-c.post.x,p.e.pos.z-c.post.z)<16);if(tg){tg.claimed=c;c.tgt=tg;c.st='go'}}
  else if(c.st==='go'){const e=c.tgt.e;if(e.state!=='idle'||c.tgt.gone){c.st='back';continue}walkTo(c,e.pos.x+.7,e.pos.z,DK.crewV);if(hyp(c.x-e.pos.x,c.z-e.pos.z)<1.3){c.st='talk';c.t=2.6;hold(e)}}
  else if(c.st==='talk'){c.t-=dt;const e=c.tgt.e;if(c.t<=0){if(e.state==='idle'){A().surrender(e);e.script=null}c.st='back';say(c.id,pick(["Sit down, son. Have a lemonade. Then we'll talk about your choices.","You know my wife? No? Good. Sit."]))}}
  else if(c.st==='back'){walkTo(c,c.post.x,c.post.z,2);if(hyp(c.x-c.post.x,c.z-c.post.z)<.6){c.st='post';c.face={x:c.post.x,z:90}}}}}
})();
