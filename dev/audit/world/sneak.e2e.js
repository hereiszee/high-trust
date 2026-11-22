/* The intended sneak across the closed Route 9 bridge, on foot, with real W held and the view turned toward each waypoint
   (like dev/base-check.js walk()). node dev/audit/world/sneak.e2e.js
   Tries every line a player could take past the sawhorses: straight along each lane, hugging each parapet, and threading round the
   trees at the bridge ends (x 281, z 39 and z 47). Reports which (if any) reach the far side, and what stopped the others. */
const {open,log,ok,out}=require('./lib.js');
(async()=>{const W=await open();const {p,ev,step,key}=W;
  await ev(()=>{const H=window.__ht;H.step(3)});await step(10);
  const cols=await ev(()=>{const H=window.__ht;return H.L.colliders.filter(c=>c.x1>276&&c.x0<290&&c.z1>34&&c.z0<52&&!c.ob).map(c=>({k:c.k||c.kind||c.t,x0:+c.x0.toFixed(2),z0:+c.z0.toFixed(2),x1:+c.x1.toFixed(2),z1:+c.z1.toFixed(2),h:c.h}))});
  log('colliders around the barricade',cols);
  const walk=async(pts)=>{await ev(([x,z])=>{const H=window.__ht;H.running=true;if(H.CV)H.exitVehicle();H.P.pos.set(x,0,z);H.P.vy=0;H.step(2)},pts[0]);let i=1,last=null,stuck=0,t=0;
    for(;i<pts.length&&t<500;t++){const s=await ev(()=>{const P=window.__ht.P;return{x:P.pos.x,z:P.pos.z,y:P.pos.y}});const [x,z]=pts[i];if(Math.hypot(x-s.x,z-s.z)<.35){i++;continue}
      if(last&&Math.hypot(s.x-last.x,s.z-last.z)<.01)stuck++;else stuck=0;last=s;if(stuck>25)break;
      await ev(([x,z])=>{const P=window.__ht.P;P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z))},[x,z]);await key('w',true);await step(2)}
    await key('w',false);const e=await ev(()=>{const P=window.__ht.P;return[+P.pos.x.toFixed(2),+P.pos.z.toFixed(2)]});return{reached:i>=pts.length,stoppedAt:e,leg:i}};
  const lines={
    north_lane:[[274,41],[296,41]],mid:[[274,43],[296,43]],south_lane:[[274,45],[296,45]],
    north_parapet:[[274,39.2],[296,39.2]],south_parapet:[[274,46.8],[296,46.8]],
    north_round_tree:[[274,37.9],[282.1,37.9],[282.1,39.15],[296,39.15]],south_round_tree:[[274,48.1],[282.1,48.1],[282.1,46.85],[296,46.85]],
    north_tight:[[274,37.9],[282.15,37.9],[282.15,39.3],[284.5,39.3],[296,39.3]]};
  const res={};for(const [k,pts] of Object.entries(lines)){res[k]=await walk(pts);log(k,res[k])}
  const any=Object.values(res).some(r=>r.reached);
  ok(any,'before the bridge opens, a player on foot can get past the barricade on at least one line',res);
  await W.shot('sneak-closed');
  require('fs').writeFileSync(__dirname+'/sneak.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
