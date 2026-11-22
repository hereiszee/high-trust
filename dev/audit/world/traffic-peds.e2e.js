/* Traffic against people on foot who are not the player. node dev/audit/world/traffic-peds.e2e.js
   On a long straight road a traffic car (OW.trafficAdd, the same entry traffic-check.js uses) approaches, at 9 and 13 m/s,
   (a) a crew member standing in the lane, (b) a kid (People 'nb_kid' model, protected) standing in the lane, (c) a neighbour adult,
   with the player on foot on the far kerb. Records the minimum distance from the person to the car's box and whether the car stopped.
   Expected: traffic stops short of anyone on the road (it does for the player, k:'foot'), never drives through a person. */
const {open,log,ok,out}=require('./lib.js');
(async()=>{const W=await open();const {p,ev,step}=W;
  await ev(()=>{const H=window.__ht;H.step(3);H.openBridge();H.step(2);const O=H.ow,G=O.roads();H.OWS.trafficWant=0;
    const T=window.__TP={};T.clear=()=>{H.OWS.noTraffic=true;H.step(1);H.OWS.noTraffic=false};
    T.edges=[];for(const [i,n] of G.nodes.entries())for(const e of n.e){const m=G.nodes[e.to],l=Math.hypot(m.x-n.x,m.z-n.z);T.edges.push({a:i,b:e.to,l,region:O.regionAt((n.x+m.x)/2,(n.z+m.z)/2)})}
    T.lanePt=(a,b,at,side)=>{const A=G.nodes[a],B=G.nodes[b],l=Math.hypot(B.x-A.x,B.z-A.z),ux=(B.x-A.x)/l,uz=(B.z-A.z)/l,s=side==null?1.5:side;return{x:A.x+ux*at-uz*s,z:A.z+uz*at+ux*s,ux,uz}};
    T.boxD=(t,x,z)=>{const b=O.trafficBox(t);const dx=x-b.x,dz=z-b.z,a=dx*b.fx+dz*b.fz,c=dx*-b.fz+dz*b.fx;const qa=Math.max(0,Math.abs(a)-b.hl),qc=Math.max(0,Math.abs(c)-b.hw);return Math.hypot(qa,qc)}});
  const res=[];
  for(const who of['crew','kid','neighbour'])for(const v of[9,13])for(const ei of[0,3]){
    const r=await ev(async([who,v,ei])=>{const H=window.__ht,T=window.__TP,O=H.ow,PP=HT.People;T.clear();
      const E=T.edges.filter(e=>e.l>=60)[ei];const q=T.lanePt(E.a,E.b,48);/* the person stands in the lane 48 m along */
      /* the player on foot, on the far kerb 6 m off */
      H.P.pos.set(q.x+q.uz*-6,0,q.z-q.ux*-6);
      let d,hits=0,pos;
      if(who==='crew'){let a=H.allies[0];if(!a)return{err:'no ally'};a.pos.set(q.x,0,q.z);a.target=null;a.hold={x:q.x,z:q.z};d=a.dude;pos=()=>a.pos}
      else{d=PP.make(who==='kid'?'kid':'neighbour',{variant:2});if(!d)return{err:'no model'};H.L.group.add(d.root);d.root.position.set(q.x,0,q.z);PP.live.includes(d)||PP.live.push(d);pos=()=>d.root.position}
      const hit0=PP.hit,die0=PP.die;PP.hit=(x,...a)=>{if(x===d)hits++;return hit0(x,...a)};PP.die=(x,...a)=>{if(x===d)hits++;return die0(x,...a)};
      const t=O.trafficAdd({a:E.a,b:E.b,at:4,spd:v,max:v,type:'sedan'});
      let minD=1e9,stopAt=null,through=false;for(let i=0;i<30*9;i++){if(who==='crew'){const a=H.allies[0];a.pos.set(q.x,0,q.z)}H.step(1);const p=pos();const dd=T.boxD(t,p.x,p.z);minD=Math.min(minD,dd);if(dd===0)through=true;if(stopAt==null&&Math.abs(t.c.spd)<.2&&i>20)stopAt=+dd.toFixed(2)}
      PP.hit=hit0;PP.die=die0;if(who!=='crew'){d.root.parent&&d.root.parent.remove(d.root)}
      return{who,v,edge:E.a+'>'+E.b,region:E.region,minD:+minD.toFixed(2),through,stopAt,hits,blk:t.blk&&t.blk.k||null}},[who,v,ei]);
    res.push(r);log(JSON.stringify(r))}
  for(const who of['crew','kid','neighbour']){const rs=res.filter(r=>r.who===who&&!r.err);
    ok(rs.length&&rs.every(r=>!r.through),'traffic never drives through a '+who+' standing in the lane ('+rs.filter(r=>r.through).length+'/'+rs.length+' drove through)');
    ok(rs.every(r=>!r.hits),'no hit reaction on the '+who+' ('+rs.reduce((s,r)=>s+r.hits,0)+')')}
  /* evidence frame: a car mid-way through a kid */
  await ev(()=>{const H=window.__ht,T=window.__TP,O=H.ow,PP=HT.People;T.clear();const E=T.edges.filter(e=>e.l>=60)[0];const q=T.lanePt(E.a,E.b,30);
    const d=PP.make('kid',{variant:1});H.L.group.add(d.root);d.root.position.set(q.x,0,q.z);const t=O.trafficAdd({a:E.a,b:E.b,at:4,spd:11,max:11,type:'suv'});
    H.P.pos.set(q.x+q.uz*-7+q.ux*-6,0,q.z-q.ux*-7+q.uz*-6);H.P.yaw=Math.atan2(-(q.x-H.P.pos.x),-(q.z-H.P.pos.z));H.P.pitch=-.15;
    for(let i=0;i<300;i++){H.step(1);if(T.boxD(t,q.x,q.z)===0)break}window.__TPd=T.boxD(t,q.x,q.z)});
  await step(2);const sh=await W.shot('traffic-through-kid');log('shot',sh,await ev(()=>window.__TPd));
  require('fs').writeFileSync(__dirname+'/traffic-peds.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
