/* =====================================================================
   HT.Plan (SPEC3 4.5 [ROLES]): the crew-roles planning board. Owned by Good Fences (js/jobs/heist.js loads it); reusable by the finale
   and any job that wants "who does what, how do we get in, what did we bring, and what will happen" on one card.

   PURE PART (Node-safe: dev tests and dev/jobs-registry.test.js can load it without a DOM)
     HT.Plan.APT                     the default aptitude table {crewId:{roleId:1..3}} (SPEC3 4.5, extended with Good Fences' roles)
     HT.Plan.stars(def,cid,rid,ctx)  aptitude, +1 in the crew member's best role when their strand perk is on (ctx.perks[cid]), max 3
     HT.Plan.effect(def,rid,stars)   def.effects[rid][stars-1] (a number or an object): what a role does at that skill
     HT.Plan.locks(def,ctx)          {entryId: 'reason'|null} from entry.req {photo:[ids], gear:[ids], any:[req,...], not:[flag ids], why:'...'}
                                     ctx = {photo:{id:true}, gear:{id:true}, flags:{id:true}}
     HT.Plan.check(def,state,ctx)    {ok, missing:[roleIds], entry:'reason'|null, why}  (one crew per role, every need>0 role filled,
                                     an unlocked entry when the def has entries)
     HT.Plan.clean(def,state,ctx)    a state with unknown crew/roles dropped, duplicates removed and a locked entry cleared
     HT.Plan.auto(def,ctx)           a sensible default assignment (best stars first) for a first look or a bot

   BROWSER PART
     const h=HT.Plan.open({def, state:{assign,entry}, ctx, kicker, title, you:'text about the player's own role', intel:[{label,ok,note}],
                           forecast:(state)=>[text|{text,tone}], onChange(state), onGo(state), onBack()})
       mounts HUD.kit.roles as the 'plan' overlay, adds an intel strip and a "you" line, releases the mouse pointer (so the card can be
       clicked; keys 1-9 / Enter / Esc work too) and takes it back on close. h.set(state) h.get() h.close() h.key(code) (bots)
     HT.Plan.isOpen()
     HT.Plan.save(jobId,state) / HT.Plan.load(jobId)   SAVE.jobs[jobId].plan (survives retries and reloads)

   Def shape (what a job passes):
     {roles:[{id,label,desc,need}], crew:[{id,name,color}], entries:[{id,label,req,desc}], gear:[{id,label,where,does}],
      apt:{crewId:{roleId:n}} (optional; HT.Plan.APT otherwise), effects:{roleId:[v1,v2,v3]}}
   ===================================================================== */
