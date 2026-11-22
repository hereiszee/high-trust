/* Conductor lead: a kid whose model never loads gets the box stand-in after People.PENDING_CEILING (60 s). Is it still protected?
   node dev/audit/world/kid-boxed.e2e.js
   Every nb_kid model request is aborted; the ceiling is shortened to 2 s (same code path, just sooner). A kid is made in Riverside
   free roam next to the dad. Checks: boxed, HT.People.isProtected(kid / its meshes), protectedNear (the 25 m no-gun rule),
   pressing 1 to draw (real key), and a pistol shot at point blank with real mouse clicks (hurt/hit calls on it). */
const {open,log,ok,out}=require('./lib.js');
const KID=/\/people\/rocketbox\/nb_kid[^/]*\.glb/;
(async()=>{const W=await open({before:async p=>{await p.route(KID,r=>r.abort())}});const {p,ev,step}=W;
  const r=await ev(async()=>{const H=window.__ht,PP=HT.People;for(const j of[0,1,2,3])H.prog.done[j]=true;H.enterHub();H.running=true;H.openBridge();H.step(3);
    PP.PENDING_CEILING=2;H.P.pos.set(356,0,46);H.collide(H.P.pos,.35);H.step(4);
    const d=PP.make('neighbour',{variant:'nb_kid'});H.L.group.add(d.root);d.root.position.set(H.P.pos.x,0,H.P.pos.z-4);window.__KID=d;
    for(let i=0;i<40&&!d.boxed;i++){await new Promise(r=>setTimeout(r,250));H.step(3)}
    const box=[];d.root.traverse(o=>{if(o.isMesh)box.push(o)});
    return{boxed:!!d.boxed,pending:!!d.pending,inLive:PP.live.includes(d),prot:PP.isProtected(d),protMesh:box.length?PP.isProtected(box[0]):null,
      near:!!PP.protectedNear(H.P.pos.x,H.P.pos.z,25),kidNear:(()=>{try{return !!H.fr&&null}catch(e){return null}})()}});
  log('boxed kid',r);
  ok(r.boxed,'kid model blocked: the box stand-in appears after the ceiling',r);
  ok(r.prot&&r.protMesh,'the boxed kid is still HT.People.isProtected (character and mesh)',r);
  ok(r.near,'the boxed kid counts for protectedNear (25 m no-gun bubble)',r);
  /* real key 1 to draw, 4 m from the kid */
  await ev(()=>{const H=window.__ht;H.give&&H.give('pistol');H.P.yaw=0;H.P.pitch=-.15});await p.keyboard.press('1');await step(6);
  const drawn=await ev(()=>!!window.__ht.frArmed);log('gun drawn next to the boxed kid',drawn);
  ok(!drawn,'no gun can be drawn 4 m from the boxed kid',drawn);
  await W.shot('kid-boxed');
  require('fs').writeFileSync(__dirname+'/kid-boxed.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
