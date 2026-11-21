/* High Trust · HT.Garage + HT.CarAI
 * Vehicle stats, upgrades, van physics/damage and AI car controllers (docs/design/SPEC2.md B.7, C). Pure logic, browser + Node.
 *
 *   HT.Garage.apply(type, vehicleSave, util)  -> stats {maxSpeed, boostMax, accel, boostAccel, grip, brake, hp, ramMult, bulletMul, ammoBonus, slots, ...}
 *   HT.Garage.req(id, ctx) -> null | 'reason'   HT.Garage.CATALOG, VEH, COSMETICS, HORNS
 *   const car = HT.CarAI.make('sedan', {x,z,yaw});
 *   HT.CarAI.drive(car, {thr,st,boost,hb,sport}, dt, collide)   the player's VAN model (index.html updVan), upgrade-aware
 *   HT.CarAI.follow(car, points, opts) / flee(car, G, opts) / wander(car, G, opts)   attach an AI controller
 *   HT.CarAI.step(car, dt, ctx)                  run the controller (ctx: {van, G, collide, rnd, speedCap(x,z,car)->m/s|null})
 *   HT.CarAI.ram(van, car, opts)                 circle-pair contact: separation, speed exchange, damage, PIT
 *   HT.CarAI.impact(van, speed, front, inMission) wall/prop damage; HT.CarAI.state(van) -> {stage, speedMul}
 *   HT.CarAI.simulateChase(opts)                 headless chase used by tests and dev/world.html
 * Conventions match index.html: yaw 0 faces -z, forward = (-sin yaw, -cos yaw), positive steer turns left (yaw grows). Metres, m/s.
 */
