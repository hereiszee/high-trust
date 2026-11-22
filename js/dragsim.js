/* High Trust · HT.Drag — the drag strip's race model, racers, odds and money rules (docs/dragstrip.md). Pure logic: browser + Node.
 *
 * One model runs everything at Sensible Dragway: the player's pass (js/dragstrip.js steps it every frame from the real inputs), the
 * AI racers, spectator races and the odds. Nothing is scripted: a race result is two runs of this model, the odds are counted from
 * the same model (Monte Carlo), and dev/test-dragsim.js checks 2,000 simulated races against the stated probabilities.
 *
 *   HT.Drag.spec(type, vehicleSave?)        straight-line numbers for a car (mass, power, drivetrain, gearing, grip), upgrades applied
 *   HT.Drag.run(spec)                      a pass in progress: {x (m past the stage beam), v, gear, rpm, spin, ...}
 *   HT.Drag.step(run, {thr, brake}, dt)    one physics step (substeps of 1/240 s inside). Staged + brake = rev against the brake
 *   HT.Drag.slip(run)                       {rt, t60, t330, et, mph, et14, mph14} (et14/mph14 are estimates: the strip is an eighth)
 *   HT.Drag.sim(spec, driver, rnd, o)       a whole pass by a driver profile {rt, rtSd, redP, launchQ, missP}: same model, no rendering
 *   HT.Drag.race(a, b, rnd, o)              two sims side by side -> {win:0|1, red, margin, slips}; o.dial (bracket handicap)
 *   HT.Drag.winP(a, b, n, seed, o)          P(lane a wins) by n simulated races; HT.Drag.payout(p) the bet multiplier (house edge)
 *   HT.Drag.RACERS, CLASSES, ECON, day(save), canEnter / canBet / settle (money rules; see docs/dragstrip.md for the numbers)
 * Units: metres, seconds, m/s, kg, kW. Distances: 60 ft = 18.288 m, 330 ft = 100.584 m, 1/8 mile = 201.168 m, trap = the last 66 ft.
 */
