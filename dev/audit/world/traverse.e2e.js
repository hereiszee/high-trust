/* Traversal with real keys. node dev/audit/world/traverse.e2e.js [bridge,edges,water,exit,vault]
   bridge: before it opens, walk at the barricade and jump (Space) over it: the sneak must work; driving must not get through.
           after it opens (Rick's job done, enter the hub): sawhorses hidden, no collider, no raycast proxy, the van drives across.
   edges:  at 24 points around the world's edge, walk (W, 5 s) and drive (W, 5 s) straight out: never leave the map / fall.
   water:  walk and drive into the river from both banks.
   exit:   park the minivan with its left side, then right side, against a wall, and nose into a corner: E gets the dad out somewhere he can walk away from. */
const {open,log,ok,out}=require('./lib.js');
const ONLY=(process.argv[2]||'bridge,edges,water,exit').split(',');
(async()=>{const W=await open();const {p,ev,step,key,tap}=W;
  await ev(()=>{const H=window.__ht;H.step(3)});await step(10);
  const st=()=>ev(()=>{const H=window.__ht,CV=H.CV,P=H.P;const o=CV||null;return{x:+P.pos.x.toFixed(2),y:+P.pos.y.toFixed(2),z:+P.pos.z.toFixed(2),
    car:o?{x:+o.pos.x.toFixed(2),z:+o.pos.z.toFixed(2),y:+o.obj.position.y.toFixed(2),rx:+o.obj.rotation.x.toFixed(2),rz:+o.obj.rotation.z.toFixed(2),spd:+(o.spd||0).toFixed(2)}:null,W:H.L.W*2,H:H.L.H*2}});
  const place=(x,z,yaw,car)=>ev(([x,z,yaw,car])=>{const H=window.__ht;if(!car&&H.CV)H.exitVehicle();if(car){if(!H.CV){H.P.pos.set(H.VAN.pos.x+2,0,H.VAN.pos.z);H.enterVan()}const e=H.CV;e.pos.set(x,0,z);e.yaw=yaw;e.spd=0;if(e.car){e.car.x=x;e.car.z=z;e.car.yaw=yaw;e.car.spd=0;e.car.vdx=-Math.sin(yaw);e.car.vdz=-Math.cos(yaw)}H.syncVan&&H.syncVan()}
    else{H.P.pos.set(x,0,z);H.P.vy=0;H.P.yaw=yaw}H.P.yaw=yaw;H.step(2)},[x,z,yaw,car]);
  const hold=async(k,frames)=>{await key(k,true);await step(frames);await key(k,false)};
  /* yaw for a heading: forward is (-sin yaw, -cos yaw) */
  const YAW={e:-Math.PI/2,w:Math.PI/2,n:0,s:Math.PI};
  if(ONLY.includes('bridge')){
    /* closed */
    await place(274,43,YAW.e,false);await hold('w',60);let s=await st();log('bridge closed, walked at barricade',s);
    ok(s.x<283.5,'closed: walking into the barricade stops at it',s);
    let crossed=false;for(const z of[41,43,45]){await place(279,z,YAW.e,false);await key('w',true);for(let i=0;i<40;i++){await step(2);if(i===4)await tap(' ')}await key('w',false);s=await st();log('vault attempt z='+z,s);if(s.x>285)crossed=true}
    ok(crossed,'closed: the sneak works (jump/vault over the sawhorses on foot)');
    await place(268,43,YAW.e,true);await hold('w',150);s=await st();log('bridge closed, drove at barricade',s);ok(s.car&&s.car.x<283,'closed: the minivan does not get through the barricade',s.car);
    /* open it the game's own way: Rick's job done, back into the hub */
    const o=await ev(()=>{const H=window.__ht;if(H.CV)H.exitVehicle();H.prog.done[1]=true;H.enterHub();H.step(4);const g=H.scene.getObjectByName('barricade');
      const cols=H.L.colliders.filter(c=>c.barricade&&!c.off).length;const sol=(H.L.solids||[]).filter(m=>{let a=m;while(a){if(a.name==='barricade')return true;a=a.parent}return false}).length;
      return{vis:g?g.visible:null,cols,sol,open:H.WORLD.bridgeOpen}});
    log('after opening',o);ok(o.vis===false&&o.cols===0&&o.sol===0,'open: sawhorses hidden, no collider, no raycast proxy',o);
    await place(268,43,YAW.e,true);await hold('w',150);s=await st();log('bridge open, drove across',s);ok(s.car&&s.car.x>300,'open: the minivan drives across',s.car);
    /* raycast: a shot along the deck is not stopped at the barricade line */
    const rc=await ev(()=>{const H=window.__ht;const R=new THREE.Raycaster(new THREE.Vector3(276,1,43),new THREE.Vector3(1,0,0),0,20);const h=R.intersectObjects(H.L.solids||[],true)[0];return h?{d:+h.distance.toFixed(2),n:h.object.name}:null});
    ok(!rc||rc.d>9,'open: nothing invisible stops a shot at the old barricade line',rc)}
  if(ONLY.includes('edges')){
    const dims=await st();const Wm=dims.W,Hm=dims.H;let bad=[];
    const pts=[];for(let i=1;i<=6;i++){pts.push([Wm*i/7,3,YAW.n],[Wm*i/7,Hm-3,YAW.s])}for(let i=1;i<=6;i++){pts.push([3,Hm*i/7,YAW.w],[Wm-3,Hm*i/7,YAW.e])}
    for(const [x,z,yaw] of pts){for(const car of[false,true]){await place(x,z,yaw,car);const a=await st();await hold('w',car?150:150);const b=await st();
      const q=car?b.car:b;const outside=q.x<0||q.z<0||q.x>Wm||q.z>Hm||(q.y!=null&&q.y<-1);
      if(outside||(car&&(Math.abs(b.car.rx)>.6||Math.abs(b.car.rz)>.6)))bad.push({at:[Math.round(x),Math.round(z)],car,before:car?a.car:a,after:q})}}
    log('edges: '+pts.length*2+' runs');ok(!bad.length,'edges: never out of the map or flipped ('+bad.length+' bad)',bad.slice(0,6))}
  if(ONLY.includes('water')){
    const rows=[[270,30,YAW.e],[316,30,YAW.w],[270,70,YAW.e],[316,70,YAW.w],[270,150,YAW.e],[316,150,YAW.w]];const res=[];
    for(const [x,z,yaw] of rows)for(const car of[false,true]){await place(x,z,yaw,car);await hold('w',150);const b=await st();const q=car?b.car:b;res.push({from:[x,z],car,end:q,inWater:q.x>284&&q.x<302})}
    log('water',res);ok(res.every(r=>!r.inWater),'water: nobody walks or drives into the river (solid bank)',res.filter(r=>r.inWater))}
  if(ONLY.includes('exit')){
    /* find a long wall: the north face of a house row; use the van against a solid collider found by probing */
    const spots=await ev(()=>{const H=window.__ht,L=H.L;const out=[];for(const c of L.colliders.slice(0,L.nStatic||L.colliders.length)){if(c.h!=null||c.ob||c.off)continue;const w=c.x1-c.x0,d=c.z1-c.z0;
        if(w>9&&d>3){/* van parallel to the south face, 0.25 m off */const z=c.z1+1.0+.25,x=(c.x0+c.x1)/2;const q={x,z};H.collide(q,1.0);if(Math.abs(q.x-x)<.01&&Math.abs(q.z-z)<.01&&H.walkable(Math.floor(x/2),Math.floor(z/2)))out.push({x,z,face:'s',c:[c.x0,c.z0,c.x1,c.z1]})}
        if(out.length>=6)break}return out});
    log('wall spots',spots.length);const res=[];
    for(const s of spots.slice(0,5)){for(const side of['left','right']){/* van runs along x; left side (driver) faces the wall when heading west */
        const yaw=side==='left'?YAW.e:YAW.w;/* heading east, the right of the van is +z?  r=(cos yaw,0,-sin yaw): east yaw=-pi/2 -> r=(0,0,1) => right side is south, left (driver) side is north = the wall */
        await place(s.x,s.z,yaw,true);await step(2);await tap('e');await step(4);const a=await st();
        const sol=await ev(([x,z])=>{const H=window.__ht;const c=H.solidAt(x,z,.3,0);return c?[c.x0,c.z0,c.x1,c.z1].map(v=>+v.toFixed(1)):null},[a.x,a.z]);
        /* can he walk away? hold S (back off), then A and D */
        let moved=0;for(const k of['s','a','d','w']){const b0=await st();await hold(k,20);const b1=await st();moved=Math.max(moved,Math.hypot(b1.x-b0.x,b1.z-b0.z))}
        res.push({at:[+s.x.toFixed(1),+s.z.toFixed(1)],wallSide:side,out:!a.car,dad:[a.x,a.z],inside:sol,walkAway:+moved.toFixed(2)})}}
    log('exit',res);ok(res.length&&res.every(r=>r.out&&!r.inside&&r.walkAway>.5),'exit: next to a wall on either side the dad gets out clear and can walk away',res.filter(r=>!(r.out&&!r.inside&&r.walkAway>.5)))}
  require('fs').writeFileSync(__dirname+'/traverse.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
