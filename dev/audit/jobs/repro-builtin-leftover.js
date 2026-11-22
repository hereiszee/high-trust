/* JOBS-AUDIT: what stays in the hub after failing a built-in raid and choosing "Head home"?
   node dev/audit/jobs/repro-builtin-leftover.js [job=rick]
   Lists the children of the hub's scene group that were not there before the job (type, name, position, visible, distance from home). */
const {boot,click,waitCard}=require('./lib.js');const JOB=process.argv[2]||'rick';
(async()=>{const {b,p,errs}=await boot();const ev=(f,a)=>p.evaluate(f,a);
  await ev(id=>window.__A.unlock(id),JOB);await ev(id=>window.__A.cast(id),JOB);await ev(()=>{const H=window.__ht;H.enterHub();H.step(10);window.__before=new Set(H.L.group.children)});
  await ev(id=>{window.__ht.jobs.start(id);window.__ht.step(30)},JOB);
  await ev(()=>window.__ht.jobs.api.endMission(false,'audit'));const c=await waitCard(p);console.log('card',JSON.stringify(c.btns.map(x=>x.label)));
  console.log('Head home',await click(p,'result:go'));await ev(()=>{const H=window.__ht;for(let i=0;i<3;i++){H.step(5);H.draw()}});
  const r=await ev(()=>{const H=window.__ht,g=H.L.group,s=H.L.start;const added=g.children.filter(o=>!window.__before.has(o));
    const count=n=>{let k=0;n.traverse(o=>{if(o.isMesh)k++});return k};
    return{mode:H.mode,before:window.__before.size,now:g.children.length,added:added.map(o=>({type:o.type,name:o.name||(o.userData&&Object.keys(o.userData).join('+'))||'',vis:o.visible,meshes:count(o),at:[Math.round(o.position.x),Math.round(o.position.z)],fromHome:Math.round(Math.hypot(o.position.x-s.x,o.position.z-s.z))})),
      itemsOnL:{items:(H.L.items||[]).length,stashes:(H.L.stashes||[]).length,ammo:(H.L.ammo||[]).length,pickups:(H.L.pickups||[]).length}}});
  console.log(JSON.stringify(r,null,0).slice(0,3000));
  console.log('page errors',JSON.stringify(errs.filter(e=>!/favicon/.test(e)).slice(0,3)));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