(function(root){'use strict';
const HT=root.HT=root.HT||{};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const G=9.81,EIGHTH=201.168,FT60=18.288,FT330=100.584,TRAP=20.1168,ROLL=.25/* the stage beam: the car has left it 0.25 m in */,SUB=1/240,MPH=2.23694;

/* ---------- the cars, as the strip sees them ----------
   mass kg · kw peak at the wheels' end of things · drive FWD/RWD/AWD · mu tyre grip · vg top speed per gear (m/s at redline; the last is
   the car's real top end) · shift s · cda drag area m² · band: the launch rpm window [lo, hi] (fraction of redline) that hooks up clean.
   The in-game handling rows (index.html CAR_FEEL, js/carai.js VEH) are untouched: this table only drives the strip. Ordering and character
   follow those rows: the sedan is the quick one, the pickup has the torque and the light rear (spins), the SUV is heavy but AWD, the work van
   is a work van. The mower is in its own class. */
const SPEC={
 hatch:  {name:'Hatchback',      cls:'street',mass:1250,kw:100,drive:'FWD',mu:1.00,f1:.56,vg:[13,21,29,35,41],         shift:.24,cda:.66,band:[.30,.62]},
 minivan:{name:'Family Minivan', cls:'street',mass:2000,kw:185,drive:'FWD',mu:.98, f1:.62,vg:[14,22,30,36,42,48],      shift:.30,cda:.95,band:[.26,.52]},
 sedan:  {name:'Sedan',          cls:'street',mass:1580,kw:225,drive:'RWD',mu:1.02,f1:.70,vg:[15,24,32,39,46,54],      shift:.22,cda:.66,band:[.30,.50]},
 suv:    {name:'The Suburbanite',cls:'street',mass:2150,kw:190,drive:'AWD',mu:.95, f1:.66,vg:[13,21,28,34,40,46],      shift:.32,cda:1.05,band:[.36,.76]},
 pickup: {name:'The Tailgater',  cls:'street',mass:2350,kw:285,drive:'RWD',mu:.93, f1:.84,vg:[14,23,31,38,45,52],      shift:.34,cda:1.12,band:[.20,.38]},
 workvan:{name:'The Contractor', cls:'street',mass:2600,kw:150,drive:'RWD',mu:.92, f1:.50,vg:[12,19,26,32,38],         shift:.40,cda:1.30,band:[.24,.50]},
 mower:  {name:'Ride-On Mower',  cls:'mower', mass:260, kw:8,  drive:'RWD',mu:.70, f1:.55,vg:[4,7,9.6],                shift:.50,cda:.55,band:[.30,.85]}};
/* who may race in which class (the tank, the jet, the bike, the tow rig and Dave's brisket truck may not) */
const CLASSES={street:{name:'Street',types:['hatch','minivan','sedan','suv','pickup','workvan']},mower:{name:'Turf (mowers only)',types:['mower']}};
const REFUSE={tank:"No tanks on the strip. It's in the rules. Rule one, actually. They added it this morning.",jet:"It's a drag strip, not a runway. Fort Sensible has a runway. Go there.",
  bike:"Bikes run on Tuesdays. It isn't Tuesday. It's never Tuesday.",brisket:"That's Dave's truck. It smells like brisket. The tech inspector is hungry enough already.",
  tow:"Tow rigs don't race. They wait at the end. Professionally.",mower:'Mowers run in the Turf class. The ladder has one mower in it. Ask about Gus.'};
const ENGINE_MUL=[1,1.18,1.37,1.62],TYRE_MU=[1,1.12,1.25];
/* the car's numbers, with Dad's Auto upgrades when it's yours (engine: power; tyres: grip; armour: weight) */
function spec(type,veh){const b=SPEC[type];if(!b)return null;const s=Object.assign({type},b,{vg:b.vg.slice(),band:b.band.slice()});
  if(veh&&veh.perf){const e=clamp(veh.perf.engine|0,0,3),t=clamp(veh.perf.tyres|0,0,2);s.kw*=ENGINE_MUL[e];s.f1*=1+(ENGINE_MUL[e]-1)*.6;s.mu*=TYRE_MU[t];if(e){const k=1+.06*e;s.vg=s.vg.map(v=>v*k)}
    s.band=[b.band[0]+.04*t,Math.min(.92,b.band[1]+.06*t)];/* stickier tyres take more launch rpm */}
  if(veh&&veh.prot){s.mass+=(veh.prot.armor|0)*90+(veh.prot.bullBar?35:0)}
  s.up=veh&&veh.perf?{engine:veh.perf.engine|0,tyres:veh.perf.tyres|0}:null;return s}

/* ---------- one pass ---------- */
function run(s){return{s,x:0,v:0,t:0,gear:0,rpm:.12,spin:0,cut:0,launched:false,staged:true,brake:true,green:null,leave:null,split:{},trapT:null,done:false,
  bog:0,miss:0,shifts:0,thr:0,peakSpin:0,launchRpm:null,launchQ:null}}
/* the power curve: a little torquey at the bottom, peak power at 85% of redline */
const pf=r=>clamp(1-1.6*(r-.85)*(r-.85),.3,1);
function wdrive(s,a){const k=clamp(a/5,0,1);return s.drive==='AWD'?.96:s.drive==='FWD'?.6-.1*k:.5+.13*k}
/* {thr 0..1, brake bool}. Before the launch: brake on = stay put, the throttle revs against it (rpm rises with throttle, falls without). */
function step(R,inp,dt){let n=Math.max(1,Math.round(dt/SUB));const h=dt/n;for(let i=0;i<n;i++)sub(R,inp,h);return R}
function sub(R,inp,h){const s=R.s,thr=clamp(inp.thr||0,0,1);R.t+=h;R.thr=thr;
  if(!R.launched){/* staged: revving against the brake */const tgt=.12+.88*thr;R.rpm+=(tgt-R.rpm)*Math.min(1,h*(tgt>R.rpm?2.2:3.2));
    if(inp.brake||thr<=0.02){R.v=0;return}
    /* launch: brake off with the throttle in. The rpm he left at decides how it hooks up */
    R.launched=true;R.launchRpm=R.rpm;const[lo,hi]=s.band;
    if(R.rpm<lo){R.bog=.9*(1-R.rpm/lo)+.18;R.launchQ=clamp(1-(lo-R.rpm)/lo,0,1)}
    else if(R.rpm>hi){R.spin=clamp((R.rpm-hi)/(1-hi)*1.5+.35,0,1);R.launchQ=clamp(1-(R.rpm-hi)/(1-hi),0,1)}else R.launchQ=1}
  const V=s.vg[R.gear],Pw=s.kw*1000;
  /* rpm: the converter lets it slip up to the launch rpm until the car catches up */
  const wheelR=R.v/V;const conv=R.bog>0?Math.max(wheelR,R.rpm*.7):Math.max(wheelR,Math.min(R.launchRpm||.3,R.rpm));
  R.rpm=clamp(R.spin>.05?Math.max(wheelR,R.rpm+(1-R.rpm)*h*3*R.spin):conv+(wheelR-conv)*Math.min(1,h*4),0,1.02);
  const r=Math.max(R.rpm,.2);let F=thr*Math.min(Pw*pf(r)/(r*V),s.f1*s.mass*G*s.vg[0]/V*(R.spin>0||R.v<2?1:1));/* torque (first-gear pull f1 x weight, less per gear) or power, whichever is less */
  if(R.rpm>=1&&R.gear===s.vg.length-1)F=0;/* the limiter in top gear */
  if(R.bog>0){F*=.45;R.bog=Math.max(0,R.bog-h)}
  if(R.cut>0){F*=.2;R.cut-=h}
  const a0=Math.max(0,(F/s.mass)),Fmax=s.mu*s.mass*G*wdrive(s,a0);
  /* wheelspin: asking for more than the tyres have builds spin; spinning tyres give 60-100% of their grip; lifting lets them hook */
  if(F>Fmax*1.02)R.spin=Math.min(1,R.spin+(F/Fmax-1)*h*3.2);else R.spin=Math.max(0,R.spin-h*(1.1+2.4*(1-thr)+(F<Fmax*.8?1.2:0)));
  R.peakSpin=Math.max(R.peakSpin,R.spin);
  const Fa=Math.min(F,Fmax)*(1-.5*R.spin),Fd=.6*s.cda*R.v*R.v+.012*s.mass*G;
  R.v=Math.max(0,R.v+(Fa-Fd)/s.mass*h);const x0=R.x;R.x+=R.v*h;
  /* the automatic: up a gear at the redline (a missed shift is a long cut) */
  if(R.v>=V*.985&&R.gear<s.vg.length-1){R.gear++;R.shifts++;R.cut=s.shift+(R.miss&&R.miss===R.gear?.85:0);R.rpm=R.v/s.vg[R.gear]}
  /* the clocks */
  if(R.leave==null&&R.x>=ROLL){R.leave=R.t-(R.x-ROLL)/Math.max(R.v,1e-3)}
  for(const[k,d]of[['t60',FT60],['t330',FT330],['trap0',EIGHTH-TRAP],['et',EIGHTH]])if(R.split[k]==null&&R.x>=d+ROLL){R.split[k]=R.t-(R.x-d-ROLL)/Math.max(R.v,1e-3)}
  if(R.split.et!=null&&!R.done){R.done=true}}
function slip(R){const S=R.split,lv=R.leave;if(lv==null)return null;const out={rt:R.green==null?null:+(lv-R.green).toFixed(3),red:R.green!=null&&lv<R.green,
    t60:S.t60!=null?+(S.t60-lv).toFixed(3):null,t330:S.t330!=null?+(S.t330-lv).toFixed(3):null,et:S.et!=null?+(S.et-lv).toFixed(3):null,mph:null,et14:null,mph14:null,
    launchRpm:R.launchRpm!=null?+R.launchRpm.toFixed(2):null,launchQ:R.launchQ,spin:+R.peakSpin.toFixed(2),type:R.s.type};
  if(S.et!=null&&S.trap0!=null){const v=TRAP/(S.et-S.trap0);out.mph=+(v*MPH).toFixed(1);
    /* a quarter-mile estimate from the eighth (the usual rule of thumb: ET x 1.56, speed x 1.27); labelled "est." everywhere */
    out.et14=+(out.et*1.56).toFixed(2);out.mph14=+Math.min(out.mph*1.27,R.s.vg[R.s.vg.length-1]*MPH).toFixed(1)}
  return out}

/* ---------- a whole pass by a driver profile (the AI, and the player's profile for the odds) ----------
   driver: {rt mean s, rtSd, redP (chance of jumping the light), launchQ 0..1 (how close to the sweet rpm he leaves, how well he feathers
   a spin), missP (chance per shift of a missed shift)}. o.greenAt: when the light goes green (s). Returns the run (slip(run) for numbers). */
function normal(rnd){let u=0,v=0;while(u===0)u=rnd();while(v===0)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function ai(s,d,rnd,o){o=o||{};const R=run(s),tg=o.greenAt!=null?o.greenAt:1.5;R.green=tg;
  /* when he lets go of the brake: his reaction (a jump: before the green), less the time the car takes to roll out of the beam */
  let rt=d.rt+normal(rnd)*d.rtSd;if(rnd()<d.redP)rt=-(.01+rnd()*.1);rt=Math.max(-.2,Math.min(1.2,rt));
  const go=tg+rt-rollTime(s);
  const[lo,hi]=s.band,mid=(lo+hi)/2,w=(hi-lo)/2;const want=clamp(mid+normal(rnd)*w*(1.9-1.5*d.launchQ),.15,1);
  for(let g=1;g<s.vg.length;g++)if(rnd()<d.missP){R.miss=g;break}
  let feather=0;
  /* one frame of the driver: dt can be anything (the game's frame, or 1/120 in a pure sim) */
  const tick=dt=>{if(R.done)return R;let thr,brake;
    if(!R.launched){brake=R.t<go;thr=R.t<go-1.6?0:clamp((want-.12)/.88,0,1);if(!brake)thr=Math.max(thr,.9)}
    else{brake=false;thr=1;if(feather>0){feather-=dt;thr=.55}else if(R.spin>.3&&rnd()<d.launchQ*dt*14)feather=.12+.1*(1-d.launchQ)}
    step(R,{thr,brake},dt);return R};
  return{R,tick,plan:{rt,want,miss:R.miss}}}
function sim(s,d,rnd,o){const c=ai(s,d,rnd,o),maxT=c.R.green+60;while(!c.R.done&&c.R.t<maxT)c.tick(1/120);return c.R}
/* how long a car takes from brake-off to the stage beam (a clean launch): the AI leaves this much before it means to "react" */
const ROLLC={};function rollTime(s){const k=s.type+'|'+s.kw.toFixed(0)+'|'+s.mu.toFixed(2);if(ROLLC[k]!=null)return ROLLC[k];const R=run(s);R.rpm=(s.band[0]+s.band[1])/2;
  let t=0;while(R.leave==null&&t<3){step(R,{thr:1,brake:false},1/240);t+=1/240}return ROLLC[k]=R.leave==null?.3:R.leave}

/* ---------- a race: two lanes, the same green (or a bracket handicap) ----------
   a, b: {spec, driver} or {spec, run} (a finished run: the player's own pass). o.dial: [dialA, dialB] for a bracket race (the slower dial
   goes first; running quicker than your dial is a breakout). Result: win (0 = a, 1 = b), how (red / breakout / ...), margin s and m. */
function race(a,b,rnd,o){o=o||{};const dial=o.dial||null,g0=1.5,gs=dial?[g0+Math.max(0,dial[1]-dial[0]),g0+Math.max(0,dial[0]-dial[1])]:[g0,g0];
  /* bracket: the quicker dial waits the difference (gs above). heads-up: both green together */
  const runs=[a,b].map((s,i)=>s.run||sim(s.spec,s.driver,rnd,{greenAt:gs[i]}));const sl=runs.map(slip);
  return judge(runs,sl,dial)}
function judge(runs,sl,dial){const fin=sl.map((x,i)=>x&&x.et!=null?runs[i].split.et:Infinity);
  const red=sl.map(x=>!!(x&&x.red)),rt=sl.map(x=>x?x.rt:9);
  let win,how='finish';
  if(red[0]&&red[1]){win=rt[0]<rt[1]?1:0;how='red'}/* both red: the first red loses */
  else if(red[0]||red[1]){win=red[0]?1:0;how='red'}
  else if(dial){const bo=sl.map((x,i)=>x&&x.et!=null&&x.et<dial[i]?dial[i]-x.et:0);
    if(bo[0]&&bo[1]){win=bo[0]>bo[1]?1:0;how='breakout'}else if(bo[0]||bo[1]){win=bo[0]?1:0;how='breakout'}else win=fin[0]<=fin[1]?0:1}
  else win=fin[0]<=fin[1]?0:1;
  const dt=Math.abs(fin[0]-fin[1]),ls=sl[1-win];const mv=ls&&ls.mph?ls.mph/MPH:30;/* metres: the loser's speed through the trap */
  return{win,how,red,margin:isFinite(dt)?+dt.toFixed(3):null,marginM:isFinite(dt)?+(dt*mv).toFixed(2):null,slips:sl}}
/* P(a wins) from n races with a seeded stream (the same model; the odds the booth shows) */
function winP(a,b,n,seed,o){const rnd=rng(seed||12345);let w=0;for(let i=0;i<n;i++)if(race(a,b,rnd,o).win===0)w++;return w/n}
function rng(seed){let x=seed>>>0;return()=>{x=x+0x6D2B79F5|0;let t=Math.imul(x^x>>>15,1|x);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- the ladder: who races at the strip ----------
   Each racer: a car (street class unless noted), a consistent driver profile, a tier (1 easiest .. 8), a voice. Mixed cast, neighbours and
   a couple of out-of-towners; none of them is the crew or the family. pool: the neighbour model they use (js/people.js keys). */
const RACERS=[
 {id:'gus',name:'Gus Lindqvist',car:'mower',tier:0,pool:'nb_pops',cls:'mower',bio:'Retired. Races the mower. Says the blade is "for downforce."',
  d:{rt:.42,rtSd:.10,redP:.02,launchQ:.6,missP:.05},lines:{hello:"It's a lawn tractor. It's also my whole personality.",win:'Turf justice.',lose:'Good race. I need to sharpen the blade. For aerodynamics.'}},
 {id:'marisol',name:'Marisol Vega',car:'hatch',tier:2,pool:'nb_lucia',bio:'Teaches drivers ed. Uses her turn signal on the strip.',
  d:{rt:.30,rtSd:.08,redP:.01,launchQ:.6,missP:.02},lines:{hello:'Ten and two. Mirrors. Okay. Let\'s do something irresponsible.',win:'Smooth is fast. I tell my students that. They never listen.',lose:'Fair. You were smoother.'}},
 {id:'walt',name:'Walt Okafor',car:'minivan',tier:3,pool:'nb_marcus',bio:'Four kids. The van has 230,000 miles and a name (Brenda).',
  d:{rt:.26,rtSd:.07,redP:.03,launchQ:.66,missP:.03},lines:{hello:"Brenda's never lost a school run. She's lost plenty of these.",win:'Brenda! BRENDA!',lose:"Brenda's tired. Brenda's always tired."}},
 {id:'priya',name:'Priya Raman',car:'suv',tier:5,pool:'nb_mei',bio:'HOA treasurer. Keeps a spreadsheet of every pass she has ever made.',
  d:{rt:.15,rtSd:.045,redP:.03,launchQ:.85,missP:.02},lines:{hello:"I've logged forty-one passes in this thing. Variance is low. Like my expectations of you.",win:'Within budget.',lose:"I'm adding you to the spreadsheet. In red."}},
 {id:'dutch',name:'Dutch Hendricks',car:'workvan',tier:1,pool:'nb_sweater',bio:'Plumber. The van is full of pipe. He refuses to unload it. "It\'s ballast."',
  d:{rt:.38,rtSd:.10,redP:.03,launchQ:.55,missP:.04},lines:{hello:"Van's loaded. Two hundred pounds of copper. It's ballast. Don't ask.",win:'Copper, baby.',lose:'Should have unloaded the pipe. Not doing that.'}},
 {id:'tomas',name:'Tomás Reyes',car:'pickup',tier:4,pool:'nb_kenji',bio:'Out of town, from two counties over. Brought his own tyre pressure gauge.',
  d:{rt:.2,rtSd:.06,redP:.04,launchQ:.8,missP:.03},lines:{hello:"Two counties I drove for this. Don't make it boring.",win:"Tell your neighbours. I'll be back next month.",lose:'Okay. Okay! The local guy can drive.'}},
 {id:'june',name:'June Abernathy',car:'sedan',tier:6,pool:'nb_gran',bio:'Grandmother of six. Fastest reaction times at the strip. Nobody knows why.',
  d:{rt:.11,rtSd:.04,redP:.035,launchQ:.86,missP:.015},lines:{hello:'Buckle up, sweetheart.',win:'I used to do this before the grandkids. And during. And now.',lose:"Well. Look at you. I'll get you next time, sweetheart."}},
 {id:'rook',name:'"Rook" Delacroix',car:'sedan',tier:7,pool:'nb_office',bio:'The out-of-towner everybody talks about. Wins a lot. Smiles about it.',
  d:{rt:.075,rtSd:.03,redP:.06,launchQ:.93,missP:.01},lines:{hello:"So you're the dad everyone's talking about. Let's see it.",win:'Nice try. Go home and practise on the school run.',lose:'...Huh. Rematch. Not tonight. Soon.'}}];
const LADDER=RACERS.filter(r=>r.cls!=='mower').sort((a,b)=>a.tier-b.tier).map(r=>r.id);
const racer=id=>RACERS.find(r=>r.id===id)||null;
/* the player's profile for the odds: his own last passes (reaction times, launches), a novice until he has a few */
function playerProfile(hist){const h=(hist||[]).filter(x=>x&&x.rt!=null&&x.rt>-1).slice(-12);if(h.length<3)return{rt:.34,rtSd:.11,redP:.06,launchQ:.5,missP:0,novice:true};
  const rts=h.map(x=>x.rt),reds=rts.filter(r=>r<0).length,ok=rts.filter(r=>r>=0);const m=ok.length?ok.reduce((a,b)=>a+b,0)/ok.length:.3;
  const sd=ok.length>1?Math.sqrt(ok.reduce((a,b)=>a+(b-m)*(b-m),0)/(ok.length-1)):.1;const lq=h.reduce((a,x)=>a+(x.launchQ==null?.5:x.launchQ),0)/h.length;
  return{rt:clamp(m,.02,.8),rtSd:clamp(sd,.02,.25),redP:clamp((reds+.5)/(h.length+1),.01,.4),launchQ:clamp(lq,.2,.98),missP:0}}

/* ---------- money (docs/dragstrip.md): jobs pay $400-1,400 base; the strip is a side line that can't replace them ----------
   heads-up: entry $25, a win pays the entry back + the purse (tier-scaled); the first win over each racer pays a one-off bonus (not capped);
   repeat wins over the same racer pay less each time that day. Every purse counts toward a $400 daily cap on strip winnings.
   bracket night (every third in-game day): $60 entry, three rounds, $300 to the winner, $90 runner-up.
   rental for a money race: $20 (test & tune is free). Mower class: $10 entry, $20 purse, a $50 one-off for beating Gus.
   bets: $10-100 a bet; at most $300 won and $200 lost per in-game day; a bet never takes cash below $150 and you can't stake what you
   don't have (no tab). Payout multipliers come from the model's win probability with an 8% house edge. In-game cash only. */
const ECON={entry:25,purseBase:30,pursePer:10,firstWin:[50,75,100,150,200,250,300,400],repeatK:.55,repeatMin:.2,dayCap:400,rent:20,
  bracket:{entry:60,win:300,runner:90,every:3,rounds:3},turf:{entry:10,purse:20,first:50},
  bet:{min:10,max:100,winCap:300,lossCap:200,floor:150,edge:.08,pMin:.05,pMax:.95,multMin:1.05,multMax:12}};
/* SAVE.strip.days: per in-game day {won (purses), betWon, betLost, beat{id:n}} */
function day(sv,d){if(!sv)return null;const k=String(d||1);const D=sv.days||(sv.days={});for(const x in D)if(x!==k&&Object.keys(D).length>3)delete D[x];
  return D[k]||(D[k]={won:0,betWon:0,betLost:0,beat:{}})}
function purse(r,repeats){const base=ECON.purseBase+ECON.pursePer*Math.max(0,r.tier);return Math.round(base*Math.max(ECON.repeatMin,Math.pow(ECON.repeatK,repeats||0)))}
function payout(p){const B=ECON.bet;p=clamp(p,B.pMin,B.pMax);return +clamp((1-B.edge)/p,B.multMin,B.multMax).toFixed(2)}
/* the most he may stake now (0 = no bet): the min/max, the cash floor, today's loss cap, and a win that would blow today's win cap */
function maxStake(cash,D,mult){const B=ECON.bet;let m=Math.min(B.max,Math.floor(cash-B.floor),B.lossCap-(D?D.betLost:0));
  if(mult>1){const room=B.winCap-(D?D.betWon:0);m=Math.min(m,Math.floor(room/(mult-1)))}return m>=B.min?m:0}
function canBet(cash,D,stake,mult){const B=ECON.bet;if(!(stake>=B.min))return'The minimum bet is $'+B.min+'.';if(stake>B.max)return'The booth takes $'+B.max+' at most.';
  if(cash-stake<B.floor)return'Not with the mortgage money. The booth keeps you above $'+B.floor+'.';
  if(D&&D.betLost+stake>B.lossCap)return"That's enough for today. The booth stops you at $"+B.lossCap+' down in a day.';
  if(D&&mult>1&&D.betWon+stake*(mult-1)>B.winCap)return'The booth caps a day\'s winnings at $'+B.winCap+'. Bet smaller, or come back tomorrow.';
  return null}
/* a settled bet: the cash change (+winnings or -stake), and the day's tallies */
function settle(D,stake,mult,won){const net=won?Math.round(stake*(mult-1)):-stake;if(D){if(won)D.betWon+=net;else D.betLost+=stake}return net}
/* a purse against the daily cap: what is actually paid */
function capPurse(D,amt){const room=Math.max(0,ECON.dayCap-(D?D.won:0)),p=Math.min(room,amt);if(D)D.won+=p;return p}

const API={SPEC,CLASSES,REFUSE,RACERS,LADDER,ECON,EIGHTH,FT60,FT330,TRAP,ROLL,MPH,spec,run,step,slip,sim,ai,race,judge,winP,payout,rng,racer,playerProfile,day,purse,maxStake,canBet,settle,capPurse,rollTime,
  classOf:t=>{for(const k in CLASSES)if(CLASSES[k].types.includes(t))return k;return null},
  /* every type the strip can lend (HT.Garage's cars plus the mower): the car picker */
  types:()=>Object.keys(SPEC)};
HT.Drag=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
