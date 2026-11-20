/* E prompts (QA item 1), real keyboard in headless Chromium: the visible prompt always says what E does, one action per press.
   1. home: the laptop / fridge name the job they offer (Porch Light, Dad Taxi) and E opens that brief; declined, they go back to the shop / calendar
   2. hub: two givers in reach -> the prompt names the nearest and E opens the nearest's brief
   3. Honey-Do Blitz: a step short of Hank's table with the van at the kerb -> no "Get in the minivan"; E at the table takes the belt
   node dev/prompts-e2e.js */
const {open}=require('./ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);const step=n=>ev(n=>window.__ht.step(n),n);
  const pressE=async()=>{await p.keyboard.down('e');await step(1);await p.keyboard.up('e');await step(2)};
  const prompt=()=>ev(()=>{const q=window.__ht.prompt;return q?q.text:null});
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(3);const s=H.jobs.api.SV();H.prog.done[0]=true;if(s)window.HT.Save.jobRec(s,'gary').done=true;H.enterHub();H.step(3)});
  /* 1. home */
  await ev(()=>window.__ht.enterHome());await p.waitForFunction(()=>window.__ht.mode==='home',null,{timeout:60000}).catch(()=>{});
  const spots=await ev(()=>{const H=window.__ht,h=H.home;const it=(h&&h.interactables)||[];const f=id=>{const x=it.find(i=>i.id===id);return x?{x:x.x,z:x.z}:null};return{laptop:f('laptop'),fridge:f('fridge')}});
  for(const [id,job] of [['laptop','Porch Light'],['fridge','Dad Taxi']]){const s=spots[id];if(!s){ok(false,'no '+id+' interactable');continue}
    await ev(s=>{const H=window.__ht;H.P.pos.set(s.x,0,s.z+.4);H.step(2)},s);const t=await prompt();ok(t&&t.includes('Job: '+job),id+' prompt names the job: "'+t+'"');
    await pressE();const br=await ev(()=>{const H=window.__ht;return{brief:!!(H.UIacts&&H.UIacts['brief:go']),acts:Object.keys(H.UIacts||{})}});ok(br.brief,'E at the '+id+' opens that brief '+JSON.stringify(br.acts));
    const no=await ev(()=>{const H=window.__ht,a=H.UIacts||{};const k=Object.keys(a).find(k=>/brief:(no|later|back|close|decline)/.test(k));if(k)a[k]();H.running=true;H.step(3);return k});
    const t2=await prompt();ok(no&&t2&&!t2.includes('Job:'),'declined ('+no+'): the '+id+' is back to "'+t2+'"')}
  await ev(()=>{const H=window.__ht;H.exitHome('front');H.step(5)});
  /* 2. two givers in reach */
  const g=await ev(()=>{const H=window.__ht;const gs=H.npcs.filter(n=>n.marker);if(gs.length<2)return{err:'need 2 givers, have '+gs.length};const A=gs[0],B=gs[1];
    B.pos.set(A.pos.x+2.6,0,A.pos.z);H.P.pos.set(A.pos.x+1.9,0,A.pos.z+.3);H.step(2);return{A:H.MISSIONS[A.marker.i].id,B:H.MISSIONS[B.marker.i].id,nearB:Math.hypot(B.pos.x-H.P.pos.x,B.pos.z-H.P.pos.z).toFixed(2),nearA:Math.hypot(A.pos.x-H.P.pos.x,A.pos.z-H.P.pos.z).toFixed(2),
      nameB:(H.dude.HOMIES[B.id]||{}).name||B.id,titleB:H.MISSIONS[B.marker.i].title}});
  if(g.err)ok(false,g.err);else{const t=await prompt();await pressE();const br=await ev(()=>{const H=window.__ht;return H.JOB!=null?null:(H.ui&&H.ui.brief)||null});
    const which=await ev(()=>{const H=window.__ht;const b=document.querySelector('.ht-brief h2,.ht-brief .title,[data-screen=brief] h2');return b?b.textContent:null});
    ok(t&&t.includes(g.nameB),'nearest giver named ('+JSON.stringify(g)+'): "'+t+'"');ok(which===g.titleB,'E opened the nearest giver\'s brief: "'+which+'" (want "'+g.titleB+'")');
    await ev(()=>{const H=window.__ht,a=H.UIacts||{};const k=Object.keys(a).find(k=>/brief:(no|later|back|close|decline)/.test(k));if(k)a[k]();H.running=true;H.step(2)})}
  /* 3. Blitz: van at the kerb by Hank's table */
  const bz=await p.evaluate(async()=>{const H=window.__ht;const s=H.jobs.api.SV();for(const id of['rick','earl']){const i=H.jobs.index(id);H.prog.done[i]=true;if(s)window.HT.Save.jobRec(s,id).done=true}
    const pm=window.HT&&HT.People;if(pm&&pm.preload)await Promise.race([pm.preload(H.jobs.castKeys('blitz')).catch(()=>{}),new Promise(r=>setTimeout(r,20000))]);
    H.jobs.start('blitz');if(H.jobs.castWait)await H.jobs.castWait;H.step(5);if(!H.M||H.M.def.id!=='blitz')return{err:'no blitz'};
    const B=H.M.bz,T=B.table.position,V=H.M.car||H.VAN;if(H.CV)H.exitVehicle();V.pos.set(T.x-1.6,0,T.z+5.6);V.yaw=-Math.PI/2;H.syncVan&&H.syncVan();H.jobs.api.syncCar&&H.jobs.api.syncCar(V);
    H.P.pos.set(T.x-1.1,0,T.z+2.6);H.step(2);return{d:Math.hypot(H.P.pos.x-T.x,H.P.pos.z-T.z).toFixed(2),dv:Math.hypot(H.P.pos.x-V.pos.x,H.P.pos.z-V.pos.z).toFixed(2)}});
  if(bz.err)ok(false,bz.err);else{const t=await prompt();await pressE();const inV=await ev(()=>!!window.__ht.CV);ok(!(t&&/Get in/.test(t))&&!inV,'a step short of the table ('+JSON.stringify(bz)+'): prompt "'+t+'", E did not put the dad in the van');
    await ev(()=>{const H=window.__ht,T=H.M.bz.table.position;H.P.pos.set(T.x,0,T.z+1.1);H.step(2)});const t2=await prompt();await pressE();const got=await ev(()=>{const B=window.__ht.M.bz;return B.belt});
    ok(t2&&/tool belt/i.test(t2)&&got,'at the table: "'+t2+'" -> belt taken '+got)}
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,5).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
