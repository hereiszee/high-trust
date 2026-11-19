/* Fairness sweep in the real game: node dev/ai-ingame-fair.js [--seeds 6]
   Plays each mission with the scripted dad at two skill levels over several seeds and reports win rate and health.
   "steady": 0.35 s to acquire a new target, aim wobble 0.22 m at 10 m. "casual": 0.7 s and 0.45 m, which misses a lot.
   Appends to docs/screenshots/ai-ingame/evidence.txt when --write is given. */
const {open,ROOT}=require('./ai-ingame-lib'),fs=require('fs'),path=require('path');
const arg=k=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:null};
const SEEDS=+(arg('--seeds')||6);const SK={steady:{react:.35,jitter:.22},casual:{react:.7,jitter:.45}};
(async()=>{const {b,p,errs}=await open({viewport:{width:640,height:360}});
  await p.addScriptTag({path:path.join(__dirname,'ai-ingame-bot.js')});
  const out=[];const log=s=>{console.log(s);out.push(s)};log(`\n== fairness sweep: ${SEEDS} seeds per mission and skill (real game, scripted dad)`);
  for(const [sk,cfg] of Object.entries(SK))for(let mi=0;mi<4;mi++){const rs=[];
    for(let seed=1;seed<=SEEDS;seed++){rs.push(await p.evaluate(([mi,seed,cfg])=>{let a=seed*7919+mi;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
        const H=__ht;H.AI.seed(seed*31+mi);H.prog.trust=50;H.startMission(mi);Object.assign(__bot.st,cfg,{path:null,log:[],shots:0,noHitT:0,tgt:null});let minHp=100,dmg=0,last=100;
        while(H.M.state==='go'&&H.M.elapsed<300){__bot.tick(1/30);H.step(1);if(H.P.hp<last)dmg+=last-H.P.hp;last=H.P.hp;minHp=Math.min(minHp,H.P.hp)}
        return{won:H.M.state==='won',t:Math.round(H.M.elapsed),minHp:Math.round(minHp),dmg:Math.round(dmg),cuffs:H.M.cuffs,kills:H.M.kills}},[mi,seed,cfg]))}
    const won=rs.filter(r=>r.won).length,med=a=>a.slice().sort((x,y)=>x-y)[a.length>>1];
    log(`  ${sk.padEnd(6)} mission ${mi}: won ${won}/${rs.length}, median damage taken ${med(rs.map(r=>r.dmg))}, median min hp ${med(rs.map(r=>r.minHp))} (worst ${Math.min(...rs.map(r=>r.minHp))}), median time ${med(rs.map(r=>r.t))}s`)}
  log(`  console errors during the sweep: ${errs.length}`);
  if(process.argv.includes('--write'))fs.appendFileSync(path.join(ROOT,'docs/screenshots/ai-ingame/evidence.txt'),out.join('\n')+'\n');
  await b.close()})();
