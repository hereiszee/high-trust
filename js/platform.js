/* High Trust · HT.Platform / HT.Steam — the thin layer between the game and the desktop shell (desktop/, docs/steam/BUILD.md).
   On the web every call here is a no-op: window.HTDesktop only exists inside the Electron shell (desktop/preload.js).
     HT.Steam.unlock(id)      the one achievement entry point (ids in HT.Steam.ACHIEVEMENTS, docs/steam/achievements.md)
     HT.Steam.check(save)     evaluates every achievement against the save; runs on each HT.Save 'saved'/'load' event, which fire on
                              job completion, medals, the finale, egg finds, purchases. Steam's unlock is idempotent, so re-checking is free.
     HT.Steam.presence()      rich presence: where you are and what job you're on (refreshed every few seconds)
   Desktop extras: a "Quit to desktop" pause/title button (js/hud.js shows it when HTDesktop exists), Display mode and VSync settings.
   Loaded after the game script, so window.__ht (the game) and its HUD exist. Node: module.exports = {ACHIEVEMENTS, evaluate}. */
(function(root){
'use strict';
/* id: the Steamworks API name. test(s): s = HT.Save.data. Keep docs/steam/achievements.md in step. */
const J=(s,id)=>!!(s.jobs&&s.jobs[id]&&s.jobs[id].done);
const doneCount=s=>Object.values(s.jobs||{}).filter(j=>j&&j.done).length;
const golds=s=>Object.values(s.jobs||{}).filter(j=>j&&(j.medal|0)>=3).length;
const eggs=s=>Object.keys(s.base&&s.base.eggs||{}).length;
const ACHIEVEMENTS=[
  {id:'ACH_FIRST_JOB',name:'Clocked In',desc:'Finish your first job.',test:s=>doneCount(s)>=1},
  {id:'ACH_RETURN_TO_SENDER',name:'Return to Sender',desc:"Get the neighborhood's packages back from the chop shop on Industrial Way.",test:s=>J(s,'gary')},
  {id:'ACH_FOURTH_QUARTER',name:'Fourth Quarter',desc:'Smash the stash tables in the duplex on Birch before the clock runs out.',test:s=>J(s,'rick')},
  {id:'ACH_BLOCK_PARTY',name:'Block Party',desc:'Hold Linden Park through every wave.',test:s=>J(s,'dave')},
  {id:'ACH_KINGPIN',name:'The Kingpin',desc:'Find the Porch Pirate King and give him the chance to surrender.',test:s=>J(s,'doug')},
  {id:'ACH_BRIDGE',name:'Over the Bridge',desc:'Open the bridge to Riverside.',test:s=>!!(s.world&&s.world.bridgeOpen)},
  {id:'ACH_RIVERSIDE',name:'Riverside Regular',desc:'Finish End of the Line, Fellowship Hall, Garden Variety and Brain Freeze.',test:s=>['earl','dee','rosa','benny'].every(id=>J(s,id))},
  {id:'ACH_THE_DUKE',name:'The Duke',desc:'Bring down the Duke.',test:s=>J(s,'duke')},
  {id:'ACH_PORCH_LIGHT',name:'Porch Light',desc:'Finish Porch Light.',test:s=>J(s,'porch')},
  {id:'ACH_DAD_TAXI',name:'Dad Taxi',desc:'Finish Dad Taxi.',test:s=>J(s,'taxi')},
  {id:'ACH_EXHIBIT_HOA',name:'Exhibit HOA',desc:'Finish Exhibit HOA.',test:s=>J(s,'hoa')},
  {id:'ACH_BUSY_WEEKEND',name:'Busy Weekend',desc:'Finish 15 different jobs.',test:s=>doneCount(s)>=15},
  {id:'ACH_EVERYBODY_WAVES',name:'Everybody Waves',desc:'See the festival through to the end.',test:s=>!!(s.flags&&s.flags.festival)||J(s,'finale')},
  {id:'ACH_GOLD_STAR',name:'Gold Star',desc:'Earn a gold medal on any job.',test:s=>golds(s)>=1},
  {id:'ACH_HONOR_ROLL',name:'Honor Roll',desc:'Earn gold medals on 10 jobs.',test:s=>golds(s)>=10},
  {id:'ACH_DUE_PROCESS',name:'Due Process',desc:'Zip-tie 25 people who gave up.',test:s=>(s.prog&&s.prog.cuffed|0)>=25},
  {id:'ACH_DOORS_UNLOCKED',name:'Doors Unlocked',desc:'Raise Maple Heights trust to 80%.',test:s=>(s.prog&&+s.prog.trust||0)>=80},
  {id:'ACH_SIDE_HUSTLE',name:'Side Hustle',desc:'Earn $10,000 in total.',test:s=>(s.stats&&+s.stats.earned||0)>=10000},
  {id:'ACH_FIRST_FIND',name:'Things Your Dad Found',desc:'Find your first easter egg.',test:s=>eggs(s)>=1},
  {id:'ACH_PROOF',name:'Proof',desc:'Hit the cardboard Bigfoot on the range berm.',test:s=>!!(s.base&&s.base.eggs&&s.base.eggs.bigfoot)},
  {id:'ACH_SEEN_IT_ALL',name:'Seen It All',desc:'Find all seven things around town.',test:s=>eggs(s)>=7},
  {id:'ACH_CLEARED_FOR_TAKEOFF',name:'Cleared for Takeoff',desc:'Take the jet up at Fort Sensible.',test:s=>(s.base&&s.base.jet&&s.base.jet.flights|0)>=1},
  {id:'ACH_BORROWED',name:'Borrowed, Technically',desc:'Borrow the tank at Fort Sensible.',test:s=>(s.base&&s.base.tank&&s.base.tank.borrows|0)>=1}];
function evaluate(s){if(!s||typeof s!=='object')return[];const out=[];for(const a of ACHIEVEMENTS){try{if(a.test(s))out.push(a.id)}catch(e){}}return out}
if(typeof module!=='undefined'&&module.exports){module.exports={ACHIEVEMENTS,evaluate};if(typeof window==='undefined')return}

const HT=root.HT=root.HT||{};
const D=root.HTDesktop||null,ST=D&&D.steam&&D.steam.available?D.steam:null;
const Platform=HT.Platform={desktop:!!D,steam:!!ST,shell:D?D.shell:'web'};
const sent=new Set();
const Steam=HT.Steam={ACHIEVEMENTS,evaluate,get available(){return !!ST},
  unlock(id){if(!ST||sent.has(id))return;sent.add(id);try{ST.unlock(id).then(ok=>{if(!ok)sent.delete(id)},()=>sent.delete(id))}catch(e){sent.delete(id)}},
  check(s){if(!ST)return[];const got=evaluate(s||(HT.Save&&HT.Save.data));for(const id of got)Steam.unlock(id);return got},
  presence(){if(!ST)return;const g=root.__ht;if(!g)return;let txt='In the menus';
    try{const mode=g.mode,M=g.M,hood=g.region==='river'?'Riverside':'Maple Heights';
      if(mode==='mission'&&M&&M.def)txt='On a job: '+M.def.title;else if(mode==='home')txt='At home';else if(mode==='hub')txt=(g.CV?'Driving around ':'Out and about in ')+hood}catch(e){}
    if(txt===Steam._last)return;Steam._last=txt;ST.presence('status',txt);ST.presence('text',txt);ST.presence('steam_display','#Status')}};
if(ST&&HT.Save&&HT.Save.on){HT.Save.on('saved',d=>Steam.check(d));HT.Save.on('load',d=>Steam.check(d));setTimeout(()=>Steam.check(),3000);setInterval(()=>Steam.presence(),5000);Steam.presence()}

if(!D)return;
/* ---------- desktop shell only ---------- */
document.documentElement.classList.add('ht-desktop');if(D.deck)document.documentElement.classList.add('ht-deck');
/* Steam Deck, first run (no saved Graphics choice): Auto starts a rung lower (Medium at 85% resolution) and climbs if frames allow */
if(D.deck){try{const c=JSON.parse(D.storage.getItem('ht-cfg')||'{}');const R=root.__ht&&root.__ht.render;
  if((!c.gfx||c.gfx==='auto')&&R&&R.auto&&R.apply){R.auto.i=Math.max(R.auto.i,2);R.apply('auto')}}catch(e){}}
const HUD=root.__ht&&root.__ht.HUD;
if(HUD){
  const disp=HUD.settingsSchema.find(g=>g.tab==='display'&&g.h==='Graphics');
  const i=HUD.settingsSchema.indexOf(disp);
  HUD.settingsSchema.splice(i+1,0,{tab:'display',h:'Window',items:[
    {k:'dispMode',l:'Display mode',type:'seg',opts:[['full','Fullscreen'],['win','Windowed']],sub:'F11 or Alt+Enter switches any time'},
    {k:'vsync',l:'VSync',type:'bool',sub:'Off lifts the display limit (use with a frame rate cap) · applies after a restart'},
    {k:'uiScale',l:'Interface size',type:'seg',opts:[['1','100%'],['1.1','110%'],['1.25','125%']],sub:'Bigger HUD and menu text (Steam Deck starts at 110%)'}]});
  HUD.settings={dispMode:D.desktop.fullscreen===false?'win':'full',vsync:D.desktop.vsync!==false,uiScale:String(D.desktop.uiScale||1)};
  D.onFullscreen(on=>{HUD.settings={dispMode:on?'full':'win'};const sg=document.querySelector('.ht-seg3[data-k=dispMode]');if(sg)sg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===(on?'full':'win')))});
  HUD.on('setting',(k,v)=>{if(k==='dispMode')D.fullscreen(v==='full');else if(k==='vsync')D.setDesktop('vsync',!!v);else if(k==='uiScale')D.setDesktop('uiScale',+v)});
  HUD.on('action',a=>{if(a!=='quitDesktop')return;try{HT.Save&&HT.Save.flush&&HT.Save.flush()}catch(e){}try{D.flush()}catch(e){}D.quit()});
}
/* alt-tab / minimise: pause, like a PC game should (the shell keeps rendering in the background) */
const pauseNow=()=>{const I=HT.Input;if(I&&I.running&&!I.paused&&I.mode!=='title')document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))};
addEventListener('blur',pauseNow);
/* hidden (minimised, Steam overlay full screen, Deck suspend), or the machine going to sleep: pause and write the save */
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseNow();try{HT.Save&&HT.Save.flush&&HT.Save.flush()}catch(e){}}});
if(D.onSuspend)D.onSuspend(()=>{pauseNow();try{HT.Save&&HT.Save.flush&&HT.Save.flush()}catch(e){}});
/* last chance to write a pending debounced save (Alt+F4, window close) */
addEventListener('beforeunload',()=>{try{HT.Save&&HT.Save.flush&&HT.Save.flush()}catch(e){}try{D.flush()}catch(e){}});
})(typeof window!=='undefined'?window:globalThis);
