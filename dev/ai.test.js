/* High Trust AI tests. Run: node dev/ai.test.js   (add --quick for fewer seeds, --sync-maps to recopy maps from index.html) */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
/* the MISSIONS literal in index.html: from 'const MISSIONS=[' to its matching ']' (strings skipped); the old 'const HUB=' end marker is gone with the open world */
function missionsSpan(s){const i=s.indexOf('const MISSIONS=[');let d=0,q=null;for(let n=i+15;n<s.length;n++){const c=s[n];if(q){if(c==='\\'){n++;continue}if(c===q)q=null;continue}
  if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='[')d++;else if(c===']'&&--d===0)return[i,n+1]}return[i,-1]}
if(process.argv.includes('--sync-maps')){const s=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');const[i,j]=missionsSpan(s);
  const M=new Function(s.slice(i,j).replace('const MISSIONS=','return '))();const out=M.map(m=>({id:m.id,title:m.title,type:m.type,pad:m.pad,crew:m.crew,weapons:m.weapons,waves:m.waves,time:m.time,map:m.map}));
  const src=fs.readFileSync(path.join(__dirname,'maps.js'),'utf8');fs.writeFileSync(path.join(__dirname,'maps.js'),src.replace(/const MAPS=[\s\S]*?;if\(typeof module/,'const MAPS='+JSON.stringify(out,null,1)+';if(typeof module'));console.log('maps synced');}
const AI=require('../js/ai.js');const MAPS=require('./maps.js');const Sim=require('./sim.js');
const QUICK=process.argv.includes('--quick');
let pass=0,fail=0;const results=[];
function check(name,ok,detail){(ok?pass++:fail++);results.push((ok?'  ok   ':'  FAIL ')+name+(detail?'  ·  '+detail:''));console.log((ok?'  ok   ':'  FAIL ')+name+(detail?'  ·  '+detail:''))}
const hyp=Math.hypot,pct=x=>(x*100).toFixed(1)+'%';
const q=(a,p)=>{if(!a.length)return NaN;const s=a.slice().sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*s.length))]};
const mean=a=>a.reduce((x,y)=>x+y,0)/(a.length||1);
let rs=12345;const rnd=()=>{rs=(rs*1103515245+12345)%2147483648;return rs/2147483648};

/* maps still match the game */
{const s=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');const[i,j]=missionsSpan(s);let same=true;
  try{const M=new Function(s.slice(i,j).replace('const MISSIONS=','return '))();same=M.every((m,k)=>JSON.stringify(m.map)===JSON.stringify(MAPS[k].map))}catch(e){same=false}
  check('dev/maps.js matches the MISSIONS maps in index.html',same,same?'':'run node dev/ai.test.js --sync-maps')}

const levels=MAPS.map(m=>Sim.prepLevel(m));
const navs=levels.map(L=>AI.buildNav(L.g,{colliders:L.colliders}));

console.log('\nNavigation');
/* game's losClear for comparison; low = crouch-height chars that block only near the crouched end b, inside the prop's real footprint */
const FOOT={c:[.85,.85],f:[1,.4],T:[.9,.55]};
function gameLos(L,ax,az,bx,bz,blk,low,reach){const d=hyp(bx-ax,bz-az),n=Math.ceil(d/.5);for(let i=1;i<n;i++){const x=ax+(bx-ax)*i/n,z=az+(bz-az)*i/n;const gx=Math.floor(x/2),gz=Math.floor(z/2);if(gx<0||gz<0||gx>=L.W||gz>=L.H)return false;const c=L.g[gz][gx];if(blk.includes(c))return false}
  if(low){const m=Math.ceil(d/.05);for(let i=1;i<m;i++){const x=ax+(bx-ax)*i/m,z=az+(bz-az)*i/m;const gx=Math.floor(x/2),gz=Math.floor(z/2);if(gx<0||gz<0||gx>=L.W||gz>=L.H)continue;const c=L.g[gz][gx],f=FOOT[c];
    if(low.includes(c)&&f&&Math.abs(x-(gx*2+1))<f[0]&&Math.abs(z-(gz*2+1))<f[1]&&d-d*i/m<reach)return false}}return true}
