/* Everybody Waves with real input: Playwright keyboard and mouse events drive each stage's core loop. __ht only places the dad
   (like walking would), aims him (like moving the mouse would), and jumps between stage checkpoints to fit the memory cap.
   node dev/jobs/finale-input.js
   plan      E at the folding table opens the board; 1 then 9 assigns Hank to the swap car; Enter goes
   tail      E beside the van gets in; E beside the No. 9 shuttle swaps cars
   roof      hold E at the ladder climbs; right mouse toggles the scope on AND off (a pure toggle); E marks a read plant;
             a left click beanbags a plant with no child within 25 m (and is refused for one with a child near); Z zooms
   roadblock hold E at the tailgate grabs; X switches item; E puts it down
   defend    E grabs a crate; E puts it on the stage; Shift+W into a troublemaker tackles him; E zip-ties
   chase     G calls the box
   handsup   E talks; 1, 1, 1 answers; E takes the zip-tie; holding E zip-ties
   festival  E talks to someone; E at the microphone, 1; the credits can't be skipped the first time (X does nothing) */
const {open}=require('../ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);p.on('console',m=>{if(m.type()==='warning'&&/jobs|finale/.test(m.text()))console.log('     warn: '+m.text().slice(0,200))});
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(400);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const s=H.jobs.api.SV();s.flags.act2Intro=true;s.world.bridgeOpen=true;await window.HT.Finale.preloadCast();H.jobs.start('finale');for(let i=0;i<8;i++)H.step(1)});
  const box=await p.locator('canvas').first().boundingBox();await p.mouse.click(box.x+box.width/2,box.y+box.height/2);await p.waitForTimeout(200);
  const steps=n=>ev(n=>window.__ht.step(n),n);
  const at=(x,z,yaw)=>ev(([x,z,yaw])=>{const H=window.__ht;if(H.jobs.api.CV)H.jobs.api.exitCar();H.P.pos.set(x,0,z);H.collide(H.P.pos,.35);if(yaw!=null)H.P.yaw=yaw;H.step(2)},[x,z,yaw]);
  const jump=st=>ev(st=>{const H=window.__ht,M=H.M,FN=window.HT.Finale;if(!M.fn.plan)M.fn.plan=window.HT.Plan.auto(FN.PLAN_DEF,{});FN.advance(M,st);H.step(4)},st);
  const sub=(f,x)=>ev(f,x);const key=async(k,n)=>{await p.keyboard.press(k);await steps(n||3)};
  const hold=async(k,n)=>{await p.keyboard.down(k);await steps(n);await p.keyboard.up(k);await steps(2)};
  /* ---- plan ---- */
  await at(399.5,44.8,0);await key('e',4);let r=await sub(()=>({open:!!(window.HT.Plan&&window.HT.Plan.isOpen())}));ok(r.open,'plan: E at the folding table opens the board');
  await key('1');await key('9');await key('Enter',6);r=await sub(()=>({stage:window.__ht.M.fn.stage,open:window.HT.Plan.isOpen(),swap:(window.__ht.M.fn.plan.assign||{}).swap}));ok(r.stage==='tail'&&!r.open,'plan: 1 (swap car), 9 (Hank), Enter assigns and goes ('+JSON.stringify(r)+')');
  /* ---- tail ---- */
  await steps(4);const V=await sub(()=>{const v=window.__ht.jobs.api.VAN;return{x:v.pos.x,z:v.pos.z}});await at(V.x+2.4,V.z);await key('e',4);r=await sub(()=>!!window.__ht.jobs.api.CV);ok(r,'tail: E beside the van gets in');
  await sub(()=>{const H=window.__ht,a=H.jobs.api,e=a.CV,sh=H.M.fn.sub.shuttle.entry;e.pos.set(sh.pos.x+3,0,sh.pos.z-5.5);e.yaw=Math.PI;if(e.car)e.car.spd=0;a.syncCar(e);H.step(2)});
  await key('e',4);r=await sub(()=>({sw:window.__ht.M.fn.sub.swapped,cv:window.__ht.jobs.api.CV&&window.__ht.jobs.api.CV.type}));ok(r.sw,'tail: E beside the No. 9 shuttle swaps cars ('+JSON.stringify(r)+')');
  /* ---- roof ---- */
  await jump('roof');await steps(4);const L=await sub(()=>{const s=window.__ht.jobs.api.WORLD.sites.roof;return{x:s.ladder.bottom.x+.4,z:s.ladder.bottom.z}});await at(L.x,L.z);await hold('e',36);await steps(40);
  r=await sub(()=>window.__ht.M.fn.sub.up);ok(r,'roof: holding E at the ladder climbs onto the roof');
  await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});await steps(3);let sc=await sub(()=>window.__ht.M.fn.sub.scope);
  await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});await steps(3);let sc2=await sub(()=>window.__ht.M.fn.sub.scope);
  ok(sc===true&&sc2===false,'roof: right mouse toggles the scope on, and again off ('+sc+','+sc2+')');
  await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});await steps(2);
  await key('z',2);r=await sub(()=>window.__ht.M.fn.sub.zoom);ok(r===1,'roof: Z zooms');await key('z',2);
  /* aim at a plant near the kids (refused), then one clear of them (dropped) */
  const aimAt=w=>sub(w=>{const H=window.__ht,M=H.M,S=M.fn.sub,FN=window.HT.Finale,P=H.P;const kids=q=>FN.nearKid(M,q.x,q.z);
    const pl=S.plants.filter(q=>!q.down&&!q.marked&&q.st==='mill');let t=w==='near'?pl.find(q=>kids(q)<25):pl.find(q=>kids(q)>27);
    if(!t&&w==='near'){t=pl[0];if(t){const k=S.kids[0];t.x=k.x+5;t.z=k.z;t.tx=null;t.next=99}}if(!t&&w==='far'){t=pl[0];if(t){t.x=404;t.z=43;t.tx=null;t.next=99}}if(!t)return null;
    for(let i=0;i<70;i++){t.tx=null;const ex=P.pos.x-Math.sin(P.yaw)*.7,ez=P.pos.z-Math.cos(P.yaw)*.7,ey=P.pos.y+1.62;P.yaw=Math.atan2(-(t.x-ex),-(t.z-ez));P.pitch=Math.atan2(1.3-ey,Math.hypot(t.x-ex,t.z-ez));H.step(1)}
    return{rev:!!t.revealed,kid:kids(t),i:S.plants.indexOf(t)}},w);
  let tn=await aimAt('near');await p.mouse.down();await steps(2);await p.mouse.up();await steps(3);r=await sub(i=>({down:window.__ht.M.fn.sub.plants[i].down,beans:window.__ht.M.fn.sub.beans,fires:window.__ht.M.fn.sub.fires}),tn.i);
  ok(tn.rev&&!r.down&&r.fires>=1,'roof: a click on a plant with a child '+Math.round(tn.kid)+' m away is refused ('+JSON.stringify(r)+')');
  await key('e',3);r=await sub(i=>window.__ht.M.fn.sub.plants[i].marked,tn.i);ok(r,'roof: E marks him for the crowd walker instead');
  let tf=await aimAt('far');await steps(30);await p.mouse.down();await steps(2);await p.mouse.up();await steps(3);r=await sub(i=>window.__ht.M.fn.sub.plants[i].down,tf.i);ok(tf&&r,'roof: a click on a plant '+Math.round(tf.kid)+' m from any child drops him with a beanbag');
  /* ---- roadblock ---- */
  await jump('roadblock');await steps(4);await at(381.2,81.4);await hold('e',22);r=await sub(()=>{const c=window.__ht.P.carry;return c&&c.kind});ok(r&&/^fin:/.test(r),'roadblock: holding E at the tailgate grabs ('+r+')');
  await at(381,90,Math.PI);await key('e',3);r=await sub(()=>window.__ht.M.fn.sub.props.list.length);ok(r>=1,'roadblock: E puts it down ('+r+' placed)');
  await at(381.2,81.4);const k0=await sub(()=>window.__ht.M.fn.sub.kind);await key('x',2);const k1=await sub(()=>window.__ht.M.fn.sub.kind);ok(k0!==k1,'roadblock: X switches what you take off the tailgate ('+k0+'->'+k1+')');
  /* ---- defend ---- */
  await jump('defend');await steps(6);const Wf=await sub(()=>window.HT.Finale.W);await at(Wf.benny.x+3.6,Wf.benny.z+1.8);await key('e',3);r=await sub(()=>window.__ht.P.carry&&window.__ht.P.carry.kind);ok(r==='fin:crate','defend: E at Benny\'s truck takes a crate');
  await at(Wf.stage.x+Wf.stage.w/2+.8,Wf.stage.z);await key('e',3);r=await sub(()=>window.__ht.M.fn.sub.crates);ok(r===1,'defend: E at the stage puts it down ('+r+')');
  const pu=await sub(()=>{const H=window.__ht,M=H.M;let pr=null;for(let i=0;i<900&&!pr;i++){H.step(1);pr=M.fn.sub.pushers.find(q=>!q.heavy&&q.e.state==='idle'&&!q.gone)}if(!pr)return null;H.P.pos.set(pr.e.pos.x,0,pr.e.pos.z+3.2);H.P.yaw=0;H.step(1);return{x:pr.e.pos.x,z:pr.e.pos.z}});
  if(!pu)ok(false,'defend: no troublemaker came');else{await p.keyboard.down('Shift');await p.keyboard.down('w');await steps(30);await p.keyboard.up('w');await p.keyboard.up('Shift');await steps(2);
    r=await sub(()=>window.__ht.M.fn.sub.pushers.filter(q=>q.e.state==='surrender').length);ok(r>=1,'defend: Shift+W into a troublemaker tackles him');
    await sub(()=>{const H=window.__ht,q=H.M.fn.sub.pushers.find(q=>q.e.state==='surrender');if(q){H.P.pos.set(q.e.pos.x+1,0,q.e.pos.z);H.step(1)}});await key('e',3);r=await sub(()=>window.__ht.M.fn.sub.pushers.filter(q=>q.e.state==='cuffed').length);ok(r>=1,'defend: E zip-ties him')}
  /* ---- chase ---- */
  await jump('chase');await steps(6);await sub(()=>{const H=window.__ht,a=H.jobs.api;a.enterCar(a.VAN);H.step(2);const S=H.M.fn.sub,r=S.rail;for(let i=0;i<40;i++)H.step(1);const q=S.P.at(Math.max(0,r.s-9));const e=a.CV;e.pos.set(q.x,0,q.z);e.yaw=q.yaw;a.syncCar(e);H.step(1)});
  await key('g',3);r=await sub(()=>window.__ht.M.fn.sub.called);ok(r,'chase: G calls the box');
  /* ---- hands up ---- */
  await jump('handsup');await steps(6);const sp=await sub(()=>{const S=window.__ht.M.fn.sub;return{x:S.spot.x+S.rt.x*2,z:S.spot.z+S.rt.z*2}});await at(sp.x,sp.z);await key('e',3);r=await sub(()=>window.__ht.M.fn.sub.ph);ok(r==='talk','hands up: E talks to him');
  await key('1',3);await key('1',3);await key('1',3);r=await sub(()=>window.__ht.M.fn.sub.ph);ok(r==='hands','hands up: 1, 1, 1 answers; he puts his hands up ('+r+')');
  await steps(150);const mk=await sub(()=>{const S=window.__ht.M.fn.sub;return S.malik?{x:S.malik.x,z:S.malik.z}:null});if(mk)await at(mk.x+.9,mk.z);await key('e',3);r=await sub(()=>window.__ht.M.fn.sub.tie);ok(r,'hands up: E takes the zip-tie from Malik');
  const sp2=await sub(()=>{const S=window.__ht.M.fn.sub;return{x:S.spot.x+S.rt.x*1.3,z:S.spot.z+S.rt.z*1.3}});await at(sp2.x,sp2.z);await hold('e',45);r=await sub(()=>window.__ht.M.fn.st.tied);ok(r===1,'hands up: holding E zip-ties The Wholesaler');
  /* ---- festival ---- */
  await jump('festival');await steps(6);const g=await sub(()=>{const c=window.__ht.M.fn.sub.cast[0];return{x:c.x,z:c.z+(c.z>43.5?-.8:.8)}});await at(g.x,g.z);await key('e',3);r=await sub(()=>window.__ht.M.fn.sub.talked);ok(r===1,'festival: E talks to someone');
  await sub(()=>{const H=window.__ht;H.M.fn.sub.talked=6;H.step(2)});await at(Wf.stage.x+2.2,Wf.stage.z+.6);await key('e',3);await key('1',3);r=await sub(()=>window.__ht.M.fn.sub.ph);ok(r==='wave','festival: E at the microphone, 1: everybody waves ('+r+')');
  await steps(300);const vv=await sub(()=>{const v=window.__ht.jobs.api.VAN;return{x:v.pos.x,z:v.pos.z}});await at(vv.x+2.4,vv.z);await key('e',4);r=await sub(()=>window.__ht.M.fn.sub.ph);ok(r==='credits','festival: E at the van starts the drive home and the credits');
  await p.keyboard.down('x');await steps(60);await p.keyboard.up('x');r=await sub(()=>({rt:window.__ht.M.fn.sub.rt}));ok(r.rt<2.5,'festival: X does not fast-forward the credits the first time ('+r.rt.toFixed(2)+' s in 2 s)');
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,3).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