(function(root){'use strict';
const HT=root.HT=root.HT||{};if(HT.Plan&&HT.Plan._ver)return;

/* ---- aptitudes (1-3 stars). SPEC3 4.5's table, plus the Good Fences roles: lookout, driver, lifter, distraction ---- */
const APT={
  gary:{driver:1,lookout:2,muscle:1,talker:2,tech:3,lifter:1,distraction:3},
  rick:{driver:3,lookout:2,muscle:2,talker:2,tech:1,lifter:2,distraction:2},
  dave:{driver:2,lookout:1,muscle:3,talker:2,tech:1,lifter:3,distraction:2},
  doug:{driver:2,lookout:3,muscle:2,talker:1,tech:2,lifter:1,distraction:2},
  rosa:{driver:2,lookout:2,muscle:2,talker:2,tech:1,lifter:2,distraction:2},
  earl:{driver:3,lookout:2,muscle:1,talker:3,tech:1,lifter:1,distraction:3}};

const has=(o,k)=>!!(o&&o[k]);
function aptOf(def,cid,rid){const t=(def&&def.apt)||APT;const row=t[cid]||APT[cid]||{};return row[rid]||1}
function bestRole(def,cid){const roles=(def&&def.roles)||[];let b=null,bs=-1;for(const r of roles){const s=aptOf(def,cid,r.id);if(s>bs){bs=s;b=r.id}}return b}
function stars(def,cid,rid,ctx){let s=aptOf(def,cid,rid);if(ctx&&ctx.perks&&ctx.perks[cid]&&bestRole(def,cid)===rid)s++;return Math.max(1,Math.min(3,s))}
function effect(def,rid,s){const e=def&&def.effects&&def.effects[rid];if(!e)return null;return e[Math.max(1,Math.min(3,s|0))-1]}
/* one requirement: photo/gear/flags all present, none of 'not', or any one of a list of alternatives */
function reqWhy(req,ctx){if(!req)return null;ctx=ctx||{};
  for(const id of req.not||[])if(has(ctx.flags,id))return (req.notWhy&&req.notWhy[id])||req.why||'Not any more';
  for(const id of req.photo||[])if(!has(ctx.photo,id))return req.why||'Scope it first: no photo of the '+id;
  for(const id of req.gear||[])if(!has(ctx.gear,id))return req.why||'Missing gear: '+id;
  for(const id of req.flags||[])if(!has(ctx.flags,id))return req.why||'Not yet';
  if(req.any){let first=null;for(const r of req.any){const w=reqWhy(r,ctx);if(!w)return null;if(!first)first=w}return req.why||first}
  return null}
function locks(def,ctx){const o={};for(const e of(def&&def.entries)||[])o[e.id]=reqWhy(e.req,ctx);return o}
function clean(def,state,ctx){const roles=(def&&def.roles)||[],crew=(def&&def.crew)||[],out={assign:{},entry:null},used={};state=state||{};
  for(const r of roles){const c=state.assign&&state.assign[r.id];if(c&&crew.some(x=>x.id===c)&&!used[c]){out.assign[r.id]=c;used[c]=1}}
  const lk=locks(def,ctx);if(state.entry&&(def.entries||[]).some(e=>e.id===state.entry)&&!lk[state.entry])out.entry=state.entry;return out}
function check(def,state,ctx){const s=clean(def,state,ctx),roles=(def&&def.roles)||[];
  const missing=roles.filter(r=>(r.need||0)>0&&!s.assign[r.id]).map(r=>r.id);
  const es=(def&&def.entries)||[];let entry=null;if(es.length){if(!state||!state.entry)entry='Pick a way in';else{const lk=locks(def,ctx);entry=lk[state.entry]||(s.entry?null:'Pick a way in')}}
  const ok=!missing.length&&!entry;return{ok,missing,entry,why:ok?'Ready when you are':missing.length?'Needs '+missing.map(id=>(roles.find(r=>r.id===id)||{}).label||id).join(', '):entry}}
/* greedy: the highest-star pairing first, ties broken by role order */
function auto(def,ctx){const roles=(def&&def.roles)||[],crew=(def&&def.crew)||[],pairs=[];
  roles.forEach((r,ri)=>crew.forEach((c,ci)=>pairs.push({r:r.id,c:c.id,s:stars(def,c.id,r.id,ctx),ri,ci})));
  pairs.sort((a,b)=>b.s-a.s||a.ri-b.ri||a.ci-b.ci);const assign={},used={};for(const p of pairs){if(assign[p.r]||used[p.c])continue;assign[p.r]=p.c;used[p.c]=1}
  const lk=locks(def,ctx),e=((def&&def.entries)||[]).find(x=>!lk[x.id]);return{assign,entry:e?e.id:null}}

const Plan={_ver:1,APT,stars,effect,locks,check,clean,auto,reqWhy,bestRole};
HT.Plan=Plan;
if(typeof module!=='undefined'&&module.exports)module.exports=Plan;

/* ---------------- persistence ---------------- */
Plan.save=function(job,state){try{const S=HT.Save,s=S&&S.get?S.get():null;const sv=s||(HT.Jobs&&HT.Jobs.api&&HT.Jobs.api.SV&&HT.Jobs.api.SV());if(!sv)return false;
  const rec=S&&S.jobRec?S.jobRec(sv,job):((sv.jobs=sv.jobs||{})[job]=sv.jobs[job]||{});rec.plan={assign:Object.assign({},state&&state.assign||{}),entry:state&&state.entry||null};return true}catch(_){return false}};
Plan.load=function(job){try{const S=HT.Save,sv=(S&&S.get&&S.get())||(HT.Jobs&&HT.Jobs.api&&HT.Jobs.api.SV&&HT.Jobs.api.SV());const p=sv&&sv.jobs&&sv.jobs[job]&&sv.jobs[job].plan;
  return p&&p.assign?{assign:Object.assign({},p.assign),entry:p.entry||null}:null}catch(_){return null}};

/* ---------------- browser: the card ---------------- */
const hasDOM=typeof document!=='undefined'&&!!document.createElement;
if(!hasDOM)return;
(function css(){if(document.getElementById('ht-plan-css'))return;const l=document.createElement('link');l.id='ht-plan-css';l.rel='stylesheet';l.href='css/plan.css';document.head.appendChild(l)})();
let CUR=null;
Plan.isOpen=()=>!!CUR;
/* the game pauses when it loses the pointer unless a menu says it's open: say so while the board is up (index.html checks HT.Menus.isOpen) */
let GRACE=false;/* the pointer-lock exit we asked for may land after a quick close: it still isn't the player leaving */
function guardMenus(){const Mn=HT.Menus=HT.Menus||{};if(Mn._planWrapped)return;const orig=Mn.isOpen;Mn.isOpen=function(){return!!CUR||GRACE||(typeof orig==='function'?!!orig.apply(this,arguments):false)};Mn._planWrapped=true;
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)GRACE=false})}
function canvas(){const H=root.__ht;return(H&&H.renderer&&H.renderer.domElement)||document.querySelector('canvas')}
function releasePointer(){try{if(document.pointerLockElement){GRACE=true;document.exitPointerLock()}}catch(_){}}
function takePointer(){const coarse=root.matchMedia&&root.matchMedia('(pointer:coarse)').matches;if(coarse)return;const c=canvas();if(!c||document.pointerLockElement===c)return;
  /* only from a real key press or click (a synthetic event can't take the pointer, and a refused request must not look like the player leaving) */
  if(typeof navigator!=='undefined'&&navigator.userActivation&&!navigator.userActivation.isActive)return;
  try{const r=c.requestPointerLock();if(r&&r.catch)r.catch(()=>{})}catch(_){}}
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function starStr(n){return'★'.repeat(n)+'☆'.repeat(3-n)}