navs.forEach((nav,mi)=>{const L=levels[mi];let losSame=0,losN=0;
  for(let k=0;k<1500;k++){const ax=rnd()*L.W*2,az=rnd()*L.H*2,bx=rnd()*L.W*2,bz=rnd()*L.H*2;losN++;
    if(nav.los(ax,az,bx,bz,'b')===gameLos(L,ax,az,bx,bz,'#htV','cTf',2.4)&&nav.los(ax,az,bx,bz,false)===gameLos(L,ax,az,bx,bz,'#htV'))losSame++}
  /* the reference samples every 5 cm, the module tests prop boxes exactly: allow a few grazing-edge disagreements */
  check(`${MAPS[mi].id}: line of sight matches the game's losClear (standing = high blockers; crouched = plus low cover within 2.4 m of him)`,losSame>=losN*.997,`${losSame}/${losN}`);
  /* paths */
  const walk=[];for(let k=0;k<nav.N;k++)if(nav.walk[k])walk.push(k);
  let tried=0,found=0,bad=0,cut=0,thin=0,ratio=[];
  for(let k=0;k<400;k++){const a=walk[Math.floor(rnd()*walk.length)],b=walk[Math.floor(rnd()*walk.length)];const df=nav.distField(a);if(!isFinite(df[b]))continue;tried++;
    const ax=nav.wx(a)+(rnd()-.5)*.6,az=nav.wz(a)+(rnd()-.5)*.6,bx=nav.wx(b)+(rnd()-.5)*.6,bz=nav.wz(b)+(rnd()-.5)*.6;const p=nav.path(ax,az,bx,bz);if(!p)continue;found++;
    for(const c of p.cells)if(!nav.walk[c])bad++;
    for(let i=1;i<p.cells.length;i++){const c0=p.cells[i-1],c1=p.cells[i];const dx=nav.cx(c1)-nav.cx(c0),dz=nav.cz(c1)-nav.cz(c0);if(dx&&dz&&(!nav.walkable(nav.cx(c0)+dx,nav.cz(c0))||!nav.walkable(nav.cx(c0),nav.cz(c0)+dz)))cut++}
    for(let i=1;i<p.pts.length;i++){const s0=p.pts[i-1],s1=p.pts[i];const n=Math.ceil(hyp(s1.x-s0.x,s1.z-s0.z)/.1);for(let j=0;j<=n;j++){const x=s0.x+(s1.x-s0.x)*j/n,z=s0.z+(s1.z-s0.z)*j/n;if(!nav.walkAt(x,z)){thin++;break}}}
    if(df[b]>4)ratio.push(p.len/df[b])}
  check(`${MAPS[mi].id}: A* finds every reachable pair`,found===tried,`${found}/${tried}`);
  check(`${MAPS[mi].id}: paths never enter solid cells or cut corners`,bad===0&&cut===0&&thin===0,`solid cells ${bad}, corner cuts ${cut}, smoothed segments through solids ${thin}`);
  check(`${MAPS[mi].id}: string pulling shortens paths`,q(ratio,.5)<=1.001&&q(ratio,.99)<1.05,`median len/grid ${q(ratio,.5).toFixed(3)}`);
  const low=nav.covers.filter(c=>c.low).length;
  check(`${MAPS[mi].id}: cover spots, rooms and doorways found`,nav.covers.length>50&&nav.rooms.length>=1,`${nav.covers.length} cover spots (${low} low), ${nav.rooms.length} rooms, ${nav.doors.length} doorways`)});

