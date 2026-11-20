/* Watch Your Step with real input: Playwright keyboard events (E taps and holds, the 1-3 keys in a doorstep chat); __ht only places
   the dad and turns his head, like walking and moving the mouse would.
   node dev/jobs/patrol-input.js
   1 standing still and looking at a porch checks it      2 walking past while looking doesn't
   3 E at a door knocks; a neighbour comes out and the chat strip opens   4 the 2 key answers; the relationship is saved
   5 holding E on a parcel tucks it in                    6 E on the lost dog: he follows you; walking to his house takes him home
   7 no console errors */
const {open}=require('../ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(400);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('patrol');j.test.give(H.jobs.api);
    await Promise.race([window.HT.People.preload(['nb_kid','nb_teen','nb_gran','nb_pops','nb_office','nb_sweater','nb_kenji','nb_marcus','nb_mei','nb_lucia','thug_hoodie']).catch(()=>{}),new Promise(r=>setTimeout(r,30000))]);H.jobs.start('patrol')});
  await p.waitForFunction(()=>{const H=window.__ht;H.step(5);return H.M&&H.M.pt&&H.M.pt.phase==='walk'},null,{timeout:60000,polling:300});
  const box=await p.locator('canvas').first().boundingBox();await p.mouse.click(box.x+box.width/2,box.y+box.height/2);
  /* a route with a parcel and a dog on it, so every action can be tried */
  await ev(()=>{const H=window.__ht,M=H.M,P_=M.pt;const s1=P_.stops[1],s2=P_.stops[2];for(const s of P_.stops)if(s.ev&&s.ev.dog)s.ev.dog.d.visible=false;});
  const steps=n=>ev(n=>window.__ht.step(n),n);
  const at=(x,z,lx,lz)=>ev(([x,z,lx,lz])=>{const H=window.__ht,P=H.P;P.pos.set(x,0,z);H.collide(P.pos,.35);for(let i=0;i<4;i++){const c=H.camera.position;P.yaw=Math.atan2(-(lx-c.x),-(lz-c.z));P.pitch=-.1;H.step(1)}},[x,z,lx,lz]);
  const S=i=>ev(i=>{const s=window.__ht.M.pt.stops[i];return{x:s.x,z:s.z,sx:s.sx,sz:s.sz,fx:s.fx,fz:s.fz,st:s.st,ev:s.ev&&{k:s.ev.k,st:s.ev.st},id:s.id}},i);
  /* 1 */let s0=await S(0);await at(s0.sx,s0.sz,s0.x,s0.z);await steps(45);s0=await S(0);ok(s0.st==='checked','standing still and looking at porch 1 checks it');
  /* 2 */let s1=await S(1);const r2=await ev(s=>{const H=window.__ht,P=H.P,k=H.keys;P.pos.set(s.sx-s.fz*6,0,s.sz+s.fx*6);H.collide(P.pos,.35);k.w=true;let seen=0;for(let i=0;i<50;i++){const c=H.camera.position;const want=Math.atan2(-(s.x-c.x),-(s.z-c.z));P.yaw=want;H.step(1);seen=Math.max(seen,H.M.pt.stops[1].look)}k.w=false;return{st:H.M.pt.stops[1].st,moving:H.P.moving}},s1);
  ok(r2.st==='todo','walking past while looking does not check it ('+JSON.stringify(r2)+')');
  /* 3 */s1=await S(1);await at(s1.x+s1.fx*1.6,s1.z+s1.fz*1.6,s1.x,s1.z);await p.keyboard.press('e');await steps(3);const t3=await ev(()=>{const P_=window.__ht.M.pt;return{talk:!!P_.talk,strip:!!document.querySelector('.ht-ch'),st:P_.stops[1].st,out:!!P_.stops[1].out}});
  ok(t3.talk&&t3.out&&t3.st==='checked','E at the door knocks: a neighbour comes out, the chat opens ('+JSON.stringify(t3)+')');
  /* 4 */await p.keyboard.press('2');await steps(3);const t4=await ev(id=>{const H=window.__ht,s=H.jobs.api.SV();return{talk:!!H.M.pt.talk,rel:s.jobs.patrol.plan.rel[id]||0,chats:H.M.pt.chats}},s1.id);ok(!t4.talk&&t4.rel>=1&&t4.chats===1,'the 2 key answers and the neighbour remembers you ('+JSON.stringify(t4)+')');
  /* 5 */const pk=await ev(()=>{const H=window.__ht,P_=H.M.pt;let s=P_.stops.find(s=>s.ev&&s.ev.k==='package');if(!s){s=P_.stops.find(s=>!s.ev&&s.i>1);s.ev={k:'package',st:'found'};const T=H.jobs.api.THREE;const g=new T.Group();g.add(new T.Mesh(new T.BoxGeometry(.46,.3,.36),new T.MeshStandardMaterial()));H.jobs.api.wmAdd(g);g.position.set(s.x+s.fx*.35,0,s.z+s.fz*.35);s.ev.m=g}
    s.ev.st='found';return{i:s.i,x:s.ev.m.position.x,z:s.ev.m.position.z,fx:s.fx,fz:s.fz}});
  await at(pk.x+pk.fx*.8,pk.z+pk.fz*.8,pk.x,pk.z);await p.keyboard.down('e');await steps(45);await p.keyboard.up('e');await steps(2);const t5=await ev(i=>window.__ht.M.pt.stops[i].ev.st,pk.i);ok(t5==='done','holding E tucks the parcel in ('+t5+')');
  /* 6 */const dg=await ev(()=>{const H=window.__ht,P_=H.M.pt;const s=P_.stops.find(s=>s.ev&&s.ev.k==='dog');if(!s)return null;s.ev.st='found';s.ev.dog.d.visible=true;return{i:s.i,x:s.ev.dog.x,z:s.ev.dog.z,home:s.ev.home}});
  if(dg){await at(dg.x+1,dg.z,dg.x,dg.z);await p.keyboard.press('e');await steps(4);const f=await ev(()=>window.__ht.M.pt.follow&&window.__ht.M.pt.follow.kind);ok(f==='dog','E on the dog: he follows you');
    const h=await S(dg.home);const t6=await ev(h=>{const H=window.__ht,P=H.P;for(let k=0;k<12;k++){P.pos.set(P.pos.x+(h.sx-P.pos.x)*.35,0,P.pos.z+(h.sz-P.pos.z)*.35);H.collide(P.pos,.35);H.step(20)}return{follow:!!H.M.pt.follow,st:H.M.pt.stops.find(s=>s.ev&&s.ev.k==='dog').ev.st}},h);ok(t6.st==='done'&&!t6.follow,'walking him to his house takes him home ('+JSON.stringify(t6)+')')}
  else console.log('     (no dog on this route; skipped)');
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
