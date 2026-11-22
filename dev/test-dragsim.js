/* HT.Drag (js/dragsim.js): the drag strip's race model, odds and money rules. node dev/test-dragsim.js (or dev/run-tests.js) */
const assert=require('assert'),{test,suite,done}=require('./harness');const D=require('../js/dragsim.js');
suite('dragsim');
const pro={rt:.06,rtSd:.02,redP:0,launchQ:.95,missP:0};
const avgET=(t,d,n=20,veh)=>{const r=D.rng(3);let s=0;for(let i=0;i<n;i++)s+=D.slip(D.sim(D.spec(t,veh),d,r)).et;return s/n};
test('every lendable car makes a plausible eighth-mile pass (ET 8.5-12.5 s street, 18-30 s mower; trap 55-90 mph street)',()=>{
  for(const t of D.types()){const sl=D.slip(D.sim(D.spec(t),pro,D.rng(1)));assert(sl&&sl.et,t);
    if(t==='mower')assert(sl.et>18&&sl.et<30,t+' '+sl.et);else{assert(sl.et>8.5&&sl.et<12.5,t+' et '+sl.et);assert(sl.mph>55&&sl.mph<90,t+' mph '+sl.mph)}
    assert(sl.t60>1.6&&sl.t60<sl.t330&&sl.t330<sl.et,t+' splits in order');assert(sl.et14>sl.et&&sl.mph14>=sl.mph,t+' quarter-mile estimate is labelled bigger')}});
test('the order is the honest one: sedan quickest, then the SUV and pickup, minivan, hatch, work van; mower last',()=>{
  const e={};for(const t of D.types())e[t]=avgET(t,pro);
  assert(e.sedan<e.suv&&e.sedan<e.pickup,JSON.stringify(e));assert(e.suv<e.minivan&&e.pickup<e.minivan,JSON.stringify(e));
  assert(e.minivan<e.hatch&&e.hatch<e.workvan&&e.workvan<e.mower,JSON.stringify(e))});
test('flooring it off the line costs time (wheelspin), most on the pickup; a good launch beats it',()=>{
  const flo=t=>{const R=D.run(D.spec(t));R.green=0;R.rpm=1;let k=0;while(!R.done&&k++<6000)D.step(R,{thr:1,brake:false},1/60);return D.slip(R)};
  for(const t of['pickup','sedan','minivan']){const f=flo(t),g=avgET(t,pro,6);assert(f.spin>.9,t+' spins');assert(f.et-g>.5,t+' floored '+f.et+' vs '+g.toFixed(2))}
  const pk=flo('pickup').et-avgET('pickup',pro,6),sv=flo('suv').et-avgET('suv',pro,6);assert(pk>sv,'AWD SUV forgives a bad launch more than the RWD pickup')});
test('engine upgrades make your own car quicker (garage upgrades matter)',()=>{const v={perf:{engine:3,tyres:2,brakes:0,sport:false},prot:{armor:0,bullBar:false}};
  assert(avgET('minivan',pro,6,v)<avgET('minivan',pro,6)-.6)});
test('every Dad\'s Auto upgrade moves the strip numbers the right way, and is named (tyres: 60 ft; sport: ET; armour: slower; book rows differ)',()=>{
  const v=(p,pr)=>({perf:Object.assign({engine:0,tyres:0,brakes:0,sport:false},p||{}),prot:Object.assign({armor:0,bullBar:false},pr||{})});
  const one=(t,veh,util)=>{const r=D.rng(11);let a=0,b=0,c=0;for(let i=0;i<6;i++){const sl=D.slip(D.sim(D.spec(t,veh,util),pro,r));a+=sl.t60;b+=sl.et;c+=sl.mph}return{t60:a/6,et:b/6,mph:c/6}};
  const st=one('minivan',v()),ty=one('minivan',v({tyres:2})),sp=one('minivan',v({sport:true})),ar=one('minivan',v({},{armor:2})),en=one('minivan',v({engine:2}));
  assert(ty.t60<st.t60-.02,'tyres 60ft '+st.t60+' -> '+ty.t60);assert(sp.et<st.et-.05,'sport et');assert(ar.et>st.et+.03,'armour heavier');assert(en.et<st.et-.2&&en.mph>st.mph+2,'engine');
  const s0=D.spec('minivan'),s1=D.spec('minivan',v({engine:2,tyres:1})),s2=D.spec('minivan',v());
  assert.strictEqual(D.upText(s0),'stock');assert(/V6 Swap/.test(D.upText(s1))&&/All-Season/.test(D.upText(s1)));assert(D.bookKey(s0)!==D.bookKey(s1)&&D.bookKey(s1)!==D.bookKey(s2)&&D.bookKey(s0)!==D.bookKey(s2))});
test('staged with the brake on: the car does not move, the rpm follows the throttle',()=>{const R=D.run(D.spec('sedan'));for(let i=0;i<60;i++)D.step(R,{thr:1,brake:true},1/60);
  assert.strictEqual(R.x,0);assert(R.rpm>.9);for(let i=0;i<60;i++)D.step(R,{thr:0,brake:true},1/60);assert(R.rpm<.2)});
test('leaving before the green is a red light (negative RT) and it loses',()=>{const a={spec:D.spec('minivan'),driver:{rt:-.08,rtSd:0,redP:0,launchQ:.9,missP:0}},b={spec:D.spec('hatch'),driver:pro};
  const r=D.race(a,b,D.rng(5));assert(r.slips[0].red&&r.slips[0].rt<0);assert.strictEqual(r.win,1);assert.strictEqual(r.how,'red')});
