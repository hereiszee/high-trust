/* =====================================================================
   HT.Escort: the walking escort helper (SPEC3 4.9, built for Higher Ground, reused by Crossing Guard and the finale).
   A protected party walks a polyline route in a chain, stops at marked corners until released, freezes and takes cover while
   a threat is live, counts how long it has been pinned, tracks a protected member's health with one revive, fires triggers as
   the lead passes distances along the route, and writes radio callouts ("two o'clock, red jacket, behind the dumpster").
   Pure logic plus an optional pose callback, so it runs in Node (dev/jobs-registry.test.js) and in the game.

   const E=HT.Escort.create({
     path:[{x,z,stop:'Corner label'?},...],          // metres; stop: the lead waits there until E.release()
     party:[{id,dude?,gap:1.4,side:.4,speed:1.2,protect:true?,hp:100}],   // chain order: party[0] leads
     speed:1.2, pinLimit:30, revives:1, ground:(x,z)=>y,
     triggers:[{at:metres,fn(E)}] });
   E.step(dt,{threat:bool, pose:(dude,dt,{moving,speed,mode,aim})=>{}, face:{x,z}|null})
   E.state      'walk' | 'stop' (waiting at a corner) | 'hold' (threat: crouched in cover) | 'done'
   E.release()  leave the current stop        E.hit(id,dmg) -> 'ok'|'down'|'dead'      E.protectHp() 0..1
   E.detach(id,{x,z},speed,then) / E.rejoin(id)   send one member off the chain (Gary to zip-tie someone) and back
   E.near(x,z)  distance to the nearest member     E.lead / E.member(id)     E.save() / E.load(state)
   HT.Escort.clock(fromX,fromZ,viewYaw,x,z) -> "two o'clock"     HT.Escort.callout({clock,desc,spot,dist}) -> sentence
   HT.Escort.words(n) -> "sixty"
   ===================================================================== */
