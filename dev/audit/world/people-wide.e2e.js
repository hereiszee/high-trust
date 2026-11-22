/* Named characters under a throttled, partly failing network, in places dev/people-load.e2e.js doesn't visit.
   node dev/audit/world/people-wide.e2e.js
   Every people model request: the first 6 per scenario are aborted, then 40% of the rest fail at random, every one is delayed 2 s.
   Scenarios: home (Linda, Maddie, the son), Fort Sensible (Cpl. Doyle, Sgt. Pruitt, Staff Sgt. Ruiz), Dad's Auto (Sal), Maple givers
   (all jobs unlocked), a traffic wreck's driver, the jet buzzing the house (family out on the lawn).
   Samples every ~250 ms for 30 s: any visible box figure (userData.boxDude) fails; every People model in the scene must be real
   (skinned, with a mixer) by the end. A last scenario holds one key (nb_kenji, Ruiz's model) failing for 70 s to see what the 60 s
   ceiling (People.PENDING_CEILING) does to a named character. */
const {open,log,ok,out}=require('./lib.js');
const NET={n:0,aborted:0,abortFirst:6,rate:.4,ms:2000,block:null};
const MODEL=/\/assets\/(opt\/)?people\/rocketbox\/([^/]+)\.glb(\?|$)/;
(async()=>{const W=await open({before:async p=>{await p.route(MODEL,async r=>{NET.n++;const key=(r.request().url().match(MODEL)||[])[2];
    if(NET.block&&key===NET.block){NET.aborted++;return r.abort()}
    if(NET.abortFirst>0){NET.abortFirst--;NET.aborted++;return r.abort()}
    await new Promise(res=>setTimeout(res,NET.ms));if(Math.random()<NET.rate){NET.aborted++;return r.abort()}return r.fallback()})}});
  const {p,ev,step}=W;
  await ev(()=>{window.__PW={probe(){const H=window.__ht,PP=HT.People,sc=H.scene;const shown=o=>{for(let a=o;a;a=a.parent)if(!a.visible)return false;let a=o;while(a.parent)a=a.parent;return a===sc};
      const box=[];sc.traverse(o=>{if(o.userData&&o.userData.boxDude&&shown(o)){const v=new THREE.Vector3();o.getWorldPosition(v);box.push({x:+v.x.toFixed(1),z:+v.z.toFixed(1),n:o.name||''})}});
      const live=PP.live.filter(d=>{let a=d.root;while(a.parent)a=a.parent;return a===sc&&(('_htVis' in d.root)?d.root._htVis:d.root.visible)});
      const notReal=live.filter(d=>!(d.rb&&!d.pending&&d.rb.mixer&&d.rb.skinned&&d.rb.skinned.length)).map(d=>((d.rb||d._rb||{}).key||'?')+(d.boxed?':boxed':d.pending?':pending':''));
      return{box,live:live.length,notReal}}}});
  const run=async(name,prep,ms=30000)=>{NET.abortFirst=6;const t0=Date.now();await ev(prep);let boxSeen=[],last=null,readyAt=null,n=0;
    while(Date.now()-t0<ms){const r=await ev(()=>{const H=window.__ht;H.step(4);H.ow&&H.ow.update(H.camera);return window.__PW.probe()});n++;last=r;if(r.box.length)boxSeen.push(r.box);
      if(readyAt==null&&!r.notReal.length&&r.live>0)readyAt=Date.now()-t0;if(readyAt!=null&&Date.now()-t0-readyAt>3000)break;await p.waitForTimeout(250)}
    ok(!boxSeen.length,name+': no box figure at any of '+n+' samples',boxSeen.slice(0,2));
    ok(readyAt!=null,name+': every character in the scene is a real model within '+(ms/1000)+' s',{readyMs:readyAt,live:last.live,notReal:last.notReal});
    await W.shot('people-'+name);return last};
  /* home */
  await run('home',async()=>{const H=window.__ht;H.homeInit();for(let i=0;i<80;i++){if(H.enterHome&&H.enterHome())break;await new Promise(r=>setTimeout(r,250))}H.step(4)});
  log('mode after home',await ev(()=>window.__ht.mode));
  await ev(()=>{const H=window.__ht;try{H.exitHome&&H.exitHome()}catch(e){}if(H.mode!=='hub')H.enterHub();H.step(3)});
  /* Fort Sensible: gate, range officer, motor pool */
  await run('base',()=>{const H=window.__ht;const d=HT.Base.def();H.P.pos.set(d.gate.x,0,d.gate.z+6);H.collide(H.P.pos,.35);H.step(6);H.ow.update(H.camera);
    H.P.pos.set(d.range.stand+3,0,d.range.lanes[2]);H.collide(H.P.pos,.35);H.step(6);H.ow.update(H.camera);H.P.pos.set(d.tank.x+6,0,d.tank.z+6);H.collide(H.P.pos,.35);H.step(6)});
  /* Dad's Auto (Sal) and Maple givers with every job unlocked */
  await run('maple-givers',()=>{const H=window.__ht;for(let i=0;i<H.prog.done.length;i++)H.prog.done[i]=i<4;H.prog.trust=60;H.prog.trustR=60;H.enterHub();H.openBridge();H.step(4);const a=H.WORLD.places.auto;H.P.pos.set(a.x,0,a.z+8);H.collide(H.P.pos,.35);H.step(4)});
  /* a traffic wreck's driver */
  await run('wreck-driver',()=>{const H=window.__ht,O=H.ow,G=O.roads();const n=G.nodes.find(n=>n.e.length&&Math.hypot(G.nodes[n.e[0].to].x-n.x,G.nodes[n.e[0].to].z-n.z)>50);const t=O.trafficAdd({a:G.nodes.indexOf(n),b:n.e[0].to,at:10,spd:6,max:6,type:'sedan'});
    H.P.pos.set(t.c.x+8,0,t.c.z+8);H.step(2);O.trafficHit?O.trafficHit(t,999):(t.c.hp=0);H.step(10)});
  /* the jet buzzing the house: the family comes out */
  await run('jet-buzz',()=>{const H=window.__ht;const e=H.vehicles.find(c=>c.type==='jet');if(!e)return;H.P.pos.set(e.pos.x+3,0,e.pos.z);H.enterVehicle(e);H.step(2);const h=H.WORLD.places.home;
    try{const S=HT.Jet.state();}catch(_){}e.pos.set(h.x,40,h.z+40);H.step(2)});
  /* the 60 s ceiling: Ruiz's model never arrives for 70 s */
  NET.block='nb_kenji';await ev(()=>{const H=window.__ht;if(H.CV)H.exitVehicle();});
  const r=await run('ceiling',()=>{const H=window.__ht;const d=HT.Base.def();H.P.pos.set(d.tank.x+6,0,d.tank.z+6);H.collide(H.P.pos,.35);H.step(6)},75000);
  NET.block=null;log('network',NET);
  require('fs').writeFileSync(__dirname+'/people-wide.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
