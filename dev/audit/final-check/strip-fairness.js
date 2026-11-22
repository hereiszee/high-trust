/* FINAL-CHECK Part 2 · fairness of the drag strip model (pure Node, no browser).  node dev/audit/final-check/strip-fairness.js
   1. stated odds (HT.Drag.winP as the booth calls it: 500 sims spectator, 240 sims self-bet) vs 5,000 fresh races, five matchups
   2. a red light always loses (5,000 races where one lane is forced to jump; both-red: the first jump loses)
   3. upgrades: engine and tyres make a car quicker, armour slower; a loaner/rental spec (no vehicle save) is stock
   4. the self-bet price: how far a sandbagged history (slow, red-lit test & tune passes) moves the multiplier vs a clean history */
const D=require('../../../js/dragsim.js');let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
const R=id=>D.racer(id),side=(id,car)=>({spec:D.spec(car||R(id).car),driver:R(id).d});
const MU=[['walt','priya'],['dutch','marisol'],['june','rook'],['tomas','priya'],['marisol','marisol','sedan','hatch']];
console.log('== 1. stated odds vs 5,000 races');
for(const m of MU){const a=side(m[0],m[2]),b=side(m[1],m[3]);const seed=4242+m[0].length*7;const p=D.winP(a,b,500,seed);const rnd=D.rng(99991+seed);let w=0;const N=5000;for(let i=0;i<N;i++)if(D.race(a,b,rnd).win===0)w++;
  const f=w/N,se=Math.sqrt(p*(1-p)/500+f*(1-f)/N);ok(Math.abs(p-f)<Math.max(.035,3*se),`${m[0]}${m[2]?'('+m[2]+')':''} vs ${m[1]}${m[3]?'('+m[3]+')':''}: stated ${p.toFixed(3)} (x${D.payout(p)} / x${D.payout(1-p)}), 5,000 races ${f.toFixed(3)}, |diff| ${Math.abs(p-f).toFixed(3)} (3 SE ${(3*se).toFixed(3)})`);
  /* the booth's own noise: the spread of the stated p over 40 seeds (what a player sees by re-asking) */
  const ps=[];for(let s=1;s<=40;s++)ps.push(D.winP(a,b,500,s*7919));const mn=Math.min(...ps),mx=Math.max(...ps);console.log(`     booth price spread over 40 re-asks: p ${mn.toFixed(3)}..${mx.toFixed(3)} -> best payout x${D.payout(mn)} vs fair 1/p_true x${(1/f).toFixed(2)} (EV of the best ask ${(f*D.payout(mn)).toFixed(3)} per $1)`)}
console.log('== 2. a red light always loses');
{const a=side('rook'),b=side('dutch');let n1=0,bad=0,n2=0,bothBad=0;const rnd=D.rng(5);
  /* a lane is red when its slip says so (left the beam before its green); count the races where exactly one / both are red */
  for(let i=0;i<5000;i++){const ra=D.sim(a.spec,Object.assign({},a.driver,{redP:.5}),rnd,{greenAt:1.5});const rb=D.sim(b.spec,Object.assign({},b.driver,{redP:.5}),rnd,{greenAt:1.5});
    const sl=[D.slip(ra),D.slip(rb)],res=D.judge([ra,rb],sl,null);
    if(sl[0].red&&sl[1].red){n2++;if(res.win===(sl[0].rt<sl[1].rt?0:1))bothBad++}else if(sl[0].red||sl[1].red){n1++;if(sl[res.win].red)bad++}}
  ok(n1>500&&bad===0,'one lane red: the red lane won '+bad+' of '+n1);ok(n2>100&&bothBad===0,'both red: the first jump won '+bothBad+' of '+n2)}
console.log('== 3. upgrades and stock');
{const rnd=()=>.5;const drv={rt:.2,rtSd:0,redP:0,launchQ:1,missP:0};const et=s=>{const r=D.sim(s,drv,D.rng(1),{greenAt:1.5});return D.slip(r).et};
  const base=et(D.spec('minivan',{perf:{engine:0,tyres:0},prot:{}})),stock=et(D.spec('minivan'));
  const rows=[['engine 1',{perf:{engine:1}}],['engine 2',{perf:{engine:2}}],['engine 3',{perf:{engine:3}}],['tyres 1',{perf:{tyres:1}}],['tyres 2',{perf:{tyres:2}}],['engine3+tyres2',{perf:{engine:3,tyres:2}}],['armour 2',{perf:{},prot:{armor:2}}],['bull bar',{perf:{},prot:{bullBar:true}}]];
  ok(Math.abs(base-stock)<1e-9,'own car with no upgrades = stock loaner ('+stock+')');
  for(const[n,v]of rows){const e=et(D.spec('minivan',v));const want=/armour|bull/.test(n)?e>base:e<base;ok(want,`minivan ${n}: ${e} vs stock ${base} (${want?'right direction':'WRONG direction'})`)}
  for(const t of D.types()){const s=D.spec(t);ok(!s.own&&!s.up&&s.kw===D.SPEC[t].kw&&s.mu===D.SPEC[t].mu,`loaner/rental ${t} is stock (own ${s.own}, up ${JSON.stringify(s.up)})`)}}
console.log('== 4. self-bet price: sandbagged history vs clean history (same real driver)');
{const clean=Array.from({length:12},(_,i)=>({rt:.12+(i%3)*.02,launchQ:1})),sand=Array.from({length:12},(_,i)=>({rt:i%3?.75:-.05,launchQ:.2}));
  for(const id of['dutch','walt','priya','june','rook']){const r=R(id),opp={spec:D.spec(r.car),driver:r.d},me=s=>({spec:D.spec('sedan'),driver:D.playerProfile(s)});
    const pc=D.winP(me(clean),opp,600,7),ps=D.winP(me(sand),opp,600,7);const mc=D.payout(pc),ms=D.payout(ps);
    console.log(`     vs ${id}: clean history p ${pc.toFixed(3)} x${mc} · sandbagged history p ${ps.toFixed(3)} x${ms} · EV per $1 when you then drive clean: ${(pc*ms).toFixed(2)}`)}}
console.log(fails?fails+' FAIL':'all ok');process.exit(fails?1:0);
