/* HT.Jobs registry (SPEC3 4.0, wave 0) in Node, no browser. Run: node dev/jobs-registry.test.js  (or node --test dev/jobs-registry.test.js)
   registration -> MISSIONS + HT.CATALOG.missions; hook dispatch (active job first, then systems; errors isolated; first result wins);
   gating; the job-file list loads with missing/empty files skipped; every job file that registers round-trips its [CP] state;
   save v2 -> v3 maps prog.done into jobs by id. The in-game half is dev/jobs-check.js. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
global.window=global;
const J=require('../js/jobs/_registry.js');
function bind(active){const MISSIONS=[{id:'gary',title:'Return to Sender'}],catalog=[{id:'gary',base:400,bonus:[]}],seen=[];
  J._reset();J.wrap('gary',MISSIONS[0],{});J.bind({MISSIONS,catalog,onRegister:j=>seen.push(j.id),active:()=>active.M});return{MISSIONS,catalog,seen}}

test('register pushes a MISSIONS entry and prices it in the catalog; duplicates are ignored',()=>{const A={M:null},G=bind(A);
  const j=J.register('dummy',{def:{title:'Dummy',pay:250,par:90,hood:'river',crew:['gary']}});
  assert.equal(G.MISSIONS.length,2);assert.equal(G.MISSIONS[1].id,'dummy');assert.equal(G.MISSIONS[1].reg,true);assert.equal(G.MISSIONS[1].type,'custom');assert.equal(j.index,1);
  assert.deepEqual(G.catalog[1],{id:'dummy',giver:'gary',who:'gary',title:'Dummy',base:250,par:90,hood:'river',bonus:[]});assert.deepEqual(G.seen,['dummy']);
  J.register('dummy',{def:{title:'Again'}});assert.equal(G.MISSIONS.length,2);assert.equal(J.list().length,2)});

test('registering before bind() is queued and attached on bind',()=>{J._reset();J.register('early',{def:{title:'Early'}});const A={M:null};const MISSIONS=[];J.bind({MISSIONS,catalog:[],active:()=>A.M});
  assert.equal(MISSIONS.length,1);assert.equal(J.get('early').index,0)});

test('hooks: active job first, then systems; errors isolated; nothing registered = cheap no-op',()=>{const A={M:null};bind(A);const log=[];
  assert.equal(J.hooks.camera(1/60),false);assert.equal(J.hooks.interact('x'),null);assert.equal(J.hooks.fire(),false);assert.equal(J.hooks.home('laptop'),false);
  J.register('hooky',{def:{title:'Hooky'},perceive:(e)=>log.push('job:'+e.id),noise:n=>log.push('jobnoise:'+n.r),camera:()=>true,interact:()=>({txt:'Do it'}),fire:()=>{throw new Error('boom')},hud:s=>{s.meters=[{id:'a'}]},home:(id,act)=>id==='laptop'?true:undefined});
  const off=J.on('perceive',e=>log.push('sys:'+e.id));J.on('noise',n=>log.push('sysnoise:'+n.r));J.on('fire',()=>true);J.on('hud',s=>{s.meters.push({id:'b'})});
  const warn=console.warn;console.warn=()=>{};
  J.hooks.perceive({id:'e1'},{});assert.deepEqual(log,['sys:e1']);/* not running: only the system handler */
  A.M={def:{id:'hooky'},state:'go'};log.length=0;
  J.hooks.perceive({id:'e1'},{});J.hooks.noise({r:7});assert.deepEqual(log,['job:e1','sys:e1','jobnoise:7','sysnoise:7']);
  assert.equal(J.hooks.camera(1/60),true);assert.deepEqual(J.hooks.interact(null),{txt:'Do it'});
  assert.equal(J.hooks.fire(),true);/* the job's handler threw: the system handler still answered */assert.ok(J.stats.errors>=1);
  const st={};J.hooks.hud(st);assert.deepEqual(st.meters.map(m=>m.id),['a','b']);
  A.M=null;assert.equal(J.hooks.home('laptop'),true);/* home reaches jobs that are not running */assert.equal(J.hooks.home('tv'),false);
  off();log.length=0;J.hooks.perceive({id:'e2'},{});assert.deepEqual(log,[]);console.warn=warn});