(function(root){'use strict';
const HT=root.HT=root.HT||{};
const CLOCK=['twelve','one','two','three','four','five','six','seven','eight','nine','ten','eleven'];
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function words(n){n=Math.round(n);if(n<20)return ONES[Math.max(0,n)];if(n<100){const t=TENS[Math.floor(n/10)],o=n%10;return o?t+'-'+ONES[o]:t}
  if(n<1000){const h=Math.floor(n/100),r=n%100;return ONES[h]+' hundred'+(r?' and '+words(r):'')}return String(n)}
/* clock bearing from a viewer facing viewYaw (the game's yaw: forward = (-sin yaw, -cos yaw)) */
function clock(fx,fz,yaw,x,z){const b=Math.atan2(-(x-fx),-(z-fz));let d=yaw-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
  let h=Math.round(d/(Math.PI/6));h=((h%12)+12)%12;return CLOCK[h]+" o'clock"}
/* rounded the way a spotter says it: "about sixty metres" */
function range(d){const r=d<30?Math.round(d/5)*5:Math.round(d/10)*10;return words(r)+' metres'}
function callout(o){const parts=[];if(o.clock)parts.push(o.clock.replace(/^\w/,c=>c.toUpperCase()));if(o.desc)parts.push(o.desc);if(o.spot)parts.push(o.spot);let s=parts.join(', ');
  if(o.dist!=null)s+=(s?', ':'')+range(o.dist);return s+'.'}

function create(o){o=o||{};
  const path=(o.path||[]).map(p=>Object.assign({},p));if(path.length<2)throw new Error('HT.Escort: a path needs two points');
  /* cumulative distance along the path */
  const cum=[0];for(let i=1;i<path.length;i++)cum.push(cum[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z));
  const total=cum[cum.length-1];
  const at=s=>{s=Math.max(0,Math.min(total,s));let i=1;while(i<cum.length-1&&cum[i]<s)i++;const a=path[i-1],b=path[i],L=cum[i]-cum[i-1]||1,t=(s-cum[i-1])/L;
    const dx=(b.x-a.x)/L,dz=(b.z-a.z)/L;return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dx,dz,i}};
  let gapSum=0;
  const party=(o.party||[]).map((m,k)=>{const g=k?(m.gap!=null?m.gap:1.4):0;gapSum+=g;
    return{id:m.id,dude:m.dude||null,back:gapSum,side:m.side||0,speed:m.speed||o.speed||1.2,protect:!!m.protect,hp:m.hp!=null?m.hp:100,maxhp:m.hp!=null?m.hp:100,
      down:false,pos:{x:0,z:0},yaw:0,moving:false,crouch:false,free:null,face:null}});
  const E={path,total,party,s:0,state:'walk',stopK:-1,stopsDone:{},pinT:0,pinnedFor:0,revives:o.revives!=null?o.revives:1,revived:0,
    pinLimit:o.pinLimit||30,triggers:(o.triggers||[]).map(t=>Object.assign({fired:false},t)),speed:o.speed||1.2,ground:o.ground||(()=>0),elapsed:0,holdT:0};
  E.at=at;
  /* where member m stands when the chain is at lead distance s: on the path, offset sideways */
  E.slot=(m,s)=>{const p=at((s==null?E.s:s)-m.back);return{x:p.x-p.dz*m.side,z:p.z+p.dx*m.side,yaw:Math.atan2(-p.dx,-p.dz)}};
  E.member=id=>party.find(m=>m.id===id)||null;
  Object.defineProperty(E,'lead',{get:()=>party[0]});
  E.protected=()=>party.find(m=>m.protect)||party[0];
  E.protectHp=()=>{const m=E.protected();return m?Math.max(0,m.hp)/m.maxhp:1};
  E.progress=()=>E.s/total;
  E.remaining=()=>total-E.s;
  E.nextStop=()=>{for(let i=0;i<path.length;i++)if(path[i].stop&&!E.stopsDone[i]&&cum[i]>=E.s-.01)return{i,label:path[i].stop,at:cum[i],x:path[i].x,z:path[i].z};return null};
  E.release=()=>{if(E.state==='stop'){E.stopsDone[E.stopK]=true;E.stopK=-1;E.state='walk';return true}return false};
  E.near=(x,z)=>{let d=1e9;for(const m of party)d=Math.min(d,Math.hypot(m.pos.x-x,m.pos.z-z));return d};
  E.detach=(id,to,speed,then)=>{const m=E.member(id);if(!m)return false;m.free={x:to.x,z:to.z,speed:speed||3.2,then:then||null,arrived:false};return true};
  E.rejoin=id=>{const m=E.member(id);if(m&&m.free)m.free={rejoin:true,speed:m.free.speed||3.2};};
  /* damage the protected member: 0 hp -> down (one revive brings him back at 40), a second time -> dead */
  E.hit=(id,d)=>{const m=id?E.member(id):E.protected();if(!m||m.down)return m&&m.down?'down':'ok';m.hp-=d;
    if(m.hp<=0){m.hp=0;if(E.revived<E.revives){m.down=true;m.downT=o.reviveT||5;E.revived++;return'down'}return'dead'}return'ok'};
  E.step=(dt,ctx)=>{ctx=ctx||{};E.elapsed+=dt;const threat=!!ctx.threat,pose=ctx.pose;
    /* revive in progress: the chain waits */
    const downed=party.find(m=>m.down);if(downed){downed.downT-=dt;if(downed.downT<=0){downed.down=false;downed.hp=Math.max(downed.hp,40)}}
    if(E.state!=='done'){
      if(threat||downed){if(E.state==='walk'||E.state==='stop')E.prev=E.state;if(E.state!=='hold')E.holdT=0;E.state='hold';E.holdT+=dt}
      else if(E.state==='hold'){E.state=E.prev==='stop'&&E.stopK>=0?'stop':'walk';E.holdT=0}
      E.pinT=E.state==='hold'&&threat?E.pinT+dt:Math.max(0,E.pinT-dt*2);E.pinnedFor=Math.max(E.pinnedFor,E.pinT);
      if(E.state==='walk'){const ns=E.nextStop();let want=E.s+E.speed*dt;
        if(ns&&want>=ns.at){want=ns.at;E.state='stop';E.stopK=ns.i}
        if(want>=total){want=total;E.state='done'}
        E.s=want}
      for(const t of E.triggers)if(!t.fired&&E.s>=t.at){t.fired=true;try{t.fn&&t.fn(E)}catch(e){if(root.console)console.warn('[escort] trigger',e)}}}
    /* members: chain slots, or their own errand */
    for(const m of party){const prev={x:m.pos.x,z:m.pos.z};let tx,tz,face=null;
      if(m.free&&!m.free.rejoin){tx=m.free.x;tz=m.free.z}else{const sl=E.slot(m);tx=sl.x;tz=sl.z;face=sl.yaw}
      if(!m.placed){m.pos.x=tx;m.pos.z=tz;m.placed=true;m.yaw=face||0}
      const dx=tx-m.pos.x,dz=tz-m.pos.z,d=Math.hypot(dx,dz);let sp=m.free?m.free.speed:m.speed;
      /* catch up to the slot a little faster than the chain moves; snap when close */
      if(!m.free&&d>.6)sp=Math.max(sp,E.speed*1.6+d*.4);
      if(m.down){sp=0}
      if(d>.05&&sp>0){const st=Math.min(d,sp*dt);m.pos.x+=dx/d*st;m.pos.z+=dz/d*st;if(d>.25)m.yaw=turn(m.yaw,Math.atan2(-dx,-dz),dt*8)}
      else if(face!=null&&!m.free)m.yaw=turn(m.yaw,ctx.face?Math.atan2(-(ctx.face.x-m.pos.x),-(ctx.face.z-m.pos.z)):face,dt*4);
      if(m.free&&!m.free.rejoin&&d<.5&&!m.free.arrived){m.free.arrived=true;const f=m.free.then;if(f)try{f(m)}catch(e){if(root.console)console.warn('[escort] errand',e)}}
      if(m.free&&m.free.rejoin&&d<.4)m.free=null;
      m.moving=Math.hypot(m.pos.x-prev.x,m.pos.z-prev.z)>dt*.25;m.crouch=E.state==='hold'&&!m.free&&!m.down;
      if(m.dude){const r=m.dude.root;r.position.set(m.pos.x,E.ground(m.pos.x,m.pos.z),m.pos.z);r.rotation.y=m.yaw+Math.PI;
        if(pose)pose(m.dude,dt,{moving:m.moving,speed:Math.min(1.6,Math.max(.6,(m.free?m.free.speed:sp)/1.25)),aim:false,mode:m.down?'down':m.crouch?'crouch':'stand'})}}
    return E.state};
  E.save=()=>({s:+E.s.toFixed(2),state:E.state==='hold'?(E.prev||'walk'):E.state,stopK:E.stopK,stopsDone:Object.keys(E.stopsDone).map(Number),revived:E.revived,
    hp:party.map(m=>Math.round(m.hp)),fired:E.triggers.map(t=>t.fired?1:0)});
  E.load=st=>{if(!st)return;E.s=st.s||0;E.state=st.state==='done'?'done':st.state==='stop'?'stop':'walk';E.stopK=st.stopK!=null?st.stopK:-1;E.stopsDone={};for(const k of st.stopsDone||[])E.stopsDone[k]=true;
    E.revived=st.revived||0;(st.hp||[]).forEach((h,k)=>{if(party[k])party[k].hp=h});(st.fired||[]).forEach((f,k)=>{if(E.triggers[k])E.triggers[k].fired=!!f});
    for(const m of party){m.placed=false;m.free=null;m.down=false}E.pinT=0};
  return E}
function turn(a,b,k){let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return a+d*Math.min(1,k)}
HT.Escort={create,clock,callout,words,range,turn};
if(typeof module!=='undefined'&&module.exports)module.exports=HT.Escort;
})(typeof window!=='undefined'?window:globalThis);