console.log('\nCover on alert (stationary dad, every map enemy alerted, 6 s to settle)');
{const per=[];let allN=0,allOk=0,rushN=0,rushCover=0;
  navs.forEach((nav,mi)=>{const L=levels[mi];/* the park has no posted enemies: use its wave spawns plus the picnic area */
    const spawns=L.spawns.length?L.spawns:[...L.waveSpawns,{x:17,z:9},{x:41,z:17},{x:21,z:21},{x:37,z:5}];let n=0,ok=0;const trials=QUICK?12:30;let tries=0;
    while(n<trials*spawns.length*.5&&tries<trials*6){tries++;
      const e0=spawns[Math.floor(rnd()*spawns.length)];/* a dad position the enemy can see, 8-24 m away */
      let px,pz,found=false;for(let k=0;k<200;k++){const c=Math.floor(rnd()*nav.N);if(!nav.walk[c])continue;px=nav.wx(c);pz=nav.wz(c);const d=hyp(px-e0.x,pz-e0.z);if(d<8||d>24)continue;if(!nav.los(px,pz,e0.x,e0.z,false))continue;if(nav.door[c])continue;found=true;break}
      if(!found)continue;AI.seed(tries);
      const sq=AI.squad(nav,{});const P={id:'player',x:px,z:pz,isPlayer:true};const ags=[];
      for(const s of spawns){if(hyp(s.x-px,s.z-pz)>26)continue;const gun=s.boss?'revolver':['pistol','rifle','smg','shotgun','rifle'][ags.length%5];const e={id:'e'+ags.length,pos:{x:s.x,z:s.z},yaw:Math.atan2(px-s.x,pz-s.z),hp:75,maxHp:s.boss?420:75,gun,boss:s.boss,state:'idle'};
        e.role=AI.roleFor(gun,s.boss);if(e.role==='rusher'&&ags.length%2)e.role='grunt';sq.add(e);ags.push(e)}
      if(!ags.length)continue;
      /* 6.4 s: the 6 s window plus the squad's first-contact beat (AI.DIFFICULTY.normal.first) */
      const dt=1/20;let t=0;for(let i=0;i<128;i++){t+=dt;const w={nav,t,threats:[P],agents:ags};sq.update(dt,w);for(const e of ags){const I=AI.think(e,w,dt);AI.move(e,I,dt);
        /* same push-out as the game's collide() against whole solid cells */
        for(let pass=0;pass<2;pass++){const cx=Math.floor(e.pos.x/2),cz=Math.floor(e.pos.z/2);for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){if(nav.walkable(x,z))continue;const x0=x*2,z0=z*2,x1=x0+2,z1=z0+2,r=.35;
          if(e.pos.x+r>x0&&e.pos.x-r<x1&&e.pos.z+r>z0&&e.pos.z-r<z1){const ox1=e.pos.x+r-x0,ox2=x1-(e.pos.x-r),oz1=e.pos.z+r-z0,oz2=z1-(e.pos.z-r);if(Math.min(ox1,ox2)<Math.min(oz1,oz2))e.pos.x+=ox1<ox2?-ox1:ox2;else e.pos.z+=oz1<oz2?-oz1:oz2}}}}}
      for(const e of ags){const ai=e.ai;if(ai.mode!=='combat')continue;
        if(ai.role==='rusher'){rushN++;if(ai.cover)rushCover++;continue}
        n++;const cv=ai.cover;const at=cv&&hyp(e.pos.x-cv.spot.x,e.pos.z-cv.spot.z)<1.7;const hid=cv&&nav.hides(cv.spot,px,pz);if(at&&hid&&(ai.sub==='cover'||ai.sub==='move'))ok++}}
    per.push(`${MAPS[mi].id} ${pct(ok/n)} of ${n}`);allN+=n;allOk+=ok;
    check(`${MAPS[mi].id}: alerted enemies end in cover that blocks the dad's line of sight`,ok/n>.8,`${pct(ok/n)} (${ok}/${n})`)});
  check('all maps: cover rate over 80%',allOk/allN>.8,`${pct(allOk/allN)}; rushers are excluded on purpose (${rushN} rusher cases, ${rushCover} took cover)`)}

console.log('\nAccuracy model');
{const g=AI.GUNS.rifle,base={gun:g,dist:10,aimT:1.5};const h=o=>AI.hitChance(Object.assign({},base,o));
  check('hit chance falls with distance, target speed, crouch, cover and suppression',h({dist:25})<h({})&&h({moving:true})<h({})&&h({moving:true,sprint:true})<h({moving:true})&&h({crouch:true})<h({})&&h({cover:1})<h({})&&h({suppressed:1})<h({}),
    `10 m ${h({}).toFixed(2)}, 25 m ${h({dist:25}).toFixed(2)}, moving ${h({moving:true}).toFixed(2)}, crouched ${h({crouch:true}).toFixed(2)}, suppressed ${h({suppressed:1}).toFixed(2)}`);
  check('first shot and early shots are telegraphed (less accurate)',h({first:true})<h({aimT:g.aim})&&h({aimT:g.aim})<h({aimT:g.aim+.6}),`first ${h({first:true}).toFixed(2)}, at telegraph ${h({aimT:g.aim}).toFixed(2)}, settled ${h({aimT:g.aim+.6}).toFixed(2)}`)}