test('gating: done ids, trust, Riverside trust, cuffs, flags, when()',()=>{const p={done:new Set(['gary']),trust:30,trustR:10,cuffed:2,flags:{bridge:true}};
  assert.equal(J.lockReason({unlock:{done:['gary']}},p),null);assert.deepEqual(J.lockReason({unlock:{done:['gary','earl']}},p),{why:'locked',need:'earl'});
  assert.equal(J.lockReason({unlock:{trust:40}},p).why,'trust');assert.equal(J.lockReason({unlock:{trustR:20}},p).why,'trustR');assert.equal(J.lockReason({unlock:{cuffed:3}},p).why,'cuffed');
  assert.equal(J.lockReason({unlock:{flags:['bridge']}},p),null);assert.equal(J.lockReason({unlock:{flags:['nope']}},p).why,'flag');assert.equal(J.lockReason({unlock:{when:()=>false}},p).why,'when');
  assert.equal(J.lockReason({unlock:{done:['gary']}},{done:id=>id==='gary'}),null)});

test('medals: bronze when finished, gold capped to silver after a stage retry',()=>{const j={medal:()=>3};assert.equal(J.medalOf(j,{},false),0);assert.equal(J.medalOf(j,{},true),3);
  assert.equal(J.medalOf(j,{retried:true},true),2);assert.equal(J.medalOf({},{},true),1);assert.equal(J.medalOf({medal:()=>0},{},true),1)});

/* the job files, loaded the way the game does (in HT.Jobs.FILES order); a missing file is skipped, an empty stub registers nothing */
function loadFiles(extra){const A={M:null},G=bind(A);const ctx=vm.createContext({window:null,HT:global.HT,console,document:{createElement:()=>({}),getElementById:()=>null},Math,JSON});ctx.window=ctx;
  const res={loaded:[],skipped:[]};for(const f of [...J.FILES,...(extra||[])]){const p=path.join(ROOT,'js/jobs',f+'.js');if(!fs.existsSync(p)){res.skipped.push(f);continue}
    vm.runInContext(fs.readFileSync(p,'utf8'),ctx,{filename:p});res.loaded.push(f)}return Object.assign(res,G)}
test('job files: every SPEC3 file exists, a missing one is skipped, stubs register nothing',()=>{const r=loadFiles(['__does_not_exist__']);
  assert.deepEqual(r.skipped,['__does_not_exist__']);assert.equal(r.loaded.length,J.FILES.length);
  for(const id of ['taxi','blitz','talk','mower','overwatch','sabotage','hoa','tail','tow','cargo','crossing','pawn','cones','moving','arrest','brake','roundup','bike','heist','patrol','porch','carwash','finale'])assert.ok(J.FILES.includes(id),id);
  assert.ok(J.get('porch'),'porch registers');assert.ok(!J.FILES.includes('_template'),'the template never loads in the game')});
test('[CP] every registered job file round-trips its checkpoint state (save -> JSON -> load -> save)',()=>{loadFiles();let n=0;
  for(const j of J.list(j=>!j.builtin)){if(!j.save||(j.test&&j.test.cpNode===false))continue;/* cpNode:false = load() needs the game; dev/jobs-check.js --retry round-trips it in the browser */const M=j.test&&j.test.sample?j.test.sample():null;assert.ok(M,j.id+': provide test.sample() -> a mid-job M for the round trip');
    const r=J.roundTrip(j,M);assert.ok(r.ok,j.id+': '+r.why);n++}assert.ok(n>=1)});
test('the template job is a valid registration',()=>{bind({M:null});const ctx=vm.createContext({HT:global.HT,console});ctx.window=ctx;
  vm.runInContext(fs.readFileSync(path.join(ROOT,'js/jobs/_template.js'),'utf8'),ctx);const j=J.get('template');assert.ok(j&&j.def.stages.length===2&&j.def.obj);
  assert.ok(J.roundTrip(j,{n:2}).ok)});

test('save v2 -> v3: prog.done becomes jobs[id].done with calendar pins',()=>{require('../js/carai.js');const S=require('../js/save.js').Save;S.useStorage(S.memoryStorage());
  const done=[true,true,false,false,false,false,false,false,false];global.localStorage=undefined;
  const st=S.memoryStorage();st.setItem('ht-save',JSON.stringify({v:2,cash:100,prog:{done,trust:30,trustR:5}}));S.useStorage(st);S.load();const d=S.data;
  assert.equal(d.v,3);assert.equal(d.jobs.gary.done,true);assert.equal(d.jobs.rick.done,true);assert.ok(!d.jobs.dave||!d.jobs.dave.done);
  assert.deepEqual(d.calendar.entries.map(e=>e.id).sort(),['gary','rick']);assert.deepEqual(d.prog.done,done);
  const r=S.recordRun(d,'porch',{ok:true,t:60,medal:2,story:false});assert.equal(d.jobs.porch.done,true);assert.equal(r.bonus,0)});
