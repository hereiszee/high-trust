/* =====================================================================
   HT.Jobs: the job registry (SPEC3 4.0). One file per job in js/jobs/<id>.js registers its MISSIONS entry, givers, sites,
   stages and callbacks here; index.html never needs editing for a new job. See docs/JOBS.md for the full guide.

   HT.Jobs.register(id,{def,start,upd,save,load,payout,medal,end, ...hook handlers})
     def      the MISSIONS entry: id, giver, hood, role, title, place, lines, crew, type:'custom', unlock, site, stages, plan, arms, boss,
              radio, endLine, plus registry fields: pay (base $), par (s), from (where the giver stands, see JOBS.md), repeatable,
              night, failPolicy ('escalate'|'soft'), medals (plain-word criteria), winTrust, noGuns
     start    (M,o) -> void            o.checkpoint = a [CP] snapshot or null
     upd      (dt,M,F) -> void         F = {objs,target,holds,taps,prompt,promptP,meters,widgets}
     save     (M) -> JSON-safe job state for a stage checkpoint;  load (M,state) restores it (after start)
     payout   (M,ok) -> [[label,amount],...]   extra lines on the result card
     medal    (M) -> 0..3              0 failed, 1 bronze (finished), 2 silver, 3 gold
     end      (M,ok) -> void           households, storefronts, flags (never called on a replay for story effects: check M.replay)
     result   (M,ok,res) -> void       edit the result card before it shows: res.title (headline), res.text, res.stats [[label,value,sub],...]
     def.payLabel  what the base pay line is called ('Hank's promotion'); def.peaceful (default: noGuns) drops Neutralized/empty Zip-tied
     perceive/noise/vehicle/camera/interact/fire/hud/home   per-job hook handlers, called only while this job runs (home: always)
   HT.Jobs.on(hook,fn)    a system-wide hook handler (stealth, photo, tow...), called for every job and in free roam
   HT.Jobs.item(id,def)   a special held item ('phone','stopSign','toolbelt'): {name,use(M),hud(state)}; fire = use, no ammo
   HT.Jobs.hooks          the dispatcher index.html calls: hooks.perceive(e,world) ... (see JOBS.md "Hook reference")
   Pure logic (no THREE, no DOM): dev/jobs-registry.test.js loads it in Node.
   ===================================================================== */