console.log('\nDisarmed enemies (a job sets e.gun=null; JOBS-AUDIT J-01)');
{const nav=navs[2];AI.seed(11);const sq=AI.squad(nav,{});const P={id:'player',x:29,z:15,isPlayer:true};
  const bare={id:'u0',pos:{x:33,z:15},yaw:0,hp:50,maxHp:50,gun:null,state:'idle'};
  let threw=null;try{AI.shotFired(P.x,P.z,bare.pos.x,bare.pos.z,[bare],0)}catch(x){threw=String(x&&x.message)}
  check('a shot near a disarmed enemy with no memory yet does not throw',!threw&&bare.ai&&bare.ai.gun.unarmed===true,threw||'gun '+(bare.ai&&bare.ai.gun.unarmed?'unarmed':'armed'));
  /* one bare from the start, one armed whose gun the job takes away mid-fight, one that gets a gun back */
  const late={id:'u1',pos:{x:22,z:15},yaw:Math.PI/2,hp:50,maxHp:50,gun:'pistol',state:'idle'};const back={id:'u2',pos:{x:29,z:22},yaw:Math.PI,hp:50,maxHp:50,gun:null,state:'idle'};
  const ags=[bare,late,back];for(const e of ags)sq.add(e);let bad=0,threw2=null,lateShotsAfter=0,backShots=0;const dt=1/20;let t=0;
  try{for(let i=0;i<600;i++){t+=dt;if(i===100)late.gun=null;if(i===300)back.gun='pistol';const w={nav,t,threats:[P],agents:ags};sq.update(dt,w);
    for(const e of ags){const I=AI.think(e,w,dt);AI.move(e,I,dt);if(I.fire){if(e===bare)bad++;if(e===late&&i>100)lateShotsAfter++;if(e===back){if(i<300)bad++;else backShots++}}}
    if(i%20===0)AI.shotFired(P.x,P.z,bare.pos.x,bare.pos.z,ags,t)}}catch(x){threw2=String(x&&x.stack).split('\n').slice(0,2).join(' | ')}
  check('a disarmed enemy thinks, moves and hears shots for 30 s without throwing',!threw2,threw2||'');
  check('a disarmed enemy never fires, even when disarmed after his memory exists',bad===0&&lateShotsAfter===0,`bare/unarmed shots ${bad}, shots after the job took his gun ${lateShotsAfter}`);
  check('an enemy handed a gun back fights again',backShots>0&&back.ai.gun===AI.GUNS.pistol,`${backShots} shots after re-arming`)}

console.log('\nSquad tokens (open park, 6 alerted enemies vs a stationary dad, 20 s)');
{const nav=navs[2];AI.seed(7);const sq=AI.squad(nav,{});const P={id:'player',x:29,z:15,isPlayer:true};const ags=[];
  for(const[x,z]of[[9,5],[51,5],[9,25],[51,25],[29,3],[17,9]]){const e={id:'e'+ags.length,pos:{x,z},yaw:Math.atan2(P.x-x,P.z-z),hp:75,maxHp:75,gun:'rifle',role:'grunt',state:'idle'};sq.add(e);ags.push(e)}
  let maxTok=0,viol=0,fireNoTok=0,shots=0;const dt=1/30;let t=0;
  for(let i=0;i<600;i++){t+=dt;const w={nav,t,threats:[P],agents:ags};sq.update(dt,w);for(const e of ags){const I=AI.think(e,w,dt);AI.move(e,I,dt);if(I.fire){shots++;if(!I.token)fireNoTok++}}
    maxTok=Math.max(maxTok,sq.tokens.size);if(sq.tokens.size>sq.max)viol++}
  check('never more than the token limit aiming or shooting at once',viol===0&&fireNoTok===0&&maxTok<=sq.max,`limit ${sq.max}, peak ${maxTok}, ${shots} shots, ${fireNoTok} without a token`);
  check('the squad still fights (shots fired)',shots>10,`${shots} shots in 20 s`);
  const subs=ags.map(e=>e.ai.sub);check('squad members spread over cover spots (no two on one spot)',new Set(ags.filter(e=>e.ai.cover).map(e=>e.ai.cover.spot.i)).size===ags.filter(e=>e.ai.cover).length,subs.join(' '))}

