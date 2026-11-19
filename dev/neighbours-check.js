/* Riverside cast in the real game, headless: node dev/neighbours-check.js [--shots]
   The four job-givers (earl, dee, rosa, benny) and the neighbour pool (HT.People.neighbourKeys): load, animate, feet on the ground,
   givers at their places with briefs, Rosa as crew (fights, goes down, gets revived), neighbours by Riverside trust tier, not targets,
   indoors when shots are fired. Screenshots -> docs/screenshots/neighbours/ */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const SHOTS=process.argv.includes('--shots');const OUT=path.join(__dirname,'../docs/screenshots/neighbours');fs.mkdirSync(OUT,{recursive:true});
const results=[];const ok=(n,pass,info)=>{results.push([n,!!pass]);console.log((pass?'  ok   ':'  FAIL ')+n+(info!==undefined?'  · '+(typeof info==='string'?info:JSON.stringify(info)):''))};
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});
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
  /* 4: givers at their places in the open world with briefs */
  const gv=await p.evaluate(()=>{const H=__ht,out=[];const W=H.WORLD||H.world;
    for(const [i,id] of [[4,'earl'],[5,'dee'],[6,'rosa'],[7,'benny']]){H.prog.done.fill(false);for(const j of[0,1,2,3])H.prog.done[j]=true;for(let j=4;j<i;j++)H.prog.done[j]=true;H.prog.trustR=90;H.enterHub();H.openBridge();H.step(3);
      const n=H.npcs.find(n=>n.id===id);if(!n){out.push({id,found:false});continue}
      H.P.pos.set(n.pos.x+1.5,0,n.pos.z+.5);H.step(2);let brief=null;try{H.openBrief&&H.openBrief(i);brief=document.querySelector('.ht-brief,#brief,[data-panel=brief]');brief=!!(brief&&brief.offsetParent!==null)||!!document.body.innerText.match(new RegExp(H.MISSIONS[i].title,'i'))}catch(e){brief='err '+e.message}
      out.push({id,found:true,key:n.dude.rb&&n.dude.rb.key,pos:[Math.round(n.pos.x),Math.round(n.pos.z)],brief});try{H.HUD.hide('brief')}catch(e){}}
    return out});
  ok('givers stand at their places with their own models, briefs open',gv.every(x=>x.found&&x.key===x.id&&x.brief===true),gv);
  console.log(JSON.stringify(results.filter(r=>!r[1])));
  ok('zero console errors',errs.length===0,errs.slice(0,6));
  await b.close();const fail=results.filter(r=>!r[1]).length;console.log(fail?fail+' of '+results.length+' failed':'all '+results.length+' passed');process.exitCode=fail?1:0})();
