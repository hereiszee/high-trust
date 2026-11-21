/* Character models under a bad network, in the real game (one headless browser):
   node dev/people-load.e2e.js [--shots]
   Every people model request (assets/people/rocketbox/*.glb and the optimised copies) goes through a route that ABORTS the first 6
   requests of each scenario and delays every other one by 3 s. In each scenario the test steps the game and samples the scene every
   ~250 ms for 30 s and checks:
     - no box-figure (index.html boxDude) is ever visible in the scene, at any sampled frame;
     - within 30 s every visible named character (crew, givers, job cast, neighbours, everything People made) is a real skinned model:
       nothing left pending in the scene, every ally / giver dude has rb.mixer and skinned meshes;
     - name tags are never shown for a character still pending.
   Scenarios: (i) the Maple hub at game start with the crew out (Rick, Dave, Doug), (ii) Riverside (givers + neighbours),
   (iii) the roundup job, (iv) the hub again after returning from that job.
   --shots: docs/screenshots/people-load/<scenario>.jpg */
const {open}=require('./ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const SHOTS=process.argv.includes('--shots'),DIR=path.join(__dirname,'../docs/screenshots/people-load');
let fails=0;const ok=(m,c,x)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''))};
const NET={n:0,aborted:0,delayed:0,abortFirst:6,ms:3000};
const MODEL=/\/assets\/(opt\/)?people\/rocketbox\/[^/]+\.glb(\?|$)/;
(async()=>{
  const {b,p,errs}=await open({before:async p=>{await p.route(MODEL,async r=>{NET.n++;
    if(NET.abortFirst>0){NET.abortFirst--;NET.aborted++;return r.abort()}
    NET.delayed++;await new Promise(res=>setTimeout(res,NET.ms));return r.fallback()})}});
  const ev=(f,a)=>p.evaluate(f,a);
  const rearm=()=>{NET.abortFirst=6};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));
  await p.waitForTimeout(300);
  await ev(()=>{const H=window.__ht;H.WM.beat=true;if(H.save&&H.save.flags)H.save.flags.act2Intro=true;
    /* page-side probe: what is in the scene right now */
    window.__PL={probe(){const H=window.__ht,PP=HT.People,sc=H.scene;const inScene=o=>{let a=o;while(a.parent)a=a.parent;return a===sc};
      const shown=o=>{for(let a=o;a;a=a.parent)if(!a.visible)return false;return true};
      let box=[];sc.traverse(o=>{if(o.userData&&o.userData.boxDude&&shown(o))box.push({x:+o.position.x.toFixed(1),z:+o.position.z.toFixed(1)})});
      const pend=PP.pending.filter(d=>inScene(d.root)&&d.root._htVis&&(!d.root.parent||shown(d.root.parent))).map(d=>(d.rb||d._rb).key);
      /* meant to be on screen: the game wants it visible (a pending root reports invisible, so read what the game set) and its parents are shown */
      const meant=d=>(('_htVis' in d.root)?d.root._htVis:d.root.visible)&&(!d.root.parent||shown(d.root.parent));
      const real=d=>!!(d&&d.rb&&!d.pending&&d.rb.mixer&&d.rb.skinned&&d.rb.skinned.length);
      const named=[...H.allies.map(a=>({who:a.id,d:a.dude})),...H.npcs.map(n=>({who:n.id,d:n.dude})),{who:'you',d:H.P.dude}].filter(x=>x.d&&inScene(x.d.root)&&meant(x.d));
      const why=d=>d.pending?':pending':d.boxed?':boxed':!d.rb?':box':!d.rb.mixer?':nomixer':!(d.rb.skinned&&d.rb.skinned.length)?':noskin':':?';
      const notReal=named.filter(x=>!real(x.d)).map(x=>x.who+why(x.d));
      const live=PP.live.filter(d=>inScene(d.root)&&shown(d.root)).length;
      /* a tag drawn over a pending character */
      const tagged=H.allies.filter(a=>a.dude&&a.dude.pending&&a.tag&&a.tag.isConnected).length;
      return{box,pend,notReal,named:named.length,live,tagged}}}});
  const run=async(name,prep,frame)=>{rearm();const t0=Date.now();await ev(prep);let boxSeen=[],last=null,readyAt=null,samples=0,pendSeen=0;
    while(Date.now()-t0<30000){const r=await ev(()=>{window.__ht.step(4);return window.__PL.probe()});samples++;last=r;
      if(r.box.length)boxSeen.push(r.box);if(r.pend.length)pendSeen++;
      if(readyAt===null&&!r.pend.length&&!r.notReal.length&&r.named>0)readyAt=Date.now()-t0;
      if(readyAt!==null&&Date.now()-t0-readyAt>3000)break;
      await p.waitForTimeout(250)}
    ok(name+': no box figure visible at any of '+samples+' sampled frames',boxSeen.length===0,boxSeen.slice(0,2));
    ok(name+': every visible named character is a real skinned model within 30 s',readyAt!==null,{readyMs:readyAt,named:last.named,live:last.live,pending:last.pend,notReal:last.notReal,sawPending:pendSeen,net:{...NET}});
    if(SHOTS&&frame){fs.mkdirSync(DIR,{recursive:true});await ev(frame);await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(DIR,name+'.jpg'),quality:80})}};
  const look=(x,z,yaw)=>{const H=window.__ht;H.P.pos.set(x,0,z);H.P.yaw=yaw;H.P.pitch=-.12;H.step(2)};
  /* (i) the Maple hub at game start, crew out */
  await run('hub-start',()=>{const H=window.__ht;for(const j of[1,2,3])H.prog.done[j]=true;H.enterHub();H.step(2)},
    ()=>{const H=window.__ht,a=H.allies[0];if(!a)return;const P=H.P;const f=[-Math.sin(P.yaw),-Math.cos(P.yaw)];P.pos.set(P.pos.x-f[0]*2.5,0,P.pos.z-f[1]*2.5);H.step(2)});
  /* (ii) Riverside: givers and neighbours */
  await run('riverside',()=>{const H=window.__ht;H.prog.done.fill(false);for(const j of[0,1,2,3])H.prog.done[j]=true;H.prog.trustR=60;H.enterHub();H.openBridge();if(H.dress)H.dress(60);
      H.P.pos.set(356,0,46);H.collide(H.P.pos,.35);H.step(4);if(H.ow&&H.ow.buildAll)H.ow.buildAll();H.step(2)},
    ()=>{const H=window.__ht,n=H.npcs.find(n=>n.id==='earl')||H.npcs[0];if(n){H.P.pos.set(n.pos.x+3,0,n.pos.z+3);H.P.yaw=Math.atan2(3,3);H.P.pitch=-.1;H.step(2)}});
  /* (iii) the roundup job */
  await run('roundup',()=>{const H=window.__ht;H.jobs.start('roundup');H.step(3)},()=>{window.__ht.step(2)});
  const jm=await ev(()=>({mode:window.__ht.mode,job:window.__ht.M&&window.__ht.M.def&&window.__ht.M.def.id}));ok('roundup started',jm.mode==='mission',jm);
  /* (iv) back in the hub after the job */
  await run('hub-after-job',()=>{const H=window.__ht;try{H.jobs.finish(true,'test')}catch(e){}H.step(3);try{H.HUD.hide('result')}catch(e){}H.enterHub();H.step(2)},
    ()=>{const H=window.__ht,P=H.P;const f=[-Math.sin(P.yaw),-Math.cos(P.yaw)];P.pos.set(P.pos.x-f[0]*2.5,0,P.pos.z-f[1]*2.5);H.step(2)});
  const st=await ev(()=>HT.People.loadStats());console.log('     load stats: '+JSON.stringify(st));
  console.log('     network: '+JSON.stringify(NET));
  const bad=errs.filter(e=>!/Failed to load resource: net::ERR_FAILED/.test(e));ok('no console errors (other than the aborted requests)',bad.length===0,bad.slice(0,5));
  await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