console.log('\nMorale and surrender');
{const nav=navs[0];const sq=AI.squad(nav,{});const es=[0,1,2,3].map(i=>sq.add({id:'m'+i,pos:{x:5+i*2,z:5},hp:75,maxHp:75,gun:'pistol',state:'idle'}));
  const c0=AI.surrenderChance(es[0],.5);es[1].state='dead';es[2].state='surrender';sq.update(.1,{nav,t:1,threats:[],agents:es});
  check('losses lower morale and raise the surrender chance',sq.morale<1&&AI.surrenderChance(es[0],.5)>c0,`morale ${sq.morale.toFixed(2)}, chance ${c0.toFixed(2)} -> ${AI.surrenderChance(es[0],.5).toFixed(2)}`)}

console.log('\nThe Porch Pirate King');
{const nav=navs[3],L=levels[3];AI.seed(3);const sq=AI.squad(nav,{});const bs=L.spawns.find(s=>s.boss);const K={id:'king',pos:{x:bs.x,z:bs.z},yaw:0,hp:420,maxHp:420,gun:'revolver',boss:true,state:'idle'};sq.add(K);
  const P={id:'player',x:bs.x,z:bs.z-10,isPlayer:true};let p=nav.nearestWalkable(P.x,P.z);P.x=nav.wx(p);P.z=nav.wz(p);
  const run=n=>{let t=K._t||0;for(let i=0;i<n;i++){t+=1/20;const w={nav,t,threats:[P],agents:[K]};sq.update(1/20,w);const I=AI.think(K,w,1/20);AI.move(K,I,1/20)}K._t=t};
  const startRoom=nav.roomAt(K.pos.x,K.pos.z);run(40);K.hp=270;run(10);const req=sq.requests.find(r=>r.kind==='reinforce');
  check('at 66% he calls reinforcements, spawned out of the dad\'s sight',!!req&&req.points.length>0&&req.points.every(pt=>!nav.los(P.x,P.z,pt.x,pt.z,false)&&hyp(pt.x-P.x,pt.z-P.z)>=12),req?`${req.points.length} spawn points`:'no request');
  K.hp=130;run(200);const d=nav.roomDepth(nav.roomAt(P.x,P.z));
  check('at 33% he falls back to a deeper room and fights from cover',d[nav.roomAt(K.pos.x,K.pos.z)]>=d[startRoom]&&!!K.ai.cover,`room depth ${d[startRoom]} -> ${d[nav.roomAt(K.pos.x,K.pos.z)]}, state ${K.ai.sub}`);
  check('he taunts',K.ai.tauntT>0)}