(function(root){'use strict';
const HT=root.HT=root.HT||{};
const HOOKS=['perceive','noise','vehicle','camera','interact','fire','hud','home','pose'];
const jobs=new Map(),items=new Map(),sys={};for(const h of HOOKS)sys[h]=[];
let G=null;/* glue from index.html: {MISSIONS, catalog, onRegister(job), active()} */
const pending=[];const stats={fired:{},errors:0};for(const h of HOOKS)stats.fired[h]=0;
const isFn=f=>typeof f==='function';
function warn(where,e){stats.errors++;try{console.warn('[jobs] '+where,e)}catch(_){}}
/* the MISSIONS entry for a registered job: defaults filled so the core mission code can treat it like any other */
function normDef(id,def){const d=Object.assign({id,giver:'gary',hood:'maple',role:'',title:id,place:'',lines:[],crew:[],weapons:['pistol'],type:'custom',radio:[],
  pay:400,par:0,stages:null,failPolicy:'escalate',repeatable:false,night:false},def||{});d.id=id;d.reg=true;d.type=d.type||'custom';
  if(!Array.isArray(d.crew))d.crew=[];if(!Array.isArray(d.radio))d.radio=[];if(!Array.isArray(d.lines))d.lines=[];if(!Array.isArray(d.weapons))d.weapons=['pistol'];return d}
function register(id,spec){if(!id||typeof id!=='string')throw new Error('HT.Jobs.register: id required');spec=spec||{};
  if(jobs.has(id)){const j=jobs.get(id);if(!j.builtin)return j;/* a file may wrap a built-in: its callbacks win, the MISSIONS entry stays */}
  const prev=jobs.get(id),j=Object.assign({},prev||{},spec,{id,builtin:false});j.def=prev&&prev.builtin?prev.def:normDef(id,spec.def);
  if(prev&&prev.builtin&&spec.def)Object.assign(j.def,spec.def,{id});
  jobs.set(id,j);if(G)attach(j);else pending.push(j);return j}
function attach(j){if(!j.builtin&&!j.def.__pushed&&!G.MISSIONS.includes(j.def)){j.def.__pushed=true;G.MISSIONS.push(j.def)}
  j.index=G.MISSIONS.indexOf(j.def);
  /* the economy's mission table (js/save.js HT.CATALOG.missions) gets the base pay and par so computePayout prices it by id */
  const C=G.catalog;if(C&&!j.builtin&&!C.some(m=>m.id===j.id))C.push({id:j.id,giver:j.def.giver,who:j.def.giver,title:j.def.title,base:j.def.pay,par:j.def.par||0,hood:j.def.hood,bonus:[]});if(C&&!j.builtin&&j.def.payLabel){const e=C.find(m=>m.id===j.id);if(e)e.payLabel=j.def.payLabel}
  try{G.onRegister&&G.onRegister(j)}catch(e){warn('onRegister '+j.id,e)}}
/* index.html wraps the nine built-in jobs (MISSIONS + WJ) so every job goes through the same path */
function wrap(id,def,cb){const j=Object.assign({id,builtin:true,def},cb||{});def.reg=def.reg||false;jobs.set(id,j);if(G)j.index=G.MISSIONS.indexOf(def);return j}
function bind(glue){G=glue;for(const j of jobs.values())if(j.builtin)j.index=G.MISSIONS.indexOf(j.def);while(pending.length)attach(pending.shift())}
function on(h,fn){if(!sys[h])throw new Error('HT.Jobs.on: unknown hook '+h);sys[h].push(fn);return()=>{const a=sys[h],k=a.indexOf(fn);if(k>=0)a.splice(k,1)}}
function item(id,def){items.set(id,Object.assign({id},def||{}));return items.get(id)}
const get=id=>jobs.get(id)||null;
function list(f){return[...jobs.values()].filter(j=>!f||f(j))}
const active=()=>{if(!G||!G.active)return null;const M=G.active();if(!M||!M.def)return null;return jobs.get(M.def.id)||null};
/* run a hook: the active job's handler first, then every system handler. First non-undefined result wins for camera/interact/fire/home. */
function run(h,args){stats.fired[h]++;let out;const j=active();
  if(j&&isFn(j[h])){try{const r=j[h].apply(j,args);if(r!==undefined)out=r}catch(e){warn(h+' '+j.id,e)}}
  for(const fn of sys[h]){try{const r=fn.apply(null,args);if(out===undefined&&r!==undefined)out=r}catch(e){warn(h,e)}}
  return out}
/* home(id) is also offered to jobs that are NOT running (the laptop, Jen's fridge note, Doug's corkboard start jobs from home) */
function runHome(id){stats.fired.home++;let out;const a=active();
  for(const j of jobs.values()){if(!isFn(j.home))continue;try{const r=j.home(id,j===a);if(out===undefined&&r!==undefined&&r!==false)out=r}catch(e){warn('home '+j.id,e)}}
  for(const fn of sys.home){try{const r=fn(id);if(out===undefined&&r!==undefined&&r!==false)out=r}catch(e){warn('home',e)}}
  return out}
const hooks={
  perceive:(e,world)=>{if(!sys.perceive.length&&!(active()||{}).perceive)return;run('perceive',[e,world])},
  noise:n=>{if(!sys.noise.length&&!(active()||{}).noise)return;run('noise',[n])},
  vehicle:(car,dt)=>{if(!sys.vehicle.length&&!(active()||{}).vehicle)return;run('vehicle',[car,dt])},
  camera:dt=>{if(!sys.camera.length&&!(active()||{}).camera)return false;return!!run('camera',[dt])},
  interact:prompt=>{if(!sys.interact.length&&!(active()||{}).interact)return null;const r=run('interact',[prompt]);return r==null?null:r},
  fire:()=>{if(!sys.fire.length&&!(active()||{}).fire)return false;return!!run('fire',[])},
  hud:state=>{if(!sys.hud.length&&!(active()||{}).hud)return;run('hud',[state])},
  home:id=>!!runHome(id),
  /* 9th hook (added for wave 1): after HT.People.update each frame, before the draw, so a job/system can layer poses (Small Talk tells) */
  pose:dt=>{if(!sys.pose.length&&!(active()||{}).pose)return;run('pose',[dt])}};
/* gating (SPEC3 3.1): unlock {done:[ids], trust, trustR, cuffed, flags:[...]} against a progress view {done:Set|fn, trust, trustR, cuffed, flags} */
function lockReason(def,p){const u=def.unlock||{};const has=isFn(p.done)?p.done:id=>p.done&&p.done.has?p.done.has(id):!!(p.done&&p.done[id]);
  for(const id of [].concat(u.done||[]))if(!has(id))return{why:'locked',need:id};
  if(u.trust!=null&&(p.trust||0)<u.trust)return{why:'trust',need:u.trust};
  if(u.trustR!=null&&(p.trustR||0)<u.trustR)return{why:'trustR',need:u.trustR};
  if(u.cuffed!=null&&(p.cuffed||0)<u.cuffed)return{why:'cuffed',need:u.cuffed};
  for(const f of [].concat(u.flags||[]))if(!(p.flags&&p.flags[f]))return{why:'flag',need:f};
  if(isFn(u.when)&&!u.when(p))return{why:'when',need:null};
  return null}
/* medal fallbacks: finished = bronze */
function medalOf(j,M,ok){if(!ok)return 0;let m=1;if(j&&isFn(j.medal)){try{m=j.medal(M)|0}catch(e){warn('medal '+j.id,e);m=1}}if(m<1)m=1;if(M&&M.retried&&m>2)m=2;/* gold requires no stage retry (4.7) */return Math.min(3,m)}
/* [CP] job-state round trip check (used by dev/cp.test.js and dev/jobs-registry.test.js) */
function roundTrip(j,M){if(!isFn(j.save))return{ok:true,skipped:true};const s=j.save(M),txt=JSON.stringify(s);if(txt&&txt.length>16384)return{ok:false,why:'checkpoint over 16 KB ('+txt.length+')'};
  const back=JSON.parse(txt==null?'null':txt);if(isFn(j.load))j.load(M,back);const again=JSON.stringify(j.save(M));return{ok:again===txt,why:again===txt?null:'save/load mismatch',bytes:txt?txt.length:0}}
/* job files: everything SPEC3 plans, so later waves never touch index.html. A file that is missing or empty just never registers. */
const FILES=['_stops','_race','_escort','_props','_runner',
  'taxi','blitz','talk','mower','overwatch','sabotage','hoa','tail','tow','cargo','crossing','pawn','cones','moving','arrest',
  'brake','roundup','bike','heist','patrol','porch','carwash','finale'];
HT.Jobs={register,wrap,bind,on,item,get,list,active,hooks,lockReason,medalOf,roundTrip,HOOKS,FILES,stats,items,
  get bound(){return!!G},_reset(){jobs.clear();items.clear();pending.length=0;for(const h of HOOKS)sys[h].length=0;G=null}};
if(typeof module!=='undefined'&&module.exports)module.exports=HT.Jobs;
})(typeof window!=='undefined'?window:globalThis);
