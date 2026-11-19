/* High Trust · headless 2D fight simulator for the AI module.
   Reproduces the game's mission rules (loot, stash clock, park waves, the King), its damage and
   surrender numbers, and drives the player with a scripted "reasonable dad". Used by dev/ai.test.js
   (node) and dev/ai.html (canvas). No rendering here. */
(function(root){
'use strict';
const AI=root.HT&&root.HT.AI||require('../js/ai.js');
const MAPS=root.HT&&root.HT.MAPS||require('./maps.js');
const hyp=Math.hypot,clamp=(v,a,b)=>v<a?a:v>b?b:v;
const TILE=2,SOLID='#hctTfVQ';
const tileC=i=>i*TILE+TILE/2;
/* player guns, from index.html WEAPONS (human fire rate slowed a little for aimed shots) */
const PW={pistol:{dmg:30,rate:.3,mag:12,res:84,reload:1.2,pellets:1,range:70},shotgun:{dmg:15,rate:.9,mag:6,res:36,reload:2.1,pellets:9,range:28},rifle:{dmg:24,rate:.14,mag:30,res:180,reload:1.9,pellets:1,range:90}};
const HOMIE_GUN={gary:'pistol',rick:'rifle',dave:'shotgun',doug:'rifle'};

/* the game's level grid, with the bounce house written in as solid cells like buildLevel() does */
function prepLevel(def){const rows=def.map,H=rows.length,W=Math.max(...rows.map(r=>r.length));
  const g=rows.map(r=>(r+def.pad.repeat(W)).slice(0,W).split(''));
  const L={def,W,H,g,items:[],stashes:[],spawns:[],ammo:[],waveSpawns:[],start:null,exit:null,grill:null,colliders:[]};
  for(let z=0;z<H;z++)for(let x=0;x<W;x++){const c=g[z][x],X=tileC(x),Z=tileC(z);
    if(c==='I')L.items.push({x:X,z:Z,got:false,prog:0});else if(c==='T')L.stashes.push({x:X,z:Z,done:false,prog:0});else if(c==='a')L.ammo.push({x:X,z:Z,got:false});
    else if(c==='E'||c==='B')L.spawns.push({x:X,z:Z,boss:c==='B'});else if(c==='S')L.waveSpawns.push({x:X,z:Z});else if(c==='P')L.start={x:X,z:Z};
    else if(c==='X'){L.exit={x:X+2.6,z:Z};L.colliders.push({x0:X-1.1,z0:Z-2.3,x1:X+1.1,z1:Z+2.3})}
    else if(c==='Q'){L.grill={x:X,z:Z};L.bounce={x:X,z:Z+9};L.colliders.push({x0:X-1.55,z0:Z+9-1.55,x1:X+1.55,z1:Z+9+1.55})}}
  if(L.bounce){const tx=v=>Math.floor(v/TILE);for(let zz=tx(L.bounce.z-1.4);zz<=tx(L.bounce.z+1.4);zz++)for(let xx=tx(L.bounce.x-1.4);xx<=tx(L.bounce.x+1.4);xx++)if(g[zz]&&g[zz][xx]&&!SOLID.includes(g[zz][xx]))g[zz][xx]='V'}
  return L}

function create(mi,o){o=Object.assign({seed:1,difficulty:'normal',dt:1/30,skill:1},o||{});AI.seed(o.seed);let rs=o.seed*9301+49297;
  const rnd=()=>{rs=(rs*9301+49297)%233280;return rs/233280},rr=(a,b)=>a+rnd()*(b-a),pick=a=>a[Math.floor(rnd()*a.length)];
  const def=MAPS[mi],L=prepLevel(def);
  const nav=AI.buildNav(L.g,{colliders:L.colliders});
  const S={mi,def,L,nav,t:0,noises:[],state:'go',why:'',log:[],shots:[],events:[],kills:0,cuffs:0,
    stats:{enemyShots:0,enemyHits:0,dmgToPlayer:0,dmgToAllies:0,playerShots:0,playerHits:0,ttk:[],maxShooters:0,tokenViolations:0,fireWithoutToken:0,solidViolations:0,coverSamples:0,coverGood:0,allyDowns:0,spawnSeen:0,spawned:0,spawnStack:0,barks:0,surrenders:0,engage:[]}};
  const P={id:'player',pos:{x:L.start.x,z:L.start.z},yaw:Math.PI,hp:100,regenT:0,crouch:false,moving:false,sprint:false,weapons:def.weapons.slice(),cur:mi===0?'pistol':def.weapons[def.weapons.length-1],ammo:{},reloadT:0,fireT:0,aimT:0,aimAt:null,busyT:0,path:null,pi:0,goalKey:'',mode:'go',holdT:0};
  for(const w of P.weapons)P.ammo[w]={mag:PW[w].mag,res:PW[w].res};
  S.P=P;S.enemies=[];S.allies=[];
  const pool=AI.pool({maxShooters:AI.DIFFICULTY[o.difficulty].pool});S.pool=pool;const squads=new Map();S.squads=[];
  const barker=AI.barker();
  function squadFor(x,z){const r=nav.roomAt(x,z),key=nav.rooms[r]&&nav.rooms[r].indoor?r:'out';let s=squads.get(key);if(!s){s=AI.squad(nav,{difficulty:o.difficulty,pool,barker,name:String(key)});squads.set(key,s);S.squads.push(s)}return s}
  let eid=0;
  function spawnEnemy(x,z,boss,gun){if(!gun)gun=boss?'revolver':pick(mi===0?['pistol','pistol','nailer','shotgun']:mi===1?['pistol','smg','smg','shotgun']:mi===2?['smg','rifle','double','pistol']:['rifle','rifle','smg','double','revolver']);
    const hp=boss?420:(gun==='shotgun'||gun==='double')?90:75;
    const e={id:'e'+(eid++),kind:'enemy',pos:{x,z},yaw:rr(0,6.28),hp,maxHp:hp,gun,boss:!!boss,state:'idle',triedSurr:false,role:AI.roleFor(gun,boss),dmgMul:(mi===0?.8:1)*(boss?1.4:1),born:S.t};
    squadFor(x,z).add(e);S.enemies.push(e);return e}
  for(const s of L.spawns){const e=spawnEnemy(s.x,s.z,s.boss);if(s.boss)L.boss=e}
  {const f={x:-Math.sin(P.yaw),z:-Math.cos(P.yaw)},r={x:Math.cos(P.yaw),z:-Math.sin(P.yaw)};
    def.crew.forEach((c,k)=>{const side=k%2?1:-1,row=Math.floor(k/2);const a={id:c,kind:'ally',pos:{x:L.start.x+r.x*2.2*side+f.x*(1.8+row*1.3),z:L.start.z+r.z*2.2*side+f.z*(1.8+row*1.3)},yaw:0,hp:100,maxHp:100,down:false,downT:0,gun:HOMIE_GUN[c],slot:k};collide(a.pos);S.allies.push(a)})}
  const M={t:def.time||0,got:0,smashed:0,exitOpen:false,bossDone:null,warn60:false};S.M=M;
  let director=null;if(def.type==='waves'){director=AI.director(nav,{spawns:L.waveSpawns,defend:L.grill,waves:def.waves});S.director=director}

  function collide(p,r=.35){for(let pass=0;pass<2;pass++){const cx=Math.floor(p.x/TILE),cz=Math.floor(p.z/TILE);
    for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){if(nav.walkable(x,z))continue;const x0=x*TILE,z0=z*TILE,x1=x0+TILE,z1=z0+TILE;
      if(p.x+r>x0&&p.x-r<x1&&p.z+r>z0&&p.z-r<z1){const ox1=p.x+r-x0,ox2=x1-(p.x-r),oz1=p.z+r-z0,oz2=z1-(p.z-r);const mx=Math.min(ox1,ox2),mz=Math.min(oz1,oz2);if(mx<mz)p.x+=ox1<ox2?-ox1:ox2;else p.z+=oz1<oz2?-oz1:oz2}}}}
  S.collide=collide;
  const say=(who,b)=>{if(!b)return;S.stats.barks++;S.log.push({t:S.t,who,text:b.text,ev:b.event});if(S.log.length>60)S.log.shift()};

  /* ---------- damage rules (index.html hurtEnemy / surrender / hurtPlayer / hurtAlly) ---------- */
  function hurtEnemy(e,dmg,by){if(e.state==='dead'||e.state==='cuffed')return;if(e.state==='surrender')return;
    const thr=e.boss?.18:.4;if(e.boss&&!e.triedSurr&&e.hp>=e.maxHp*thr&&e.hp-dmg<=0)dmg=e.hp-e.maxHp*thr+1;
    e.hp-=dmg;if(e.ai&&e.ai.mode==='idle'){e.ai.lkp={x:P.pos.x,z:P.pos.z,t:S.t}}
    if(e.hp<=0){kill(e);return'dead'}
    if(!e.triedSurr&&e.hp<e.maxHp*thr){e.triedSurr=true;if(e.boss||rnd()<AI.surrenderChance(e,.5))surrender(e)}}
  function endEng(e){const a=e.ai;if(a&&a.engT!=null)S.stats.ttk.push(S.t-a.engT)}
  function surrender(e){e.state='surrender';e.surrAt=S.t;S.stats.surrenders++;endEng(e);const b=barker.say('enemy','surrender',e.id,S.t);say(e.role,b);S.events.push({t:S.t,k:'surrender',x:e.pos.x,z:e.pos.z})}
  function kill(e){e.state='dead';S.kills++;endEng(e);if(e.boss)M.bossDone='down';S.events.push({t:S.t,k:'down',x:e.pos.x,z:e.pos.z})}
  function hurtPlayer(d){if(S.state!=='go')return;P.hp-=d;P.regenT=4.5;S.stats.dmgToPlayer+=d;if(P.hp<=0){P.hp=0;end(false,'player down')}}
  function hurtAlly(a,d){if(a.down)return;a.hp-=d;S.stats.dmgToAllies+=d;if(a.hp<=0){a.down=true;a.downT=9;a.hp=0;S.stats.allyDowns++}}
  function end(ok,why){if(S.state!=='go')return;S.state=ok?'won':'lost';S.why=why||''}
  S.hurtEnemy=hurtEnemy;

  /* ---------- the scripted dad ---------- */
  const enemyCrouch=e=>e.ai&&e.ai.stance==='crouch';
  function visibleEnemies(){const out=[];for(const e of S.enemies){if(e.state!=='idle')continue;const d=hyp(e.pos.x-P.pos.x,e.pos.z-P.pos.z);if(d>45)continue;
      if(nav.los(P.pos.x,P.pos.z,e.pos.x,e.pos.z,enemyCrouch(e)||P.crouch))out.push([e,d])}return out}
  function goTo(x,z,key,speed,dt){if(P.goalKey!==key||!P.path||S.t-P.pathT>1.5){const p=nav.path(P.pos.x,P.pos.z,x,z);P.path=p?p.pts:null;P.pi=1;P.goalKey=key;P.pathT=S.t}
    if(!P.path)return false;while(P.pi<P.path.length&&hyp(P.path[P.pi].x-P.pos.x,P.path[P.pi].z-P.pos.z)<.3)P.pi++;
    if(P.pi>=P.path.length)return false;const w=P.path[P.pi],dx=w.x-P.pos.x,dz=w.z-P.pos.z,dl=hyp(dx,dz)||1;
    const st=Math.min(speed*dt,dl);P.pos.x+=dx/dl*st;P.pos.z+=dz/dl*st;collide(P.pos);P.moving=true;P.yaw=Math.atan2(-dx,-dz);return true}
  function objective(){const m=def;
    if(M.exitOpen&&L.exit)return{x:L.exit.x,z:L.exit.z,key:'exit',kind:'exit'};
    if(m.type==='loot'){let b=null,bd=1e9;for(const it of L.items)if(!it.got){const d=nav.travel(P.pos.x,P.pos.z,it.x,it.z);if(d<bd){bd=d;b=it}}return b?{x:b.x,z:b.z,key:'i'+b.x+','+b.z,kind:'item',obj:b}:null}
    if(m.type==='stash'){let b=null,bd=1e9;for(const s of L.stashes)if(!s.done){const d=nav.travel(P.pos.x,P.pos.z,s.x,s.z);if(d<bd){bd=d;b=s}}return b?{x:b.x,z:b.z,key:'s'+b.x+','+b.z,kind:'stash',obj:b}:null}
    if(m.type==='waves'){const live=S.enemies.filter(e=>e.state==='idle');if(live.length&&director&&director.hunt){const e=live[0];return{x:e.pos.x,z:e.pos.z,key:'hunt'+e.id,kind:'hunt'}}
      return{x:L.grill.x,z:L.grill.z+3,key:'grill',kind:'hold'}}
    if(m.type==='boss'){const b=L.boss;if(b&&b.state==='idle'){/* clear the house room by room: nearest live enemy first, the King last */
        let n=null,nd=1e9;for(const e of S.enemies)if(e.state==='idle'&&!e.boss){const d=nav.travel(P.pos.x,P.pos.z,e.pos.x,e.pos.z);if(d<nd){nd=d;n=e}}
        if(n&&nd<30)return{x:n.pos.x,z:n.pos.z,key:'clr'+n.id,kind:'hunt'};return{x:b.pos.x,z:b.pos.z,key:'king',kind:'hunt'}}}
    return null}
  function playerBrain(dt){P.moving=false;P.fireT-=dt;if(P.busyT>0)P.busyT-=dt;
    const w=PW[P.cur],am=P.ammo[P.cur];
    if(P.reloadT>0){P.reloadT-=dt;if(P.reloadT<=0){const n=Math.min(w.mag-am.mag,am.res);am.mag+=n;am.res-=n}}
    if(P.regenT>0)P.regenT-=dt;else if(P.hp<100)P.hp=Math.min(100,P.hp+12*dt);
    for(const a of L.ammo)if(!a.got&&hyp(a.x-P.pos.x,a.z-P.pos.z)<1.5){a.got=true;for(const k of P.weapons)P.ammo[k].res+=PW[k].mag*2}
    const vis=visibleEnemies();vis.sort((p,q)=>(p[0].ai&&p[0].ai.intent&&p[0].ai.intent.fire?-8:0)+p[1]-((q[0].ai&&q[0].ai.intent&&q[0].ai.intent.fire?-8:0)+q[1]));
    const tgt=vis.length?vis[0]:null;
    /* weapon: shotgun up close if carried, otherwise the best long gun */
    if(tgt){const want=tgt[1]<6&&P.weapons.includes('shotgun')?'shotgun':(P.weapons.includes('rifle')?'rifle':'pistol');if(want!==P.cur&&P.reloadT<=0&&P.fireT<=0){P.cur=want;P.fireT=.35}}
    const W2=PW[P.cur],A2=P.ammo[P.cur];
    if(A2.mag<=0&&P.reloadT<=0&&A2.res>0)P.reloadT=W2.reload;
    if(!tgt&&A2.mag<W2.mag*.4&&P.reloadT<=0&&A2.res>0)P.reloadT=W2.reload;
    P.crouch=false;
    /* hurt: back off to cover from whoever is shooting, wait for regen */
    if(P.mode==='go'&&P.hp<40&&tgt)P.mode='heal';
    if(P.mode==='heal'){if(P.hp>=85||!vis.length&&P.hp>=70){P.mode='go';P.healSpot=null}
      else{if(!P.healSpot&&tgt){let best=null,bs=1e9;const df=nav.distField(nav.nearestWalkable(P.pos.x,P.pos.z));for(const sp of nav.covers){if(df[sp.i]>14)continue;if(vis.some(([e])=>!!nav.los(e.pos.x,e.pos.z,sp.x,sp.z,true)))continue;if(df[sp.i]<bs){bs=df[sp.i];best=sp}}P.healSpot=best||{x:L.start.x,z:L.start.z}}
        if(P.healSpot){if(!goTo(P.healSpot.x,P.healSpot.z,'heal',4.3,dt))P.crouch=true}}}
    if(P.mode==='go'){
      if(P.cuffT&&P.cuffT.state!=='surrender')P.cuffT=null;
      if(!P.cuffT){let b=null,bd=vis.length?22:1e9;for(const e of S.enemies)if(e.state==='surrender'){const d=nav.travel(P.pos.x,P.pos.z,e.pos.x,e.pos.z);if(d<bd){bd=d;b=e}}P.cuffT=b}
      const sur=P.cuffT;
      const fighting=tgt&&tgt[1]<26;
      if(sur&&!fighting){if(hyp(sur.pos.x-P.pos.x,sur.pos.z-P.pos.z)<2.2){if(P.busyT<=0){sur.state='cuffed';S.cuffs++;P.busyT=.5;if(sur.boss)M.bossDone='cuffed'}}else goTo(sur.pos.x,sur.pos.z,'cuff'+sur.id,4.3,dt)}
      else if(!fighting||P.reloadT>0&&tgt[1]>10){const ob=objective();
        if(ob){const d=hyp(ob.x-P.pos.x,ob.z-P.pos.z);
          if(ob.kind==='item'&&d<1.7||ob.kind==='stash'&&d<2.2){const o2=ob.obj;o2.prog+=dt/(ob.kind==='item'?.9:1.4);P.busyT=.1;if(o2.prog>=1){if(ob.kind==='item'){o2.got=true;M.got++}else{o2.done=true;M.smashed++}}}
          else if(ob.kind==='hold'&&d<2.5){}
          else goTo(ob.x,ob.z,ob.key,fighting?3:5,dt)}}
      else if(tgt[1]>20&&!(tgt[0].ai&&tgt[0].ai.sub==='cover')){/* close the distance on long-range targets */goTo(tgt[0].pos.x,tgt[0].pos.z,'close'+tgt[0].id,3,dt)}}
    /* shoot */
    if(tgt){const[e,d]=tgt;if(P.aimAt!==e){P.aimAt=e;P.aimT=0}P.aimT+=dt;
      if(!P.moving)P.yaw=Math.atan2(-(e.pos.x-P.pos.x),-(e.pos.z-P.pos.z));
      if(P.fireT<=0&&P.reloadT<=0&&A2.mag>0&&P.aimT>.45&&P.mode!=='heal'||P.mode==='heal'&&P.fireT<=0&&P.reloadT<=0&&A2.mag>0&&d<10){
        A2.mag--;P.fireT=W2.rate;S.stats.playerShots++;S.noises.push({x:P.pos.x,z:P.pos.z,r:26,t:S.t,kind:'gun',id:'player'});
        AI.shotFired(P.pos.x,P.pos.z,e.pos.x,e.pos.z,S.enemies,S.t);
        let dmg=0;const cover=enemyCrouch(e)?.8:1;
        if(W2.pellets>1){const fall=clamp(1.15-d/W2.range,.25,1);const pp=clamp(1.15-d/14,.04,1)*.75*cover*(P.moving?.75:1)*o.skill;for(let k=0;k<W2.pellets;k++)if(rnd()<pp)dmg+=W2.dmg*fall}
        else{const acc=clamp((P.cur==='rifle'?.66-d*.01:.72-d*.013)*cover*(P.moving?.75:1)*(e.ai&&e.ai.intent&&e.ai.intent.speed>1?.8:1)*o.skill,.1,.9);if(rnd()<acc)dmg=W2.dmg*(rnd()<.14?2:1)}
        S.shots.push({t:S.t,x0:P.pos.x,z0:P.pos.z,x1:e.pos.x,z1:e.pos.z,k:'p',hit:dmg>0});
        if(dmg>0){S.stats.playerHits++;hurtEnemy(e,dmg,'player')}}}
    else P.aimAt=null;
    P.sprint=false}

  /* ---------- main step ---------- */
  S.step=function(dt=o.dt){if(S.state!=='go')return;S.t+=dt;const t=S.t;
    playerBrain(dt);if(S.state!=='go')return;
    const threats=[{id:'player',x:P.pos.x,z:P.pos.z,fx:-Math.sin(P.yaw),fz:-Math.cos(P.yaw),fov:.96,isPlayer:true,crouch:P.crouch,moving:P.moving,sprint:P.sprint,reloading:P.reloadT>0,busy:P.busyT>0,down:false}];
    for(const a of S.allies)threats.push({id:a.id,x:a.pos.x,z:a.pos.z,crouch:a.ai&&a.ai.stance==='crouch',moving:!!(a.ai&&a.ai.intent&&a.ai.intent.speed>0),down:a.down});
    const live=S.enemies.filter(e=>e.state==='idle');
    const world={nav,t,threats,agents:live,noises:(S.noises=S.noises.filter(n=>t-n.t<.5)),diff:AI.DIFFICULTY[o.difficulty]};
    for(const s of S.squads)s.update(dt,world);
    for(const e of live){const I=AI.think(e,world,dt);
      if(e.ai.mode==='combat'&&e.ai.engT==null)e.ai.engT=t;
      AI.move(e,I,dt);collide(e.pos);
      if(!nav.walkAt(e.pos.x,e.pos.z))S.stats.solidViolations++;
      if(I.bark)say(e.role,I.bark);
      if(I.fire){S.stats.enemyShots++;if(!I.token)S.stats.fireWithoutToken++;const th=I.targetId==='player'?P:S.allies.find(a=>a.id===I.targetId);
        if(th){const hit=rnd()<I.hitChance;S.shots.push({t,x0:e.pos.x,z0:e.pos.z,x1:th.pos.x,z1:th.pos.z,k:'e',hit});if(hit){S.stats.enemyHits++;if(th===P)hurtPlayer(I.dmg);else hurtAlly(th,I.dmg)}}}
      if(I.wantsSurrender&&!e.triedSurr){e.triedSurr=true;surrender(e)}
      /* live cover sample: hiding enemies should actually be hidden from the dad */
      if(e.ai.mode==='combat'&&e.ai.sub==='cover'&&e.ai.phase==='hide'&&e.ai.cover&&e.ai.role!=='rusher'){S.stats.coverSamples++;if(!nav.los(P.pos.x,P.pos.z,e.pos.x,e.pos.z,e.ai.stance==='crouch'))S.stats.coverGood++}}
    for(const s of S.squads){if(s.tokens.size>s.max)S.stats.tokenViolations++}
    if(pool.holders.size>pool.max)S.stats.tokenViolations++;
    S.stats.maxShooters=Math.max(S.stats.maxShooters,pool.holders.size);
    /* crew */
    const aw={nav,t,player:{x:P.pos.x,z:P.pos.z,yaw:P.yaw,crouch:P.crouch,moving:P.moving,reloading:P.reloadT>0,busy:P.busyT>0,hp:P.hp},camera:{x:P.pos.x-(-Math.sin(P.yaw))*2.7+Math.cos(P.yaw)*.7,z:P.pos.z-(-Math.cos(P.yaw))*2.7-Math.sin(P.yaw)*.7,yaw:P.yaw},enemies:S.enemies,allies:S.allies,barker};
    for(const a of S.allies){if(a.down){a.downT-=dt;if(a.downT<=0){a.down=false;a.hp=60}continue}
      const I=AI.ally(a,aw,dt);if(I.teleport){a.pos.x=I.teleport.x;a.pos.z=I.teleport.z}
      AI.move(a,I,dt);collide(a.pos);if(!nav.walkAt(a.pos.x,a.pos.z))S.stats.solidViolations++;
      if(I.bark)say(a.id,I.bark);
      if(I.reviving){const o2=S.allies.find(x=>x.id===I.revive);if(o2)o2.downT-=dt*2}
      if(I.fire){const e=S.enemies.find(x=>x.id===I.targetId);if(e){const hit=rnd()<I.hitChance;S.shots.push({t,x0:a.pos.x,z0:a.pos.z,x1:e.pos.x,z1:e.pos.z,k:'a',hit});AI.shotFired(a.pos.x,a.pos.z,e.pos.x,e.pos.z,S.enemies,t);S.noises.push({x:a.pos.x,z:a.pos.z,r:22,t,kind:'gun',id:a.id});if(hit)hurtEnemy(e,I.dmg,'ally')}}}
    /* squad requests (the King's reinforcements) */
    for(const s of S.squads)while(s.requests.length){const r=s.requests.shift();if(r.kind==='reinforce')for(const p of r.points){const e=spawnEnemy(p.x,p.z,false);s.add(e);AI.mem(e,world);e.ai.mode='combat';e.ai.sub='react';e.ai.react=t+.6;e.ai.lkp={x:P.pos.x,z:P.pos.z,t};S.stats.spawned++;if(nav.los(P.pos.x,P.pos.z,p.x,p.z,false))S.stats.spawnSeen++}}
    /* mission rules */
    const m=def;
    if(m.type==='stash'){if(M.smashed<3){M.t-=dt;if(!M.warn60&&M.t<60){M.warn60=true;const far=L.spawns.filter(s=>!s.boss&&hyp(s.x-P.pos.x,s.z-P.pos.z)>16);for(let i=0;i<2&&far.length;i++){const s=far.splice(Math.floor(rnd()*far.length),1)[0];const e=spawnEnemy(s.x+rr(-.5,.5),s.z+rr(-.5,.5),false);e.hunt=true}}
        if(M.t<=0)return end(false,'clock ran out')}else M.exitOpen=true}
    if(m.type==='loot'&&M.got>=4)M.exitOpen=true;
    if(m.type==='boss'&&M.bossDone){const b=L.boss;if(M.bossDone==='down'||b.state==='cuffed')M.exitOpen=true}
    if(m.type==='waves'){const liveN=S.enemies.filter(e=>e.state==='idle').length;
      const orders=director.update(dt,{t,threats,alive:liveN,agents:S.enemies.filter(e=>e.state==='idle')});
      for(const od of orders){const e=spawnEnemy(od.x,od.z,false);e.lane=od.lane;e.wave=od.wave;S.stats.spawned++;if(director.seenBy(threats[0],od.x,od.z))S.stats.spawnSeen++;
        if(S.enemies.some(x=>x!==e&&x.state==='idle'&&hyp(x.pos.x-e.pos.x,x.pos.z-e.pos.z)<1))S.stats.spawnStack++}
      if(director.finished&&!S.enemies.some(e=>e.state==='surrender'))return end(true)}
    if(M.exitOpen&&L.exit&&hyp(L.exit.x-P.pos.x,L.exit.z-P.pos.z)<2.2)return end(true);
    if(t>600)end(false,'timeout');
    if(S.shots.length>200)S.shots.splice(0,S.shots.length-200)};
  S.run=function(maxT=600,dt=o.dt){while(S.state==='go'&&S.t<maxT)S.step(dt);return S};
  return S}

const Sim={create,prepLevel,MAPS,PW};
if(typeof module!=='undefined'&&module.exports)module.exports=Sim;
root.HT=root.HT||{};root.HT.Sim=Sim;
})(typeof window!=='undefined'?window:globalThis);