console.log('\nCrew');
{const nav=navs[0];const P={x:28,z:9,yaw:Math.PI,crouch:false,moving:true};const cam={x:P.x-(-Math.sin(P.yaw))*2.7+Math.cos(P.yaw)*.7,z:P.z-(-Math.cos(P.yaw))*2.7-Math.sin(P.yaw)*.7,yaw:P.yaw};
  const crew=[0,1,2,3].map(k=>({id:'c'+k,pos:{x:P.x+(k-1.5)*1.5,z:P.z-2},yaw:0,hp:100,maxHp:100,gun:'rifle',slot:k}));
  let t=0;for(let i=0;i<150;i++){t+=1/30;const w={nav,t,player:P,camera:cam,enemies:[],allies:crew};for(const a of crew){const I=AI.ally(a,w,1/30);AI.move(a,I,1/30)}}
  const inCone=crew.filter(a=>AI.inCamCone(cam,P,a.pos.x,a.pos.z)).length;
  check('formation keeps the crew out of the over-the-shoulder camera cone',inCone===0,crew.map(a=>a.pos.x.toFixed(1)+','+a.pos.z.toFixed(1)).join(' '));
  check('callout directions are relative to where the dad looks',AI.dirWord(0,0,0,-1,0,-5)==='front'&&AI.dirWord(0,0,0,-1,-5,0)==='left'&&AI.dirWord(0,0,0,-1,5,0)==='right'&&AI.dirWord(0,0,0,-1,0,5)==='behind');
  /* stack up: dad crouches next to the hallway door of the chop shop */
  const d=nav.doors.filter(x=>x.cells.length<=4)[0];const side=d.axis==='x'?{x:d.x-2.4,z:d.z}:{x:d.x,z:d.z-2.4};const P2={x:side.x,z:side.z,yaw:0,crouch:true,moving:false};
  const c2={x:P2.x,z:P2.z+2.7,yaw:0};let barks=[];crew.forEach((a,k)=>{a.pos.x=P2.x+(k-1.5)*1.2;a.pos.z=P2.z-2.5;const c=nav.nearestWalkable(a.pos.x,a.pos.z);a.pos.x=nav.wx(c);a.pos.z=nav.wz(c)});
  for(let i=0;i<150;i++){t+=1/30;const w={nav,t,player:P2,camera:c2,enemies:[],allies:crew};for(const a of crew){const I=AI.ally(a,w,1/30);AI.move(a,I,1/30);if(I.bark)barks.push(I.bark.text)}}
  const ax=d.axis==='x'?1:0,az=1-ax,ps=Math.sign((P2.x-d.x)*ax+(P2.z-d.z)*az);
  const stacked=crew.filter(a=>Math.sign((a.pos.x-d.x)*ax+(a.pos.z-d.z)*az)===ps&&hyp(a.pos.x-d.x,a.pos.z-d.z)<5.5&&a.ai.intent.state==='stack').length;
  check('dad crouched at a door: the crew stacks up on his side',stacked>=3,`${stacked}/4 stacked, said: ${barks.slice(0,2).join(' / ')}`);
  const onDoor=crew.filter(a=>nav.door[nav.cellOf(a.pos.x,a.pos.z)]).length;check('nobody stacks in the doorway itself',onDoor===0,`${onDoor} on door cells`)}

console.log('\nBarks');
{const all=[...Object.values(AI.BARKS.enemy),...Object.values(AI.BARKS.ally)].flat();
  check('bark catalogue has 80+ short lines',all.length>=80&&all.every(l=>l.length<=60),`${all.length} lines, longest ${Math.max(...all.map(l=>l.length))} chars`);
  const b=AI.barker();let said=0,last=null,rep=0;for(let t=0;t<20;t+=.1){const x=b.say('enemy','spotted','a'+Math.floor(t*3),t);if(x){said++;if(x.text===last)rep++;last=x.text}}
  check('barks are throttled per event and do not repeat back to back',said<=5&&rep===0,`${said} "spotted" lines in 20 s of asking every 0.1 s`)}