Plan.open=function(o){o=o||{};if(CUR)CUR.close(true);const HUD=root.HUD||(root.__ht&&root.__ht.HUD)||(HT.Jobs&&HT.Jobs.api&&HT.Jobs.api.HUD);
  if(!HUD||!HUD.kit||!HUD.kit.roles)return null;guardMenus();
  const def=o.def||{},ctx=o.ctx||{};let state=clean(def,o.state||{},ctx);
  const lk=locks(def,ctx);
  const crew=(def.crew||[]).map(c=>({id:c.id,name:c.name,color:c.color,stars:Object.fromEntries((def.roles||[]).map(r=>[r.id,stars(def,c.id,r.id,ctx)]))}));
  const entries=()=>(def.entries||[]).map(e=>({id:e.id,label:e.label,lock:lk[e.id]||null}));
  const gear=(def.gear||[]).map(g=>({id:g.id,label:g.label,where:g.where,have:has(ctx.gear,g.id)}));
  const fc=s=>{try{return o.forecast?o.forecast(s)||[]:[]}catch(e){console.warn('[plan] forecast',e);return[]}};
  let closed=false;
  const kit=HUD.kit.roles({kicker:o.kicker||'The plan',title:o.title||'Who does what',roles:def.roles||[],crew,assign:state.assign,entries:entries(),entry:state.entry,gear,
    forecast:fc(state),goLabel:o.goLabel||"Let's go",backLabel:o.backLabel||'Not yet',
    onChange:s=>{state=clean(def,s,ctx);kit.set({forecast:fc(state)});paintExtras();if(o.onChange)try{o.onChange(state)}catch(e){console.warn(e)}},
    onGo:s=>{const st=clean(def,s,ctx);if(!check(def,st,ctx).ok)return;state=st;h.close();if(o.onGo)try{o.onGo(st)}catch(e){console.error(e)}},
    onBack:o.onBack?()=>{h.close();try{o.onBack(state)}catch(e){console.error(e)}}:null});
  const el=kit.el;el.classList.add('htp');
  /* extras: the intel strip (what the scouting turned up) and the player's own role */
  const pn=el.querySelector('.pn'),ph=el.querySelector('.ph');
  const extra=document.createElement('div');extra.className='htp-x';ph&&ph.appendChild(extra);
  function paintExtras(){const intel=(typeof o.intel==='function'?o.intel(state):o.intel)||[];
    extra.innerHTML=(o.you?`<div class="htp-you"><b>You</b><span>${esc(o.you)}</span></div>`:'')+
      (intel.length?`<div class="htp-intel">${intel.map(i=>`<span class="htp-i${i.ok?' ok':''}" title="${esc(i.note||'')}"><i></i>${esc(i.label)}</span>`).join('')}</div>`:'');
    /* the gear rows say what each item does */
    const rows=el.querySelectorAll('.s-gr .gi');(def.gear||[]).forEach((g,i)=>{const r=rows[i];if(!r||!g.does||r.querySelector('.htp-does'))return;const d=document.createElement('span');d.className='htp-does';d.textContent=g.does;r.appendChild(d)});
    /* entries: a one-line description under each */
    const es=el.querySelectorAll('.s-en .er');(def.entries||[]).forEach((e,i)=>{const r=es[i];if(!r||!e.desc||r.querySelector('.htp-ed'))return;const d=document.createElement('span');d.className='htp-ed';d.textContent=e.desc;const tx=r.querySelector('.tx');(tx||r).appendChild(d)})}
  /* keys: ours while the board is up (the HUD's own capture skips while a "menu" is open, and the game must not see 1-9 / WASD / Esc) */
  const onKey=ev=>{if(closed)return;const k=ev.key;
    if(ev.type==='keydown'){const used=kit.el.htKey?kit.el.htKey(ev):false;ev.stopImmediatePropagation();if(used||/^[1-9]$/.test(k)||k==='Enter'||k==='Escape'||k===' ')ev.preventDefault();
      /* after a re-render the extras need repainting */paintExtras()}else ev.stopImmediatePropagation()};
  addEventListener('keydown',onKey,true);addEventListener('keyup',onKey,true);
  /* clicks inside the card: the kit handles them; after any click repaint the extras (the kit re-renders its sections) */
  el.addEventListener('click',()=>setTimeout(paintExtras,0));
  HUD.overlay('plan',el);releasePointer();paintExtras();
  const h={el,kit,
    get:()=>clean(def,kit.get(),ctx),
    set(s){state=clean(def,s,ctx);kit.set({assign:state.assign,entry:state.entry,forecast:fc(state)});paintExtras();return h},
    check:()=>check(def,h.get(),ctx),
    /* bots and tests: the same path as a key press */
    key(code){const ev=new KeyboardEvent('keydown',{key:code,code:/^[1-9]$/.test(code)?'Digit'+code:code,bubbles:true,cancelable:true});dispatchEvent(ev);return h},
    close(silent){if(closed)return;closed=true;removeEventListener('keydown',onKey,true);removeEventListener('keyup',onKey,true);try{HUD.overlay('plan',null)}catch(_){}if(CUR===h)CUR=null;if(!silent)takePointer()}};
  CUR=h;return h};
})(typeof window!=='undefined'?window:globalThis);
