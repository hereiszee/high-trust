/* Riverside cast in the real game, headless: node dev/neighbours-check.js [--shots]
   The four job-givers (earl, dee, rosa, benny) and the neighbour pool (HT.People.neighbourKeys): load, animate, feet on the ground,
   givers at their places with briefs, Rosa as crew (fights, goes down, gets revived), neighbours by Riverside trust tier, not targets,
   indoors when shots are fired. Screenshots -> docs/screenshots/neighbours/ */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const SHOTS=process.argv.includes('--shots');const OUT=path.join(__dirname,'../docs/screenshots/neighbours');fs.mkdirSync(OUT,{recursive:true});
const results=[];const ok=(n,pass,info)=>{results.push([n,!!pass]);console.log((pass?'  ok   ':'  FAIL ')+n+(info!==undefined?'  · '+(typeof info==='string'?info:JSON.stringify(info)):''))};
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});p.on('console',m=>{if(/^NBVIEW/.test(m.text()))console.log('  '+m.text())});
  await p.evaluate(async()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(2);H.render.apply('high');
    for(let i=0;i<120&&!(HT.People&&(HT.People.ok||HT.People.failed));i++)await new Promise(r=>setTimeout(r,500))});
  const shot=async(name,fn,arg,raw)=>{try{await p.evaluate(fn,arg);if(!raw)await p.evaluate(()=>{const H=window.__ht;H.draw();H.draw()});await p.waitForTimeout(120);
      if(SHOTS)await p.screenshot({path:path.join(OUT,name+'.jpg'),type:'jpeg',quality:84});console.log('  shot',name)}catch(e){console.log('  FAIL shot',name,String(e).slice(0,300));results.push([name,false])}};
  /* 1: every new file loads and prepares, sizes */
  const keys=await p.evaluate(()=>HT.People.giverKeys.concat(HT.People.neighbourKeys));
  const load=await p.evaluate(async ks=>{const PP=HT.People;const t0=performance.now();await PP.preload(ks);return{have:ks.filter(k=>PP.has(k)),ms:Math.round(performance.now()-t0)}},keys);
  ok('all '+keys.length+' Riverside models load and prepare',load.have.length===keys.length,load);
  const big=keys.map(k=>[k,fs.statSync(path.join(__dirname,'../assets/people/rocketbox/'+k+'.glb')).size]).filter(([k,s])=>s>1.3e6);
  ok('every source glb is at most 1.3 MB',big.length===0,big.length?big:'max '+Math.max(...keys.map(k=>fs.statSync(path.join(__dirname,'../assets/people/rocketbox/'+k+'.glb')).size)));
  /* 2: feet on the ground, idle/walk/sit/crouch(cower)/interact on the shared clips; neighbours have no hitboxes */
  const g=await p.evaluate(ks=>{const H=__ht,PP=HT.People,P=H.P;const V=new THREE.Vector3(),out=[];const dt=1/30;
    const rel=(d,n)=>d.body.getObjectByName(n).getWorldPosition(V).y-d.root.position.y;
    const SC=[['idle',{}],['walk',{vel:1}],['run',{vel:3.2}],['sit',{mode:'sit'}],['crouch',{mode:'crouch'}],['wave',{wave:1}]];
    for(const k of ks)for(const[n,o]of SC){const d=PP.make(k);d.root.position.set(P.pos.x+2,0,P.pos.z+2);H.scene.add(d.root);const hip=d.rb.hip*(d.root.scale.x||1);let pmin=9,pmax=-9,fmin=9;const clips=new Set();
      for(let s=0;s<90;s++){if(o.vel)d.root.position.z+=o.vel*dt;if(o.wave&&s===10)PP.interact(d);PP.pose(d,dt,{moving:!!o.vel,aim:false,mode:o.mode||'stand'});PP.update(dt,null);clips.add(d.rb.base);
        if(s>20&&s%3===0){d.root.updateMatrixWorld(true);const pe=rel(d,'Bip01_Pelvis');pmin=Math.min(pmin,pe);pmax=Math.max(pmax,pe);fmin=Math.min(fmin,rel(d,'Bip01_L_Toe0'),rel(d,'Bip01_R_Toe0'))}}
      H.scene.remove(d.root);const low=o.mode==='sit'||o.mode==='crouch';
      const bad=(low?pmin<.2||pmax>hip-.05:pmin<hip-.15||pmax>hip+.15)||fmin<-.03||(o.mode==='sit'&&!/sit/.test(d.rb.base));
      out.push({k,n,base:d.rb.base,pel:[+pmin.toFixed(2),+pmax.toFixed(2)],hip:+hip.toFixed(2),feet:+fmin.toFixed(3),hitboxes:d.meshes.length,nb:!!d.neighbour,bad})}
    return out},keys);
  const gb=g.filter(x=>x.bad);ok('ground: pelvis and feet within limits for '+g.length+' cases (14 models × idle, walk, run, sit, crouch, wave)',gb.length===0,gb.length?gb.slice(0,6):'all within limits');
  const hb=g.filter(x=>x.nb&&x.hitboxes>0);ok('neighbours carry no hitboxes; givers keep theirs',hb.length===0&&g.filter(x=>!x.nb).every(x=>x.hitboxes===13),hb.slice(0,3));
  const dc=await p.evaluate(ks=>{const PP=HT.People,out={};for(const k of ks){const d=PP.make(k==='earl'||k==='dee'||k==='rosa'||k==='benny'?k:'neighbour',{variant:k});let n=0;d.root.traverse(o=>{if(o.isMesh&&o.visible&&o.material&&o.material.visible!==false&&!(o.userData&&o.userData.hitbox))n++});out[k]=n;PP.live.splice(PP.live.indexOf(d),1)}return out},keys);
  ok('draw calls: every neighbour at most 3 meshes (givers listed)',keys.slice(4).every(k=>dc[k]<=3),dc);
  /* shuffle bag: no back-to-back repeats, the spread covers the pool */
  const bag=await p.evaluate(()=>{const PP=HT.People,ks=[];for(let i=0;i<60;i++){const d=PP.make('neighbour');ks.push(d.rb.key);PP.live.splice(PP.live.indexOf(d),1)}let rep=0;for(let i=1;i<ks.length;i++)if(ks[i]===ks[i-1])rep++;const c={};for(const k of ks)c[k]=(c[k]||0)+1;return{rep,distinct:Object.keys(c).length,counts:c}});
  ok("make('neighbour'): shuffle bag, no back-to-back repeats, even spread",bag.rep===0&&bag.distinct===10&&Math.max(...Object.values(bag.counts))<=7,bag);
  /* 3: lineups */
  const lineup=async(name,specs,dist,sp,camH)=>shot(name,([specs,dist,sp,camH])=>{const H=__ht,P=H.P,PP=HT.People;H.prog.done.fill(false);H.enterHub();H.step(2);for(const a of H.allies)a.dude.root.visible=false;for(const n of H.npcs)n.dude.root.visible=false;P.dude.root.visible=false;
    const f=[-Math.sin(P.yaw),-Math.cos(P.yaw)],r=[Math.cos(P.yaw),-Math.sin(P.yaw)];window._row&&window._row.forEach(d=>H.scene.remove(d.root));window._row=[];
    specs.forEach((s,i)=>{const d=PP.make(s.k,s.v?{variant:s.v}:{});const o=(i-(specs.length-1)/2)*sp;d.root.position.set(P.pos.x+f[0]*dist+r[0]*o,0,P.pos.z+f[1]*dist+r[1]*o);d.root.rotation.y=P.yaw;H.scene.add(d.root);if(s.gun)H.dude.equip(d,s.gun);window._row.push(d)});
    for(let k=0;k<40;k++){for(const d of window._row)PP.pose(d,1/30,{moving:false,aim:false});PP.update(1/30,H.camera)}
    const c=H.camera;c.position.set(P.pos.x,camH,P.pos.z);c.lookAt(P.pos.x+f[0]*dist,camH-.45,P.pos.z+f[1]*dist);c.updateMatrixWorld();H.scene.updateMatrixWorld();H.render.draw()},[specs,dist,sp,camH],true);
  await p.addStyleTag({content:'body.nbshot .hud,body.nbshot #tags,body.nbshot #sub,body.nbshot [class*=ht-]{visibility:hidden!important}'});await p.evaluate(()=>document.body.classList.add('nbshot'));
  await lineup('givers-lineup',[{k:'earl'},{k:'dee'},{k:'rosa'},{k:'benny'}],3.4,.9,1.35);
  await lineup('givers-faces',[{k:'earl'},{k:'dee'},{k:'rosa'},{k:'benny'}],1.9,.55,1.62);
  await lineup('neighbours-lineup',keys.slice(4).map(v=>({k:'neighbour',v})),6.4,.72,1.3);
  await lineup('neighbours-faces',keys.slice(4).map(v=>({k:'neighbour',v})),2.6,.5,1.55);
  await p.evaluate(()=>{const H=__ht;(window._row||[]).forEach(d=>H.scene.remove(d.root));H.P.dude.root.visible=true;document.body.classList.remove('nbshot')});
  /* no Act 2 intro card (it pauses the game) */
  await p.evaluate(()=>{const H=__ht;H.WM.beat=true;if(H.save)H.save.flags.act2Intro=true});
  /* 4: givers at their places in the open world with briefs */
  const gv=await p.evaluate(()=>{const H=__ht,out=[];const W=H.WORLD||H.world;
    for(const [i,id] of [[4,'earl'],[5,'dee'],[6,'rosa'],[7,'benny']]){H.prog.done.fill(false);for(const j of[0,1,2,3])H.prog.done[j]=true;for(let j=4;j<i;j++)H.prog.done[j]=true;H.prog.trustR=90;H.enterHub();H.openBridge();H.step(3);
      const n=H.npcs.find(n=>n.id===id);if(!n){out.push({id,found:false});continue}
      H.P.pos.set(n.pos.x+1.5,0,n.pos.z+.5);H.step(2);let brief=null;try{H.openBrief&&H.openBrief(i);brief=document.querySelector('.ht-brief,#brief,[data-panel=brief]');brief=!!(brief&&brief.offsetParent!==null)||!!document.body.innerText.match(new RegExp(H.MISSIONS[i].title,'i'))}catch(e){brief='err '+e.message}
      out.push({id,found:true,key:n.dude.rb&&n.dude.rb.key,pos:[Math.round(n.pos.x),Math.round(n.pos.z)],brief});try{H.HUD.hide('brief')}catch(e){}}
    return out});
  ok('givers stand at their places with their own models, briefs open',gv.every(x=>x.found&&x.key===x.id&&x.brief===true),gv);
  /* 5: Riverside streets by trust tier: neighbours appear with trust (none at the lowest tier), capped, on porches and sidewalks */
  const go=(t,at)=>p.evaluate(([t,at])=>{const H=__ht,P=H.P;H.prog.done.fill(false);H.prog.done[0]=H.prog.done[1]=true;H.prog.trustR=t;H.enterHub();H.openBridge();H.dress(t);
    at=at||[356,46];P.pos.set(at[0],0,at[1]);H.collide(P.pos,.35);P.yaw=-Math.PI/2+.25;P.pitch=-.08;H.step(4);H.dress(t);H.ow&&H.ow.buildAll&&H.ow.buildAll();H.step(2)},[t,at]);
  const settle=async()=>{for(let i=0;i<40;i++){const r=await p.evaluate(()=>{__ht.step(10);const L=HT.OpenWorld.neighbourList();return L.length&&L.every(n=>n.key)});if(r)break;await p.waitForTimeout(400)}
    return p.evaluate(()=>{if(!__ht.running)throw new Error('game paused');__ht.step(30);return HT.OpenWorld.neighbourList().map(n=>({key:n.key,kind:n.kind,state:n.state,vis:n.visible}))})};
  const tiers={};for(const t of[5,25,60,100]){await go(t);tiers[t]=await settle()}
  const cnt=t=>tiers[t].filter(n=>n.key).length;
  ok('neighbours by tier: none at trust 5, more as trust rises, at most 10',cnt(5)===0&&cnt(25)>0&&cnt(60)>cnt(25)&&cnt(100)>=cnt(60)&&cnt(100)<=10,{5:cnt(5),25:cnt(25),60:cnt(60),100:cnt(100),at100:tiers[100]});
  const kinds=new Set(tiers[100].map(n=>n.kind));ok('top tier: people sitting on stoops, standing, and a kid with chalk or a bike',kinds.has('sit')&&(kinds.has('stand')||kinds.has('sidewalk'))&&(kinds.has('chalk')||kinds.has('bike')),[...kinds]);
  /* look at them: from a spot across the street, facing the nearest group */
  /* a fixed view down the Ash St rowhouse porches (porch anchors x 323-355, z 97 and 103) from the street, same for every tier */
  const view=t=>{const H=__ht,P=H.P;for(const a of H.allies){a.pos.x+=400;if(a.dude)a.dude.root.position.x+=400}P.pos.set(354,0,99);P.dude.root.visible=false;
    H.ow.buildAll();H.draw();P.dude.root.visible=false;const c=H.camera;c.position.set(347,1.7,100.4);c.lookAt(326,1.0,99.6);c.updateMatrixWorld();H.scene.updateMatrixWorld();H.render.draw();H.render.draw();P.dude.root.visible=true;console.log('NBVIEW',JSON.stringify(HT.OpenWorld.neighbourList().map(n=>[n.key,n.kind,n.state,n.visible,Math.round(n.x),Math.round(n.z)])))};
  for(const t of[25,60,100]){await go(t,[344,99]);await settle();await shot('riverside-trust-'+t,view,t,true)}
  /* 6: not targets: none of their meshes is a ray target or a solid; shooting at one does nothing to them; they go indoors and come back when it is quiet */
  await go(100);await settle();
  const nt=await p.evaluate(()=>{const H=__ht,P=H.P,T=THREE;const L=HT.OpenWorld.neighbourList().filter(n=>n.key&&n.state==='out');const nb=new Set();for(const n of L)n.dude.root.traverse(o=>nb.add(o));
    const inTargets=H.rayTargets.filter(m=>nb.has(m)).length,ent=[...nb].filter(o=>o.userData&&o.userData.ent).length;
    const a=L[0];const tg=a.dude.root.position.clone().add(new T.Vector3(0,1.2,0));P.pos.set(tg.x+Math.sin(a.dude.root.rotation.y)*4,0,tg.z+Math.cos(a.dude.root.rotation.y)*4);H.collide(P.pos,.35);
    const eye=P.pos.clone().add(new T.Vector3(0,1.65,0)),d=tg.clone().sub(eye);P.yaw=Math.atan2(-d.x,-d.z);P.pitch=Math.asin(d.y/d.length());P.fp=true;H.step(2);
    const rc=new T.Raycaster(eye,d.normalize());const hits=rc.intersectObjects(H.rayTargets,true).filter(h=>nb.has(h.object)).length;
    H.mouse=true;H.step(3);H.mouse=false;H.step(1);const after=HT.OpenWorld.neighbourList();return{n:L.length,inTargets,ent,hits,states:after.map(n=>n.state)}});
  ok('neighbours cannot be hurt: not ray targets, no userData.ent, a shot at one passes through',nt.inTargets===0&&nt.ent===0&&nt.hits===0,nt);
  const cw=await p.evaluate(()=>{const H=__ht,P=H.P;const L=HT.OpenWorld.neighbourList();const n0=L.find(n=>n.state==='out');const sent=HT.OpenWorld.neighbourCower(n0.x,n0.z,35);H.step(150);const a=HT.OpenWorld.neighbourList().map(n=>n.state);H.mouse=false;H.P.fp=false;for(let i=0;i<30;i++)H.step(30);const b=HT.OpenWorld.neighbourList().map(n=>n.state);return{sent,after:a,later:b}});
  ok('gunfire nearby (OW.neighbourCower): neighbours go indoors, come back out once it has been quiet',cw.after.filter(s=>s!=='out').length>0&&cw.later.every(s=>s==='out'),cw);
  /* 7: Rosa in the crew (garden defence): her model, a gun in hand, aims and fires, goes down and is revived */
  const ro=await p.evaluate(()=>{const H=__ht,P=H.P;H.prog.done.fill(false);for(const d of[0,1,4,5])H.prog.done[d]=true;H.prog.trustR=30;if(H.mode!=='hub')H.enterHub();H.openBridge();H.startMissionWorld(6);H.step(2);
    const r=H.allies.find(a=>a.id==='rosa');if(!r)return{found:false};const d=r.dude,rb=d.rb;const seen=new Set(),once=new Set();let aim=0;
    for(let k=0;k<1500;k++){P.hp=100;r.hp=100;if(k%30===0)for(const e of H.enemies){e.alert=true;e.last=r.pos.clone()}H.step(1);seen.add(rb.base);if(rb.one)once.add(rb.one.name);aim=Math.max(aim,rb.aimW||0);if((once.has('rifle_fire')||once.has('pistol_fire'))&&k>200)break}
    const nbm=HT.OpenWorld.neighbourList().map(n=>n.state);H.hurtAlly(r,999);H.step(20);const downBase=rb.base,down=r.down;P.pos.set(r.pos.x+.8,0,r.pos.z);for(let k=0;k<400&&r.down;k++){P.hp=100;H.keys.e=true;H.step(1)}H.keys.e=false;H.step(30);
    return{found:true,key:rb.key,gun:!!(d.gun&&d.gun.parent),gunType:rb.gunType,aim:+aim.toFixed(2),bases:[...seen],oneShots:[...once],down,downBase,revived:!r.down,afterBase:rb.base,hitboxes:d.meshes.length,neighboursDuringFight:nbm}});
  ok('Rosa fights with the crew: own model, gun in hand, aims and fires, goes down and is revived',ro.found&&ro.key==='rosa'&&ro.gun&&ro.aim>.5&&ro.oneShots.some(n=>/fire/.test(n))&&ro.down&&ro.downBase==='death'&&ro.revived&&ro.afterBase!=='death'&&ro.hitboxes===13,ro);
  await shot('rosa-in-the-crew',()=>{const H=__ht,P=H.P;const r=H.allies.find(a=>a.id==='rosa');const e=H.enemies.find(e=>e.state==='idle');
    P.pos.set(r.pos.x+Math.sin(r.yaw)*-2.5+1.2,0,r.pos.z+Math.cos(r.yaw)*-2.5);H.collide(P.pos,.35);P.yaw=Math.atan2(-(r.pos.x-P.pos.x),-(r.pos.z-P.pos.z))-.15;P.pitch=-.12;P.fp=false;H.step(8)});
  console.log(JSON.stringify(results.filter(r=>!r[1])));
  ok('zero console errors',errs.length===0,errs.slice(0,6));
  await b.close();const fail=results.filter(r=>!r[1]).length;console.log(fail?fail+' of '+results.length+' failed':'all '+results.length+' passed');process.exitCode=fail?1:0})();