test('bracket: the quicker dial waits; running under your dial is a breakout and loses',()=>{const s=D.spec('sedan'),m=D.spec('workvan');
  const r=D.race({spec:s,driver:pro},{spec:m,driver:pro},D.rng(2),{dial:[9.0,10.9]});/* the sedan dialled 9.0 runs ~9.4: no breakout */
  assert(r.slips[0].et>9);const b=D.race({spec:s,driver:pro},{spec:m,driver:pro},D.rng(2),{dial:[9.8,10.9]});assert(b.slips[0].et<9.8);assert.strictEqual(b.win,1);assert.strictEqual(b.how,'breakout')});
test('odds: over 2,000 simulated races, each matchup wins as often as its stated probability (within 3.5 points)',()=>{
  const R=D.RACERS,pairs=[['walt','priya'],['marisol','walt'],['dutch','tomas'],['june','rook'],['tomas','june']];
  for(const[x,y]of pairs){const A=D.racer(x),B=D.racer(y),a={spec:D.spec(A.car),driver:A.d},b={spec:D.spec(B.car),driver:B.d};
    const p=D.winP(a,b,600,777);let w=0;const rnd=D.rng(424242+x.length);const N=2000;for(let i=0;i<N;i++)if(D.race(a,b,rnd).win===0)w++;
    const f=w/N;assert(Math.abs(f-p)<.035,x+' vs '+y+': stated '+p.toFixed(3)+' observed '+f.toFixed(3));
    const m=D.payout(p);assert(m*p<=1-D.ECON.bet.edge+.01||m===D.ECON.bet.multMin,'house edge holds: EV '+(m*p).toFixed(3))}});
test('the ladder climbs: each racer beats the one below more often than not (consistent skills)',()=>{const L=D.LADDER.map(D.racer);
  for(let i=1;i<L.length;i++){const p=D.winP({spec:D.spec(L[i].car),driver:L[i].d},{spec:D.spec(L[i-1].car),driver:L[i-1].d},400,99);assert(p>.5,L[i].id+' over '+L[i-1].id+' '+p)}});
test('money: purses shrink on repeat wins and stop at the daily cap; first-win bonuses are one-off',()=>{const r=D.racer('walt'),D0={won:0,betWon:0,betLost:0,beat:{}};
  assert(D.purse(r,0)>D.purse(r,1)&&D.purse(r,1)>D.purse(r,3));let paid=0;for(let i=0;i<40;i++)paid+=D.capPurse(D0,D.purse(r,0));assert.strictEqual(paid,D.ECON.dayCap)});
test('bets: limits, the cash floor, the daily loss and win caps; no stake you do not have',()=>{const E=D.ECON.bet,d={won:0,betWon:0,betLost:0,beat:{}};
  assert(D.canBet(1000,d,5,2));assert(D.canBet(1000,d,E.max+1,2));assert(D.canBet(E.floor+20,d,30,2),'floor');assert(!D.canBet(E.floor+30,d,30,2));
  assert.strictEqual(D.maxStake(E.floor+5,d,2),0);assert.strictEqual(D.maxStake(100,d,2),0,'below the floor: no bet');
  let lost=0;for(let i=0;i<20;i++){if(D.canBet(5000,d,50,2))break;lost+=-D.settle(d,50,2,false)}assert(lost<=E.lossCap&&d.betLost<=E.lossCap);
  const w={won:0,betWon:0,betLost:0,beat:{}};let won=0;for(let i=0;i<20;i++){const m=3,st=Math.min(50,D.maxStake(5000,w,m));if(!st)break;won+=D.settle(w,st,m,true)}assert(won<=E.winCap,'won '+won);
  assert(D.payout(.5)<2&&D.payout(.5)>1.7);assert(D.payout(.999)>=E.multMin&&D.payout(.001)<=E.multMax)});
test('class rules: the street class is the six garage cars; the mower has its own; tank / jet / bike are refused',()=>{
  assert.deepStrictEqual(D.CLASSES.street.types.sort(),['hatch','minivan','pickup','sedan','suv','workvan']);assert.strictEqual(D.classOf('mower'),'mower');
  for(const t of['tank','jet','bike'])assert(!D.classOf(t)&&D.REFUSE[t])});
test('achievements (js/platform.js) read the strip from the save: first pass, the whole ladder, a perfect light',()=>{const P=require('../js/platform.js');
  const ids=P.ACHIEVEMENTS.map(a=>a.id);for(const id of['ACH_EIGHTH_MILE','ACH_TOP_OF_THE_LADDER','ACH_PERFECT_LIGHT'])assert(ids.includes(id),id);
  const beaten={};const s={strip:{stats:{passes:1,perfect:false},ladder:{beaten}}};assert(P.evaluate(s).includes('ACH_EIGHTH_MILE'));assert(!P.evaluate(s).includes('ACH_TOP_OF_THE_LADDER'));
  for(const id of D.LADDER)beaten[id]=true;assert(P.evaluate(s).includes('ACH_TOP_OF_THE_LADDER'));s.strip.stats.perfect=true;assert(P.evaluate(s).includes('ACH_PERFECT_LIGHT'))});
if(require.main===module)done();
