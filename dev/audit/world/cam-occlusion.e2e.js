/* W-08: third-person camera vs thin occluders. node dev/audit/world/cam-occlusion.e2e.js
   Poses from the world audit where the dad vanished: a lamp post in front of the house (tour 'home-front'), a tree trunk at the west map
   edge (tour 'map-edge-west'), the flag by the front walk right after Head outside. For each: is the dad's head or chest visible from the
   camera? (a scene raycast from the camera to him, ignoring his own model: the test's own check, independent of the game's collider grid).
   Then aiming (right mouse) in the same spot: the camera is not pulled in (the aim view is unchanged), and first person is untouched. */
const {open,log,ok,out}=require('./lib.js');
(async()=>{const W=await open();const {p,ev,step}=W;
  await ev(()=>{const H=window.__ht;H.render.apply('med');H.step(3)});await step(10);
  await ev(()=>{const H=window.__ht;window.__seen=()=>{const P=H.P,cam=H.camera.position.clone(),R=new THREE.Raycaster(),mine=new Set();if(P.dude)P.dude.root.traverse(o=>mine.add(o));
    const shown=o=>{for(let a=o;a;a=a.parent)if(!a.visible)return false;return true};const objs=[];const mid=new THREE.Vector3(P.pos.x,P.visY+1.3,P.pos.z).add(cam).multiplyScalar(.5),rad=cam.distanceTo(mid)+.5,sp=new THREE.Sphere();
    H.scene.traverse(o=>{if(!o.isMesh||mine.has(o)||!shown(o)||!o.material||o.material.transparent||o.material.visible===false||o.userData&&o.userData.hitbox)return;if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();sp.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);if(sp.center.distanceTo(mid)<sp.radius+rad)objs.push(o)});
    const res={};for(const[k,dy]of[['head',1.6],['chest',1.1]]){const t=new THREE.Vector3(P.pos.x,P.visY+dy,P.pos.z),d=t.clone().sub(cam),l=d.length();R.set(cam,d.normalize());R.near=0;R.far=l-.3;
      const h=R.intersectObjects(objs,false)[0];res[k]=h?{by:h.object.name||(h.object.parent&&h.object.parent.name)||'?',at:+h.distance.toFixed(2)}:null}
    return{visible:!(res.head&&res.chest),res,camD:+cam.distanceTo(new THREE.Vector3(P.pos.x,P.visY+1.65,P.pos.z)).toFixed(2)}}});
  const pose=async(x,z,yaw,pitch,o={})=>{await ev(([x,z,yaw,pitch,o])=>{const H=window.__ht,P=H.P,updC=()=>{H.camTick?H.camTick(1/30):H.draw()};if(H.CV)H.exitVehicle();P.pos.set(x,0,z);H.collide(P.pos,.35);P.yaw=yaw;P.pitch=pitch;P.fp=!!o.fp;P.aim=!!o.aim;
      for(let i=0;i<12;i++){H.step(2);H.ow.update(H.camera);updC()}H.draw()},[x,z,yaw,pitch,o]);return ev(()=>window.__seen())};
  const pl=await ev(()=>{const H=window.__ht;const q=H.WORLD.places;return{home:q.home&&{x:q.home.x,z:q.home.z},start:q.start}});
  const stops=[['home-front',pl.home.x+2,pl.home.z+8,0,-.05],['map-edge-west',4,60,Math.PI/2,-.05]];
  for(const[name,x,z,yaw,pitch]of stops){const r=await pose(x,z,yaw,pitch);log(name,r);await W.shot('cam-'+name);ok(r.visible,name+': the dad can be seen (head or chest) from the camera',r)}
  /* walking past a lamp post or a tree: the post halfway along the line from the camera to him (beside the camera boom, which the old
     boom raycast doesn't catch); 8 lamps/trees round the home street x 4 headings */
  const posts=await ev(([hx,hz])=>{const H=window.__ht;return H.L.cnear(hx,hz,60).filter(c=>c.k==='lamp'||c.k==='tree').slice(0,6).map(c=>({x:(c.x0+c.x1)/2,z:(c.z0+c.z1)/2,k:c.k}))},[pl.home.x,pl.home.z]);
  let n=0,hid=0;const bad=[];for(const q of posts)for(const yaw of[0,Math.PI/2,Math.PI,-Math.PI/2]){const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
    const x=q.x-rx*.35+fx*1.35,z=q.z-rz*.35+fz*1.35;const r=await pose(x,z,yaw,-.05);const placed=await ev(([x,z])=>Math.hypot(window.__ht.P.pos.x-x,window.__ht.P.pos.z-z)<.2,[x,z]);if(!placed)continue;n++;if(!r.visible){hid++;bad.push({q,yaw:+yaw.toFixed(2),r})}}
  log('posts',n,'poses,',hid,'hidden',bad.slice(0,3));if(bad.length){const b0=bad[0];await pose(b0.q.x-Math.cos(b0.yaw)*.35-Math.sin(b0.yaw)*1.35,b0.q.z+Math.sin(b0.yaw)*.35-Math.cos(b0.yaw)*1.35,b0.yaw,-.05);await W.shot('cam-post-hidden')}
  ok(n>=12&&hid===0,'walking past lamp posts and trees: the dad is never hidden ('+hid+' of '+n+' poses)',bad.slice(0,2));
  /* Head outside: in the house, out the front door, a few frames */
  const hx=await ev(async()=>{const H=window.__ht;H.homeInit();for(let i=0;i<80;i++){if(H.enterHome())break;await new Promise(r=>setTimeout(r,250))}H.step(4);H.exitHome('front');for(let i=0;i<20;i++){H.step(2);H.ow.update(H.camera);H.draw()}return{mode:H.mode,p:[+H.P.pos.x.toFixed(1),+H.P.pos.z.toFixed(1)],yaw:+H.P.yaw.toFixed(2)}});
  const ho=await ev(()=>window.__seen());log('head outside',hx,ho);await W.shot('cam-head-outside');ok(hx.mode==='hub'&&ho.visible,'right after Head outside: the dad can be seen (the flag by the front walk does not hide him)',{hx,ho});
  const occ=await ev(()=>{const B=HT.Buildings;return(B.camOccluders||[]).map(o=>[+o.x0.toFixed(1),+o.z0.toFixed(1),+o.y0.toFixed(1),+o.y1.toFixed(1)])});log('flag boxes',occ);
  /* aim and first person untouched at the lamp post */
  const st=posts[0]?[0,posts[0].x-.35+0*1.35,posts[0].z-1.35,0,-.05]:stops[0];const a=await pose(st[1],st[2],st[3],st[4],{aim:true});await ev(()=>{window.__ht.camOcc=false});const a0=await pose(st[1],st[2],st[3],st[4],{aim:true});await ev(()=>{window.__ht.camOcc=true});
  const f=await pose(st[1],st[2],st[3],st[4],{fp:true});log('aim',a,'aim without the W-08 code',a0,'fp',f);
  ok(Math.abs(a.camD-a0.camD)<.01,'aiming beside a lamp post: the camera is exactly where it was without the occlusion code ('+a.camD+' vs '+a0.camD+' m)',{a,a0});
  ok(f.camD<.3,'first person: the camera is at the eye ('+f.camD+' m)',f);
  await ev(()=>{const P=window.__ht.P;P.aim=false;P.fp=false});
  require('fs').writeFileSync(__dirname+'/cam-occlusion.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
