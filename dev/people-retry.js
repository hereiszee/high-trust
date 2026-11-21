/* On-demand character models that fail or stall (QA): the test server answers 404 twice then 200 for one model (nb_kenji), and 404
   forever for another (nb_lucia, Heavy Lifting's Mrs. Adeyemi). Checks:
   1. preload() resolves within the ceiling (~8 s) for both, never hangs
   2. nb_kenji arrives for real after the retries (not on a stand-in)
   3. nb_lucia gets a stand-in from a boot-loaded body: has() is true, make() returns a rigged character (never null, never a box)
   4. a job whose cast includes the missing model (Heavy Lifting) still starts (the cast wait has a ceiling) and runs
   node dev/people-retry.js */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const hits={nb_kenji:0,nb_lucia:0};
  await p.route(/assets\/people\/rocketbox\/(nb_kenji|nb_lucia)\.glb$/,async r=>{const k=/(nb_kenji|nb_lucia)/.exec(r.request().url())[1];hits[k]++;
    if(k==='nb_lucia'||hits[k]<=2)return r.fulfill({status:404,body:'nope'});
    const f=path.join(__dirname,'..','assets/people/rocketbox',k+'.glb');r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':'model/gltf-binary'}})});
  await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(300);
  await p.evaluate(async()=>{const H=window.__ht;await H.jobs.ready;H.step(3);const PP=window.HT.People;PP.loadTuning.timeout=4000})/* shorter per-attempt timeout for the test */;
  const t0=Date.now();const pre=await p.evaluate(async()=>{const PP=window.HT.People;const r=await PP.preload(['nb_kenji','nb_lucia']);return{r,missing:Object.keys(PP.missing)}});const dt=Date.now()-t0;
  ok(dt<12000,'preload resolved in '+(dt/1000).toFixed(1)+' s (ceiling 8 s): '+JSON.stringify(pre));
  /* give the retries time: 404, 404 (1 s, 2 s backoff), then 200 */
  await p.waitForFunction(()=>!window.HT.People.missing.nb_kenji&&window.HT.People.has('nb_kenji'),null,{timeout:30000}).catch(()=>{});
  const st=await p.evaluate(()=>{const PP=window.HT.People;const mk=k=>{const d=PP.make(k);return d?{rb:!!d.rb,key:d.rb&&d.rb.key,name:d.root.children[0]&&d.root.children[0].name}:null};
    return{kenji:{missing:!!PP.missing.nb_kenji,has:PP.has('nb_kenji'),make:mk('nb_kenji')},lucia:{missing:!!PP.missing.nb_lucia,has:PP.has('nb_lucia'),make:mk('nb_lucia')},stats:PP.loadStats}});
  ok(!st.kenji.missing&&st.kenji.has&&st.kenji.make,'404, 404, 200: nb_kenji arrived for real after '+hits.nb_kenji+' requests '+JSON.stringify(st.kenji));
  ok(st.lucia.missing&&st.lucia.has&&st.lucia.make&&st.lucia.make.rb,'404 forever: nb_lucia is on a stand-in, has() true, make() gives a rigged character '+JSON.stringify(st.lucia)+' ('+hits.nb_lucia+' requests so far)');
  /* a job that needs the missing model still starts */
  const job=await p.evaluate(async()=>{const H=window.__ht,s=H.jobs.api.SV();for(const id of['gary','rick','earl','dee','rosa']){const i=H.jobs.index(id);H.prog.done[i]=true;window.HT.Save.jobRec(s,id).done=true}H.prog.trustR=60;s.flags.act2Intro=true;
    H.enterHub();H.step(3);const t=performance.now();H.jobs.start('moving');if(H.jobs.castWait)await H.jobs.castWait;H.step(30);return{mode:H.mode,id:H.M&&H.M.def.id,state:H.M&&H.M.state,ms:Math.round(performance.now()-t)}});
  ok(job.mode==='mission'&&job.id==='moving'&&job.state==='go','Heavy Lifting (needs nb_lucia) started and runs with the stand-in '+JSON.stringify(job));
  const bad=errs.filter(e=>!/favicon|404|nb_lucia|nb_kenji/.test(e));ok(!bad.length,'no console errors (besides the 404s)'+(bad.length?': '+bad.slice(0,5).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