(function(root){'use strict';
const HT=root.HT=root.HT||{};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const fwd=y=>[-Math.sin(y),-Math.cos(y)],yawTo=(dx,dz)=>Math.atan2(-dx,-dz);

/* ---------- vehicle base stats (stock, m/s; same numbers as index.html CAR_FEEL, checked by dev/test-carai.js) ---------- */
const VEH={
 minivan:{name:'Family Minivan', seats:7,len:4.4,wid:2.0,hp:100,max:25,boostMax:33,acc:9,  boostAcc:12, brake:24,hbrake:20,coast:3.5,revMax:8,revAcc:7,steerResp:7,  turn:1.55,turnFade:.75,grip:9,   ram:1.0,mass:1.0,cargo:0,price:0},
 workvan:{name:'The Contractor', seats:3,len:5.0,wid:2.1,hp:130,max:20,boostMax:27,acc:6,  boostAcc:8.5,brake:20,hbrake:17,coast:3.2,revMax:7,revAcc:6,steerResp:5.2,turn:1.3,turnFade:.75,grip:7.5,   ram:1.2,mass:1.3,cargo:2,price:3500},
 pickup: {name:'The Tailgater',  seats:5,len:5.2,wid:2.0,hp:120,max:23.5,boostMax:32,acc:7.6,boostAcc:11, brake:23,hbrake:20,coast:3.5,revMax:8,revAcc:7,steerResp:7,turn:1.62,turnFade:.75,grip:8.5, ram:1.3,mass:1.2,cargo:2,price:5500},
 suv:    {name:'The Suburbanite',seats:7,len:4.8,wid:2.0,hp:140,max:26.5,boostMax:34,acc:8.2, boostAcc:11, brake:22,hbrake:19,coast:3.5,revMax:8,revAcc:7,steerResp:6,  turn:1.42,turnFade:.75,grip:8,ram:1.4,mass:1.4,cargo:1,price:7500},
 sedan:  {name:'Sedan',          seats:5,len:4.6,wid:1.9,hp:100,max:30,boostMax:38,acc:12, boostAcc:15, brake:27,hbrake:21,coast:3.5,revMax:8,revAcc:8,steerResp:8.5,turn:1.75,turnFade:.75,grip:10.5,  ram:.9, mass:.9, cargo:0,price:null},
 hatch:  {name:'Hatchback',      seats:4,len:3.9,wid:1.8,hp:80, max:27.5,boostMax:34,acc:13.5, boostAcc:16, brake:28,hbrake:22,coast:3.5,revMax:8,revAcc:8,steerResp:10,  turn:2.05,turnFade:.75,grip:11.5,  ram:.8, mass:.8, cargo:0,price:null},
};
/* the ride-on mower (The Grass Is Greener, SPEC3 2.13): slow but twitchy. Not enumerable, so the car lists (garage, CAR_FEEL parity test,
   traffic) skip it; VEH.mower and apply('mower') work. Its index.html handling row is registered by js/jobs/mower.js. */
Object.defineProperty(VEH,'mower',{enumerable:false,value:{name:'Ride-On Mower',  seats:1,len:2.0,wid:1.18,hp:60, max:9,   boostMax:11,acc:5.2, boostAcc:6.4, brake:13, hbrake:11,coast:4,  revMax:3,revAcc:4,  steerResp:11, turn:2.4, turnFade:.3, grip:7,     ram:.55,mass:.45,cargo:0,price:null}});
const ENGINE=[{m:0,b:0,a:1},{m:2,b:2,a:1.18},{m:4,b:5,a:1.37},{m:6,b:8,a:1.62}],
      TYRES=[{g:1,s:1,t:1},{g:1.25,s:1.2,t:1.05},{g:1.55,s:1.45,t:1.10}],
      BRAKES=[{b:1,h:1},{b:1.25,h:1.15},{b:1.5,h:1.35}],
      ARMOR=[{hp:0,bul:1},{hp:40,bul:.75},{hp:90,bul:.5}],
      SPORT={dur:3.5,cool:14,accMul:1.6,maxAdd:6};
/* catalog (SPEC2 C.1). req fields: has (item ids), trust (Maple), trustR (Riverside), done (job ids) */
const CATALOG=[
 {id:'eng1',group:'perf',slot:'engine',lvl:1,name:'Tune-Up & Fresh Plugs',blurb:"It's been 'due' since 2016",price:500},
 {id:'eng2',group:'perf',slot:'engine',lvl:2,name:'V6 Swap',blurb:"Sal had one lying around. Don't ask.",price:1200,req:{has:['eng1'],trust:40}},
 {id:'eng3',group:'perf',slot:'engine',lvl:3,name:'The Soccer-Mom Special (supercharger)',blurb:'Built by the Second Gear kids',price:2200,req:{has:['eng2'],done:['dee'],trustR:50}},
 {id:'tyre1',group:'perf',slot:'tyres',lvl:1,name:'All-Season Radials',blurb:'Tread you can trust',price:250},
 {id:'tyre2',group:'perf',slot:'tyres',lvl:2,name:'Performance Rubber',blurb:"For the school run you're late for",price:600,req:{has:['tyre1']}},
 {id:'brk1',group:'perf',slot:'brakes',lvl:1,name:'Ceramic Pads',blurb:'Squeak-free since this morning',price:200},
 {id:'brk2',group:'perf',slot:'brakes',lvl:2,name:'Big Brake Kit',blurb:"Stops faster than Gary's jokes",price:450,req:{has:['brk1']}},
 {id:'sport',group:'perf',slot:'sport',lvl:1,name:'Sport Mode',blurb:'The van always had it. You just never pressed the button.',price:900,req:{has:['eng1']}},
 {id:'bull',group:'prot',slot:'bullBar',lvl:1,name:'Bull Bar',blurb:"Off a snowplow. Sal says it's fine.",price:450,req:{any:[{done:['dee']},{trustR:30}]}},
 {id:'armor1',group:'prot',slot:'armor',lvl:1,name:'Reinforced Panels I',blurb:'Kevlar? No. Plywood? Also no.',price:350},
 {id:'armor2',group:'prot',slot:'armor',lvl:2,name:'Reinforced Panels II',blurb:'Sal stopped explaining.',price:800,req:{has:['armor1'],trustR:40}},
 {id:'cargo',group:'util',slot:'cargo',lvl:1,name:'Roof Cargo Box',blurb:'The good cooler goes up top',price:300},
 {id:'rack',group:'util',slot:'rack',lvl:1,name:'Gun Rack',blurb:'Three is a reasonable number of guns for a soccer dad',price:700,req:{trust:60}},
 {id:'aid',group:'util',slot:'aid',lvl:1,name:"Rosa's First-Aid Kit",blurb:'Labelled. Alphabetised. Do not touch the scissors.',price:400,req:{done:['rosa']}},
 {id:'hitch',group:'util',slot:'hitch',lvl:1,name:'Tow Hitch',blurb:"Rated for 3,500 lb. Sal rated it for 'probably'.",price:350,req:{done:['tow']}},
 {id:'v_workvan',group:'vehicle',type:'workvan',name:'The Contractor',blurb:'For the dad who owns a ladder',price:3500,req:{done:['doug']}},
 {id:'v_pickup',group:'vehicle',type:'pickup',name:'The Tailgater',blurb:'Bed holds two coolers or one Big Dave',price:5500,req:{done:['earl']}},
 {id:'v_suv',group:'vehicle',type:'suv',name:'The Suburbanite',blurb:'Seats seven. Fits one ego.',price:7500,req:{done:['benny']}},
];
const COSMETICS={
 paint:{slate:{hex:'#35577d',finish:'solid',price:0},silver:{hex:'#b9c0c7',finish:'solid',price:120},cranberry:{hex:'#8a2f2a',finish:'solid',price:120},forest:{hex:'#3d4a3a',finish:'solid',price:120},
        sand:{hex:'#d8d4c8',finish:'solid',price:120},white:{hex:'#f2f2ee',finish:'solid',price:120},orange:{hex:'#e8742a',finish:'solid',price:120},black:{hex:'#1f2226',finish:'solid',price:120},
        twotone:{hex:'#e8dcc0',finish:'twotone',price:250},wood:{hex:'#d8d4c8',finish:'wood',price:300},mural:{hex:'#f2f2ee',finish:'mural',price:400,req:{trustR:70}}},
 rims:{steel:0,alloy:150,chrome:250,spinner:350,gold:400}, tint:{none:[0,0],light:[.35,80],limo:[.7,120]},
 lightBar:{amber:{price:300,colors:['#ffb000','#ffffff'],req:{trustR:35}}}, spoiler:180, sticker:15,
 stickers:['My Kid Is On The Honor Roll','I Brake For Garage Sales','Proud Soccer Dad','Ask Me About My Lawn',"World's Okayest Driver",'Honk If You Love Potato Salad',
   'My Other Car Is Also A Minivan','Coach Rick Made Me Do Laps','I ♥ Linden Park','Powered By Brisket','Free Bike Library · Riverside','I ♥ Riverside Flats'],
};
const HORNS={stock:null,
 shave:{bpm:220,price:40,n:[[72,1],[67,.5],[67,.5],[69,1],[67,1],[0,1],[71,1],[72,1]]},
 ode:{bpm:260,price:80,n:[[64,1],[64,1],[65,1],[67,1],[67,1],[65,1],[64,1],[62,1]]},
 ballgame:{bpm:320,price:80,n:[[60,2],[72,1],[69,1],[67,1],[64,1],[67,3],[62,3]]},
 elise:{bpm:170,price:80,n:[[76,.5],[75,.5],[76,.5],[75,.5],[76,.5],[71,.5],[74,.5],[72,.5],[69,1.5]]},
 tell:{bpm:150,price:150,n:[[67,.33],[67,.33],[67,.67],[67,.33],[67,.33],[67,.67],[67,.33],[67,.33],[72,.67],[74,.67],[76,.67]]},
 entertainer:{bpm:100,price:200,n:[[62,.25],[63,.25],[64,.25],[72,.5],[64,.25],[72,.5],[64,.25],[72,1.25],[0,.25],[72,.25],[74,.25],[75,.25],[76,.25],[72,.25],[74,.25],[76,.5],[71,.25],[74,.5],[72,1]]},
};
/* a horn as [ {f Hz, t start s, d dur s} ], capped at 2.4 s */
function hornNotes(id){const h=HORNS[id];if(!h)return[{f:392,t:0,d:.38},{f:494,t:0,d:.38}];const beat=60/h.bpm,out=[];let t=0;
  for(const[m,b]of h.n){if(t>=2.4)break;if(m)out.push({f:440*Math.pow(2,(m-69)/12),t,d:Math.min(b*beat*.92,2.4-t)});t+=b*beat}return out}

const defaultVehicle=()=>({paint:'slate',rims:'steel',tint:'none',lightBar:false,spoiler:false,perf:{engine:0,tyres:0,brakes:0,sport:false},prot:{bullBar:false,armor:0}});
function apply(type,v,util){const b=VEH[type]||VEH.minivan;v=v||defaultVehicle();util=util||{};const p=v.perf||{},pr=v.prot||{};
  const E=ENGINE[clamp(p.engine|0,0,3)],T=TYRES[clamp(p.tyres|0,0,2)],Bk=BRAKES[clamp(p.brakes|0,0,2)],A=ARMOR[clamp(pr.armor|0,0,2)];
  const s={type,name:b.name,seats:b.seats,len:b.len+(pr.bullBar?.15:0),wid:b.wid,mass:b.mass,
    maxSpeed:b.max+E.m,boostMax:b.boostMax+E.b,accel:b.acc*E.a,boostAccel:b.boostAcc*E.a,brake:b.brake*Bk.b,hbrake:b.hbrake*Bk.h,coast:b.coast,revMax:b.revMax,revAccel:b.revAcc,
    steerResp:b.steerResp*T.s,turn:b.turn*T.t,turnFade:b.turnFade,grip:b.grip*T.g,absGrip:(p.brakes|0)>=2,
    hp:b.hp+A.hp,bulletMul:A.bul,bullBar:!!pr.bullBar,ramMult:b.ram,ramDealtFront:pr.bullBar?2:1,impactTakenFront:pr.bullBar?.5:1,
    sport:!!p.sport,sportDur:SPORT.dur,sportCool:SPORT.cool,sportAccMul:SPORT.accMul,sportMax:b.boostMax+E.b+SPORT.maxAdd,
    ammoBonus:b.cargo+(util.cargo?2:0),slots:util.rack?4:3,firstAid:!!util.aid};
  return s}
function req(id,ctx){const it=CATALOG.find(c=>c.id===id);if(!it)return'unknown item';ctx=ctx||{};const r=it.req;if(!r)return null;
  const owned=new Set(ctx.owned||[]),done=new Set(ctx.done||[]);
  const check=q=>{if(q.any){const fails=q.any.map(check);return fails.every(Boolean)?fails[0]:null}
    for(const h of q.has||[])if(!owned.has(h)){const n=CATALOG.find(c=>c.id===h);return'Needs '+(n?n.name:h)+' first'}
    if(q.trust!=null&&(ctx.trust||0)<q.trust)return'Needs Maple Heights trust '+q.trust+'%';
    if(q.trustR!=null&&(ctx.trustR||0)<q.trustR)return'Needs Riverside trust '+q.trustR+'%';
    for(const d of q.done||[])if(!done.has(d))return'Unlocks after '+({dee:"Pastor Dee's job",rosa:"Rosa's job",earl:"Earl's first job",benny:"Benny's job",doug:'the Kingpin'}[d]||d);
    return null};
  return check(r)}
/* buy into a SAVE.garage-shaped object. returns {ok, reason, cost} and mutates g on success */
function buy(g,id,ctx){const it=CATALOG.find(c=>c.id===id);if(!it)return{ok:false,reason:'unknown item'};const v=g.vehicles[g.active];
  const owned=ownedIds(g);if(owned.includes(id))return{ok:false,reason:'Installed'};
  const why=req(id,{...ctx,owned});if(why)return{ok:false,reason:why};const cost=Math.round(it.price*((g.purchases||0)>=5?.95:1));
  if((ctx.cash||0)<cost)return{ok:false,reason:'Not enough cash'};
  if(it.group==='perf'){if(it.slot==='sport'){v.perf.sport=true;v.spoiler=true}else v.perf[it.slot]=Math.max(v.perf[it.slot]|0,it.lvl)}
  else if(it.group==='prot'){if(it.slot==='bullBar')v.prot.bullBar=true;else v.prot.armor=Math.max(v.prot.armor|0,it.lvl)}
  else if(it.group==='util')g.util[it.slot]=true;
  else if(it.group==='vehicle'){g.owned.push(it.type);g.vehicles[it.type]=defaultVehicle();g.hp[it.type]=VEH[it.type].hp}
  g.purchases=(g.purchases||0)+1;return{ok:true,cost}}
function ownedIds(g){const v=g.vehicles[g.active],out=[];
  for(const c of CATALOG){if(c.group==='perf'&&(c.slot==='sport'?v.perf.sport:(v.perf[c.slot]|0)>=c.lvl))out.push(c.id);
    if(c.group==='prot'&&(c.slot==='bullBar'?v.prot.bullBar:(v.prot.armor|0)>=c.lvl))out.push(c.id);
    if(c.group==='util'&&g.util[c.slot])out.push(c.id);if(c.group==='vehicle'&&g.owned.includes(c.type))out.push(c.id)}return out}
const defaultGarage=()=>({active:'minivan',owned:['minivan'],purchases:0,dirt:0,vehicles:{minivan:defaultVehicle()},hp:{minivan:100},
  util:{cargo:false,rack:false,aid:false},stickers:[null,null,null],ownedStickers:[],horn:'stock',ownedHorns:['stock'],ownedCos:{paint:['slate'],rims:['steel'],tint:['none']},
  wear:{minivan:{lamps:[0,0,0,0],tyre:0}},tab:0,patchAt:0});
/* HT.Vehicles.make options from a SAVE.garage (SPEC2 C.6) */
function vehicleOpts(g,type){type=type||g.active;const v=g.vehicles[type],c=COSMETICS.paint[v.paint]||COSMETICS.paint.slate;
  return{color:c.hex,upgrades:{paint:c.finish,rims:v.rims,roofRack:g.util.cargo?'cargo':'rails',bullBar:!!v.prot.bullBar,lightBar:v.lightBar?'amber':false,
    tint:(COSMETICS.tint[v.tint]||[0])[0],spoiler:!!(v.spoiler||v.perf.sport)}}}

HT.Garage={VEH,CATALOG,COSMETICS,HORNS,ENGINE,TYRES,BRAKES,ARMOR,SPORT,apply,req,buy,ownedIds,defaultVehicle,defaultGarage,vehicleOpts,hornNotes};

/* ---------- cars ---------- */
function make(type,o){o=o||{};const st=o.stats||apply(type,o.vehicle,o.util);const y=o.yaw||0,f=fwd(y);
  return{type,x:o.x||0,z:o.z||0,yaw:y,spd:o.spd||0,steer:0,vdx:f[0],vdz:f[1],slip:0,hp:o.hp!=null?o.hp:st.hp,stats:st,
    sportT:0,sportCd:0,spinT:0,stuckT:0,revT:0,bump:0,ai:null,dead:false,stopped:false,t:0}}

/* the player's model: index.html updVan generalised (SPEC2 C.2). collide(p,r) pushes {x,z} out of solids (optional). */
/* [TOW] a car with a hitched load (c.towMul, set by js/tow.js): slower, softer, longer braking, slow reverse, no boost or sport */
const towStats=(S,T)=>Object.assign({},S,{maxSpeed:S.maxSpeed*T.max,boostMax:S.maxSpeed*T.max,sportMax:S.maxSpeed*T.max,accel:S.accel*T.acc,boostAccel:S.accel*T.acc,brake:S.brake*T.brake,hbrake:S.hbrake*T.brake,steerResp:S.steerResp*T.steer,revMax:S.revMax*(T.rev||.6),revAccel:S.revAccel*T.acc});
function drive(c,inp,dt,collide){const S=c.towMul?towStats(c.stats,c.towMul):c.stats;let thr=inp.thr||0,st=inp.st||0;if(c.hp<=0)thr=0;
  if(inp.sport&&S.sport&&c.sportCd<=0){c.sportT=S.sportDur;c.sportCd=S.sportCool}
  c.sportT=Math.max(0,c.sportT-dt);c.sportCd=Math.max(0,c.sportCd-dt);
  const sp=c.sportT>0,boost=!!inp.boost,dmg=c.topMul!=null?c.topMul:c.hp<S.hp*.3?.75:1;   // the game sets c.topMul from its own damage bands
  const MAX=(sp?S.sportMax:boost?S.boostMax:S.maxSpeed)*dmg,A=(boost||sp?S.boostAccel:S.accel)*(sp?S.sportAccMul:1);let v=c.spd;
  if(thr>0)v+=(v<0?S.brake:A)*dt*thr;else if(thr<0)v-=(v>0?S.brake:S.revAccel)*dt*-thr;else v-=Math.sign(v)*Math.min(Math.abs(v),S.coast*dt);
  if(inp.hb)v-=Math.sign(v)*Math.min(Math.abs(v),S.hbrake*dt);
  if(v>MAX)v=c.spd<=MAX?MAX:Math.max(MAX,c.spd-S.brake*dt);v=Math.max(-S.revMax,v);   // over the cap (sport ended, damage): bleed off at brake rate
  c.steer+=(st-c.steer)*Math.min(1,dt*S.steerResp);
  c.yaw+=c.steer*clamp(Math.abs(v)/5,0,1)*(S.turn-Math.min(S.turnFade,Math.abs(v)/35))*Math.sign(v)*(inp.hb?1.5:1)*dt;
  const f=fwd(c.yaw),braking=thr<0&&v>2,k=S.grip*(inp.hb?.25:1)*(braking&&!S.absGrip?.6:1),a=1-Math.exp(-k*dt);
  c.vdx+=(f[0]-c.vdx)*a;c.vdz+=(f[1]-c.vdz)*a;const l=Math.hypot(c.vdx,c.vdz)||1;c.vdx/=l;c.vdz/=l;
  c.slip=Math.acos(clamp(c.vdx*f[0]+c.vdz*f[1],-1,1));
  c.x+=c.vdx*v*dt;c.z+=c.vdz*v*dt;c.spd=v;c.bump-=dt;c.t+=dt;
  return collideBody(c,collide)}
/* two probes along the body, like updVan. returns {hit, front, speed} so the caller can apply impact damage */
function collideBody(c,collide){if(!collide)return null;const f=fwd(c.yaw),o=c.stats.len/3;let hit=null;
  for(const s of[1,-1]){const p={x:c.x+f[0]*o*s,z:c.z+f[1]*o*s},q={x:p.x,z:p.z};collide(q,c.stats.wid/2+.05);const dx=q.x-p.x,dz=q.z-p.z;
    if(dx*dx+dz*dz>1e-6){c.x+=dx;c.z+=dz;if(!hit)hit={front:s===1===(c.spd>=0),speed:Math.abs(c.spd)}}}
  if(hit){c.spd*=hit.speed>5?-.25:.6}return hit}

/* van damage (SPEC2 C.3) */
function impact(c,speed,front,inMission){const dmg=Math.max(0,speed-9)*2.2*(front?c.stats.impactTakenFront||1:1)*(inMission?1:.5);c.hp=Math.max(0,c.hp-dmg);return dmg}
function bullet(c,dmg){const d=dmg*(c.stats.bulletMul||1);c.hp=Math.max(0,c.hp-d);return d}
function state(c){const f=c.hp/c.stats.hp;return{stage:c.hp<=0?'disabled':f<.3?'wrecked':f<.6?'smoking':'ok',speedMul:c.hp<=0?0:f<.3?.75:1,frac:f}}
function repairCost(c){return Math.ceil((c.stats.hp-c.hp)*2)}

/* ---------- AI: kinematic arcade steering toward a lookahead point ---------- */
const AI_TURN=2.2;
function aiMove(c,tgtX,tgtZ,tgtSpd,dt,collide){const S=c.stats;
  if(c.spinT>0){c.spinT-=dt;c.yaw+=4*dt;c.spd*=Math.pow(.5,dt);moveFwd(c,dt);return collideBody(c,collide)}
  if(c.revT>0){c.revT-=dt;c.spd=Math.max(-5,c.spd-S.brake*dt);c.yaw+=.8*dt*(c.revDir||1);moveFwd(c,dt);return collideBody(c,collide)}
  const want=yawTo(tgtX-c.x,tgtZ-c.z),d=wrap(want-c.yaw),mt=AI_TURN*clamp(Math.abs(c.spd)/4,.35,1)*(S.grip/9>1.2?1.1:1);
  c.yaw+=clamp(d,-mt*dt,mt*dt);
  const sMul=state(c).speedMul,ts=tgtSpd*sMul*(Math.abs(d)>1.2?.4:1);
  if(c.spd<ts)c.spd=Math.min(ts,c.spd+(ts>S.maxSpeed?S.boostAccel:S.accel)*dt);else c.spd=Math.max(ts,c.spd-S.brake*dt);
  moveFwd(c,dt);const hit=collideBody(c,collide);
  if(Math.abs(c.spd)<1&&tgtSpd>2){c.stuckT+=dt;if(c.stuckT>1.5){c.stuckT=0;c.revT=1;c.revDir=d>0?-1:1;c.justStuck=true;c.stuckCount=(c.stuckCount||0)+1}}else c.stuckT=0;
  c.stuckCount=Math.max(0,(c.stuckCount||0)-dt/8);
  return hit}
function moveFwd(c,dt){const f=fwd(c.yaw);c.vdx=f[0];c.vdz=f[1];c.x+=f[0]*c.spd*dt;c.z+=f[1]*c.spd*dt;c.t+=dt}
/* polyline tracker: projection index + lookahead point */
function track(c,pts,look){const tr=c.ai.tr||(c.ai.tr={i:0});let best=tr.i,bd=Infinity;
  for(let i=tr.i;i<Math.min(pts.length-1,tr.i+8);i++){const A=pts[i],B=pts[i+1],dx=B.x-A.x,dz=B.z-A.z,L2=dx*dx+dz*dz||1,t=clamp(((c.x-A.x)*dx+(c.z-A.z)*dz)/L2,0,1);
    const d=(A.x+dx*t-c.x)**2+(A.z+dz*t-c.z)**2;if(d<bd){bd=d;best=i}}tr.i=best;
  let rem=look,i=best,px=c.x,pz=c.z;{const A=pts[i],B=pts[i+1]||A,dx=B.x-A.x,dz=B.z-A.z,L2=dx*dx+dz*dz||1,t=clamp(((c.x-A.x)*dx+(c.z-A.z)*dz)/L2,0,1);px=A.x+dx*t;pz=A.z+dz*t}
  while(i<pts.length-1){const B=pts[i+1],seg=Math.hypot(B.x-px,B.z-pz);if(seg>=rem)return{x:px+(B.x-px)*rem/seg,z:pz+(B.z-pz)*rem/seg,i,end:false};rem-=seg;px=B.x;pz=B.z;i++}
  return{x:pts[pts.length-1].x,z:pts[pts.length-1].z,i,end:true}}
/* upcoming corner: distance along the polyline to the next point where heading changes > 25 degrees */
function cornerAhead(pts,i,x,z,maxD){let d=Math.hypot(pts[Math.min(i+1,pts.length-1)].x-x,pts[Math.min(i+1,pts.length-1)].z-z);
  for(let k=i+1;k<pts.length-1;k++){const a=pts[k-1],b=pts[k],c2=pts[k+1],a1=Math.atan2(b.z-a.z,b.x-a.x),a2=Math.atan2(c2.z-b.z,c2.x-b.x);
    if(Math.abs(wrap(a2-a1))>.3)return d;d+=Math.hypot(c2.x-b.x,c2.z-b.z);if(d>maxD)break}return Infinity}

/* controllers */
function follow(c,points,o){o=o||{};c.ai={mode:'follow',pts:points,speed:o.speed||6,turnSpeed:o.turnSpeed||5,waitDist:o.waitDist||Infinity,done:false,blocked:false};return c}
function flee(c,G,o){o=o||{};const n=G.nearestNode(c.x,c.z);c.ai={mode:'flee',G,max:o.max||c.stats.boostMax,turnSpeed:o.turnSpeed||9,prev:-1,cur:n,next:-1,pts:null,
  escapeT:0,escaped:false,escapeDist:o.escapeDist||110,escapeTime:o.escapeTime||8,rnd:o.rnd||(HT.World&&HT.World.mulberry32?HT.World.mulberry32(o.seed||7):Math.random)};
  pickNext(c,o.threat||null);return c}
function wander(c,G,o){flee(c,G,{...o,max:(o&&o.max)||11});c.ai.mode='wander';return c}
function pickNext(c,threat){const ai=c.ai,G=ai.G,n=G.nodes[ai.cur];let opts=n.e.filter(e=>e.to!==ai.prev);if(!opts.length)opts=n.e;
  let best=null,bs=-Infinity;for(const e of opts){let s=ai.rnd()*.6-(G.nodes[e.to].e.length===1?1.5:0);if(ai.mode==='flee'&&threat){const ax=c.x-threat.x,az=c.z-threat.z,l=Math.hypot(ax,az)||1;s+=(e.dir[0]*ax+e.dir[1]*az)/l}if(s>bs){bs=s;best=e}}
  ai.next=best.to;ai.pts=G.lane(ai.prev>=0?[ai.prev,ai.cur,ai.next]:[ai.cur,ai.next]);
  if(ai.prev<0){/* start: lane from the car's position */ai.pts=[{x:c.x,z:c.z},...G.lane([ai.cur,ai.next]).slice(1)]}ai.tr={i:0}}

/* follow-mode wedge recovery: back onto the polyline at the tracked point, facing along it; a car that wedges again at the
   same spot (something parked on its path) is put down a few metres further each time so it can never loop forever */
function snapToPath(c,ai){const pts=ai.pts,tr=ai.tr||(ai.tr={i:0});let i=Math.min(tr.i,pts.length-2);if(i<0)return;
  const A=pts[i],B=pts[i+1],dx=B.x-A.x,dz=B.z-A.z,L2=dx*dx+dz*dz||1,t=clamp(((c.x-A.x)*dx+(c.z-A.z)*dz)/L2,0,1);
  const n=ai.snapAt===i?(ai.snapN||0)+1:0;ai.snapAt=i;ai.snapN=n;
  let px=A.x+dx*t,pz=A.z+dz*t,rem=n*4,k=i;/* skip ahead n*4 m along the path */
  while(rem>0&&k<pts.length-1){const Q=pts[k+1],seg=Math.hypot(Q.x-px,Q.z-pz);if(seg>=rem){px+=(Q.x-px)*rem/seg;pz+=(Q.z-pz)*rem/seg;rem=0;break}rem-=seg;px=Q.x;pz=Q.z;k++}
  const Q=pts[Math.min(k+1,pts.length-1)],P0=pts[k];c.x=px;c.z=pz;c.yaw=yawTo(Q.x-P0.x||dx,Q.z-P0.z||dz);c.spd=0;c.stuckCount=0;c.stuckT=0;c.revT=0;tr.i=k;c.snapped=(c.snapped||0)+1}

function step(c,dt,ctx){ctx=ctx||{};const ai=c.ai;if(!ai||c.dead)return null;let hit=null;
  if(c.hp<=0){/* coast to a stop */c.spd=Math.max(0,c.spd-c.stats.brake*.35*dt);moveFwd(c,dt);if(c.spd<.3)c.stopped=true;return collideBody(c,ctx.collide)}
  if(ai.mode==='follow'){const p=track(c,ai.pts,Math.max(3.5,c.spd*.5+2));
    let ts=ai.speed;const ca=cornerAhead(ai.pts,p.i,c.x,c.z,14);if(ca<12)ts=Math.min(ts,ai.turnSpeed);
    if(ctx.van&&Math.hypot(ctx.van.x-c.x,ctx.van.z-c.z)>ai.waitDist)ts=0;
    if(ctx.speedCap){const k=ctx.speedCap(c.x,c.z,c);if(k!=null&&k<ts)ts=Math.max(0,k)}/* [CONES] per-position speed cap (cones, a roadblock ahead) */
    if(ctx.blocked&&ctx.blocked(c))ts=0;ai.blocked=ts===0;
    if(p.end&&Math.hypot(p.x-c.x,p.z-c.z)<2.5){ts=0;ai.done=true}
    if(c.stuckCount>=3&&!(ctx.canSnap&&!ctx.canSnap(c)))snapToPath(c,ai);
    hit=aiMove(c,p.x,p.z,ts,dt,ctx.collide);return hit}
  /* flee / wander along the graph */
  const G=ai.G;
  if(c.justStuck){c.justStuck=false;ai.cur=G.nearestNode(c.x,c.z);ai.prev=-1;pickNext(c,ctx.van)}
  if(c.stuckCount>=3&&!(ctx.canSnap&&!ctx.canSnap(c))){/* wedged: put it back on the lane (the game only allows this off-camera via ctx.canSnap) */
    const r=G.nearestRoad(c.x,c.z),A=G.nodes[r.a],B=G.nodes[r.b],dx=B.x-A.x,dz=B.z-A.z,l=Math.hypot(dx,dz)||1;
    c.x=r.x-dz/l*1.5;c.z=r.z+dx/l*1.5;c.yaw=yawTo(dx,dz);c.spd=0;c.stuckCount=0;c.revT=0;ai.prev=r.a;ai.cur=r.b;pickNext(c,ctx.van);c.snapped=(c.snapped||0)+1}
  const n=G.nodes[ai.next];const p=track(c,ai.pts,Math.max(5,c.spd*.5+3));
  if(Math.hypot(n.x-c.x,n.z-c.z)<5||p.end){ai.prev=ai.cur;ai.cur=ai.next;pickNext(c,ctx.van)}
  /* [TRAFFIC] ctx.offset(c) -> metres to the left of the lane (+ = pull out into the oncoming lane to go round, - = pull over to the kerb):
     shifts the steering point sideways; omitted = no change */
  if(ctx.offset){const o=ctx.offset(c);if(o){const pts=ai.pts,i=Math.min(Math.max(0,p.i),pts.length-2),A=pts[i],B=pts[i+1]||A,dx=B.x-A.x,dz=B.z-A.z,l=Math.hypot(dx,dz)||1;p.x+=dz/l*o;p.z-=dx/l*o}}
  let ts=ai.max;const ca=cornerAhead(ai.pts,ai.tr.i,c.x,c.z,16);if(ca<12)ts=Math.min(ts,ai.turnSpeed);
  if(ctx.speedCap){const k=ctx.speedCap(c.x,c.z,c);if(k!=null&&k<ts)ts=Math.max(0,k)}
  if(ai.mode==='flee'&&ctx.van){const d=Math.hypot(ctx.van.x-c.x,ctx.van.z-c.z);
    ts*=d>80?.65:d>50?.8:d<20?1.05:1;              // rubber band (SPEC2 B.7, tuned in dev/test-carai.js: d>80 x.65, d>50 x.8, d<20 x1.05)
    if(d>ai.escapeDist){ai.escapeT+=dt;if(ai.escapeT>=ai.escapeTime)ai.escaped=true}else ai.escapeT=0}
  hit=aiMove(c,p.x,p.z,ts,dt,ctx.collide);return hit}

/* ---------- contact between two vehicles (2 circles each) ---------- */
function circles(c){const f=fwd(c.yaw),o=c.stats.len/4,r=c.stats.wid/2+.1;return[{x:c.x+f[0]*o,z:c.z+f[1]*o,r,front:true},{x:c.x-f[0]*o,z:c.z-f[1]*o,r,front:false}]}
function ram(van,car,o){o=o||{};let best=null;for(const a of circles(van))for(const b of circles(car)){const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),pen=a.r+b.r-d;
    if(pen>0&&(!best||pen>best.pen))best={a,b,pen,nx:d?dx/d:1,nz:d?dz/d:0}}
  if(!best)return null;const{nx,nz,pen}=best,mv=van.stats.mass,mc=car.stats.mass;
  van.x-=nx*pen*mc/(mv+mc);van.z-=nz*pen*mc/(mv+mc);car.x+=nx*pen*mv/(mv+mc);car.z+=nz*pen*mv/(mv+mc);
  const fv=fwd(van.yaw),fc=fwd(car.yaw),vv=[fv[0]*van.spd,fv[1]*van.spd],vc=[fc[0]*car.spd,fc[1]*car.spd];
  const vn=(vv[0]-vc[0])*nx+(vv[1]-vc[1])*nz;const res={vn,carDmg:0,vanDmg:0,pit:false,front:false};
  if(vn<=0)return res;
  const front=best.a.front&&(fv[0]*nx+fv[1]*nz)>.5;res.front=front;
  if(vn>3){res.carDmg=(vn-3)*4*van.stats.ramMult*(front?van.stats.ramDealtFront:1);res.vanDmg=(vn-3)*1.2*car.stats.ramMult*(front?van.stats.impactTakenFront:1);
    car.hp=Math.max(0,car.hp-res.carDmg);van.hp=Math.max(0,van.hp-res.vanDmg)}
  const dv=vn*1.3;van.spd-=dv*mc/(mv+mc)*(fv[0]*nx+fv[1]*nz);car.spd+=dv*mv/(mv+mc)*(fc[0]*nx+fc[1]*nz);
  const ang=Math.acos(clamp(fv[0]*fc[0]+fv[1]*fc[1],-1,1));
  if(!best.b.front&&car.spd>8&&ang<50*Math.PI/180&&car.spinT<=0){car.spinT=1.2;car.spd*=.4;car.hp=Math.max(0,car.hp-10);res.pit=true;res.carDmg+=10}
  return res}
/* crew in the van shooting the getaway car's tyres: n shooters, 3 hp/s each within 18 m */
function crewFire(van,car,n,dt,los){const d=Math.hypot(car.x-van.x,car.z-van.z);if(d>18||(los&&!los(van,car)))return 0;const dmg=Math.min(3,n)*3*dt;car.hp=Math.max(0,car.hp-dmg);return dmg}

/* ---------- pursuer bot (tests + visualiser stand-in for the player) ---------- */
function pursuerInput(van,car,G,memo){memo=memo||{};const d=Math.hypot(car.x-van.x,car.z-van.z);let tx_,tz_,target=van.stats.boostMax;
  if(d<22){const f=fwd(car.yaw),lead=clamp(d/20,0,1)*car.spd*.4;tx_=car.x+f[0]*lead;tz_=car.z+f[1]*lead;memo.route=null}
  else{memo.t=(memo.t||0)-1;if(!memo.route||memo.t<=0){memo.route=G.route({x:van.x,z:van.z},{x:car.x,z:car.z});memo.t=15;memo.tr={i:0}}
    const pts=memo.route?memo.route.points:[{x:car.x,z:car.z},{x:car.x,z:car.z}];const shim={x:van.x,z:van.z,ai:{tr:memo.tr}};
    const p=track(shim,pts,Math.max(6,Math.abs(van.spd)*.55+2));memo.tr=shim.ai.tr;tx_=p.x;tz_=p.z;
    const ca=cornerAhead(pts,memo.tr.i,van.x,van.z,22);if(ca<Math.max(10,van.spd*.9))target=11}
  const err=wrap(yawTo(tx_-van.x,tz_-van.z)-van.yaw);if(Math.abs(err)>.7)target=Math.min(target,9);
  const thr=van.spd<target-.5?1:van.spd>target+1.5?-1:0;
  return{inp:{thr,st:clamp(err*2.5,-1,1),boost:target>van.stats.maxSpeed,hb:false,sport:d<40&&Math.abs(err)<.2},memo}}

/* headless chase: returns {result:'stopped'|'escaped'|'timeout'|'van_disabled', t, rams, pits, van, car, trace} */
function simulateChase(o){const W=HT.World,R=HT.Roads;const def=o.def||W.build({bridgeOpen:true}),G=o.G||R.build(def);
  const dt=o.dt||1/30,maxT=o.maxT||240,collide=o.collide===false?null:(o.collide||tileCollider(def));
  const start=o.start||G.nodes[G.nearestNode(def.places.g_earl.x,def.places.g_earl.z)];
  const car=make(o.carType||'sedan',{x:start.x,z:start.z,yaw:0});flee(car,G,{max:o.max||35,seed:o.seed||7,threat:null});
  const away=car.ai.pts[Math.min(3,car.ai.pts.length-1)];car.yaw=yawTo(away.x-car.x,away.z-car.z);
  const vf=fwd(car.yaw),gp=o.gap||30;let sp=G.nearestRoad(car.x-vf[0]*gp,car.z-vf[1]*gp);
  if(!sp||Math.hypot(sp.x-car.x,sp.z-car.z)<gp*.6){/* behind the car is off the network: use the far end of the edge it came from */const back=G.nodes[car.ai.cur].e.find(e=>e.to!==car.ai.next)||G.nodes[car.ai.cur].e[0];const bn=G.nodes[back.to],l=Math.hypot(bn.x-car.x,bn.z-car.z)||1;sp={x:car.x+(bn.x-car.x)*Math.min(1,gp/l),z:car.z+(bn.z-car.z)*Math.min(1,gp/l)}}
  const van=make(o.vanType||'minivan',{x:sp.x,z:sp.z,yaw:yawTo(car.x-sp.x,car.z-sp.z),vehicle:o.vehicle,util:o.util,stats:o.vanStats});
  let memo={},rams=0,pits=0,t=0;const trace=[];const crew=o.crew!=null?o.crew:3;
  for(;t<maxT;t+=dt){const pi=pursuerInput(van,car,G,memo);memo=pi.memo;const hit=drive(van,pi.inp,dt,collide);if(hit&&hit.speed>5&&van.bump<=0){impact(van,hit.speed,hit.front,true);van.bump=.4}
    step(car,dt,{van,G,collide});const r=ram(van,car);if(r&&r.vn>3){rams++;if(r.pit)pits++}
    crewFire(van,car,crew,dt);
    if(o.trace&&Math.round(t/dt)%10===0)trace.push({t,van:{x:van.x,z:van.z,yaw:van.yaw},car:{x:car.x,z:car.z,yaw:car.yaw,hp:car.hp}});
    if(car.hp<=0&&car.spd<.5)return{result:'stopped',t,rams,pits,van,car,trace};
    if(car.ai.escaped)return{result:'escaped',t,rams,pits,van,car,trace};
    if(van.hp<=0)return{result:'van_disabled',t,rams,pits,van,car,trace}}
  return{result:'timeout',t,rams,pits,van,car,trace}}
/* tile-AABB collider for headless sims: every SOLID tile is a 2x2 m box (props in game are smaller, so this is conservative) */
function tileCollider(def){const T=2,S=def.solid;return(p,r)=>{const x0=Math.floor((p.x-r)/T),x1=Math.floor((p.x+r)/T),z0=Math.floor((p.z-r)/T),z1=Math.floor((p.z+r)/T);
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){const row=def.map[z];const c=row?row[x]:'t';if(c!==undefined&&!S.includes(c))continue;
    const bx0=x*T,bz0=z*T,bx1=bx0+T,bz1=bz0+T;if(p.x+r>bx0&&p.x-r<bx1&&p.z+r>bz0&&p.z-r<bz1){const o1=p.x+r-bx0,o2=bx1-(p.x-r),o3=p.z+r-bz0,o4=bz1-(p.z-r),mx=Math.min(o1,o2),mz=Math.min(o3,o4);
      if(mx<mz)p.x+=o1<o2?-o1:o2;else p.z+=o3<o4?-o3:o4}}}}

HT.CarAI={make,drive,step,follow,flee,wander,ram,crewFire,impact,bullet,state,repairCost,circles,pursuerInput,simulateChase,tileCollider,fwd,yawTo,AI_TURN};
if(typeof module!=='undefined'&&module.exports)module.exports={Garage:HT.Garage,CarAI:HT.CarAI};
})(typeof window!=='undefined'?window:globalThis);