console.log('\nMission simulations (scripted dad vs the module, normal difficulty)');
const SEEDS=QUICK?6:16;const summary=[];const allTTK=[];
for(let mi=0;mi<4;mi++){const R={won:0,n:0,time:[],dmg:[],minHp:[],ttk:[],hitRate:[],eShots:0,maxSh:0,tokV:0,noTok:0,solid:0,cover:[0,0],spawnSeen:0,spawned:0,stack:0,surr:0,kills:0,cuffs:0,downs:0,barks:0,why:{}};
  for(let seed=1;seed<=SEEDS;seed++){const S=Sim.create(mi,{seed});let minHp=100;while(S.state==='go'&&S.t<600){S.step();minHp=Math.min(minHp,S.P.hp)}
    const s=S.stats;R.n++;if(S.state==='won')R.won++;else R.why[S.why]=(R.why[S.why]||0)+1;R.time.push(S.t);R.dmg.push(s.dmgToPlayer);R.minHp.push(minHp);R.ttk.push(...s.ttk);
    R.eShots+=s.enemyShots;R.hitRate.push(s.enemyShots?s.enemyHits/s.enemyShots:0);R.maxSh=Math.max(R.maxSh,s.maxShooters);R.tokV+=s.tokenViolations;R.noTok+=s.fireWithoutToken;R.solid+=s.solidViolations;
    R.cover[0]+=s.coverGood;R.cover[1]+=s.coverSamples;R.spawnSeen+=s.spawnSeen;R.spawned+=s.spawned;R.stack+=s.spawnStack;R.surr+=s.surrenders;R.kills+=S.kills;R.cuffs+=S.cuffs;R.downs+=s.allyDowns;R.barks+=s.barks}
  allTTK.push(...R.ttk);const id=MAPS[mi].id+' · '+MAPS[mi].title;
  check(`${id}: the scripted dad wins`,R.won/R.n>=.7,`${R.won}/${R.n} won${Object.keys(R.why).length?' (lost: '+JSON.stringify(R.why)+')':''}`);
  check(`${id}: shooters never exceed the token budget`,R.tokV===0&&R.noTok===0&&R.maxSh<=AI.DIFFICULTY.normal.pool,`peak ${R.maxSh} at once, budget ${AI.DIFFICULTY.normal.pool}`);
  check(`${id}: nobody ends a frame inside a solid cell`,R.solid===0,`${R.solid}`);
  check(`${id}: hiding enemies are actually hidden from the dad`,R.cover[0]/R.cover[1]>.8,`${pct(R.cover[0]/R.cover[1])} of ${R.cover[1]} hide frames`);
  if(MAPS[mi].type==='waves'||R.spawned){check(`${id}: spawns are out of sight and never stacked`,R.spawnSeen/Math.max(1,R.spawned)<.1&&R.stack===0,`${R.spawnSeen}/${R.spawned} spawned in view, ${R.stack} stacked`)}
  summary.push({id,won:`${R.won}/${R.n}`,time:mean(R.time).toFixed(0)+'s',dmg:mean(R.dmg).toFixed(0),minHp:`${q(R.minHp,.5).toFixed(0)} (worst ${Math.min(...R.minHp).toFixed(0)})`,ttk:`${q(R.ttk,.25).toFixed(1)} / ${q(R.ttk,.5).toFixed(1)} / ${q(R.ttk,.75).toFixed(1)}`,hit:pct(mean(R.hitRate)),shots:(R.eShots/R.n).toFixed(0),downs:(R.kills/R.n).toFixed(1)+' down, '+(R.cuffs/R.n).toFixed(1)+' cuffed',crew:(R.downs/R.n).toFixed(1),barks:(R.barks/R.n).toFixed(0)})}
console.log('\nTime-to-kill and fight statistics ('+SEEDS+' seeds per mission)');
console.log('  TTK = seconds from an enemy entering combat until he is down or surrenders (p25 / median / p75)');
console.table(summary.map(s=>({mission:s.id,won:s.won,'avg time':s.time,'dmg taken':s.dmg,'median min hp (worst)':s.minHp,'TTK p25/50/75':s.ttk,'enemy hit %':s.hit,'enemy shots':s.shots,'per run':s.downs,'crew downs':s.crew,barks:s.barks})));
console.log(`  all missions: ${allTTK.length} enemies, TTK p25 ${q(allTTK,.25).toFixed(1)}s, median ${q(allTTK,.5).toFixed(1)}s, p75 ${q(allTTK,.75).toFixed(1)}s, p90 ${q(allTTK,.9).toFixed(1)}s`);

console.log('\nDeterminism');
{const a=Sim.create(3,{seed:5}).run(60),b=Sim.create(3,{seed:5}).run(60);check('same seed, same fight',a.t===b.t&&a.P.hp===b.P.hp&&a.kills===b.kills&&a.stats.enemyShots===b.stats.enemyShots,`t ${a.t.toFixed(1)}, hp ${a.P.hp.toFixed(1)}, shots ${a.stats.enemyShots}`)}

console.log(`\n${pass} passed, ${fail} failed`);
if(process.argv.includes('--write')){fs.writeFileSync(path.join(__dirname,'ai.test.out.txt'),results.join('\n')+'\n')}
process.exit(fail?1:0);
