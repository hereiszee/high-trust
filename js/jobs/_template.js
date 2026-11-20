/* =====================================================================
   TEMPLATE JOB: copy to js/jobs/<id>.js (the id must be in HT.Jobs.FILES; every SPEC3 id already is). Never edit index.html.
   The game loads job files after Stage A. This file is NOT in the list, so it never registers in the game; node tests use it.
   Read docs/JOBS.md first: registry fields, the eight hooks, HT.Jobs.api, [CP] stages, payout/medals, the test harness.
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;
const A=()=>J.api;/* the curated game surface: A().P, A().M, A().radio(...), A().CP.mark(...) ... (resolved at call time) */
J.register('template',{
  def:{giver:'gary',hood:'maple',title:'Template Job',role:'Gary · The Accountant',place:'Linden Park',
    lines:["Line one of the brief.","Line two.","Line three: what you do and why it matters."],
    obj:'One sentence: what the player does.',            /* the brief card's "Job" line */
    crew:['gary'],weapons:['pistol'],
    from:{place:'g_gary'},                                 /* giver: a WORLD.places key, {tile:[x,z]}, {x,z}, or {home:'laptop'|'fridge'|...} */
    start:{place:'park'},                                  /* where the job begins (dest ring); default: its site's ring, else the giver */
    site:null,                                             /* a WORLD.sites id to activate (items, spawns, nav window); null = none */
    unlock:{done:['gary']},                                /* {done:[ids],trust,trustR,cuffed,flags:[...],when:p=>bool} */
    pay:300,par:180,                                       /* base pay ($) and par time (s) for the "Quick work" line */
    stages:['setup','main'],stageLabels:{setup:'Setup',main:'The main event'},
    failPolicy:'escalate',                                 /* stealth broken: 'escalate' (fight, lose clean) or 'soft' (fail to the checkpoint) */
    medals:['Finished','Under 2:00','Under 1:30 and nobody hurt'],
    repeatable:false,night:false,order:50,
    radio:[['gary',"Okay. Here's the plan."]],endLine:"Gary: Spreadsheet updated."},
  start(M,o){M.n=0;if(o&&o.checkpoint)return;/* fresh start; a checkpoint retry gets load() right after this */},
  upd(dt,M,F){const a=A();
    if(M.stage==='setup'&&M.elapsed>2)a.CP.mark('main');  /* each stage starts with CP.mark(stage) */
    F.objs.push(['Do the thing · '+M.n+'/3',M.n>=3]);
    F.taps.push({x:a.P.pos.x+2,z:a.P.pos.z,r:3,txt:'Do the thing',fn:()=>{M.n++}});/* press E (holds: F.holds with time) */
    F.meters.push({id:'n',label:'Things',v:M.n,max:3,style:'pips'});
    F.widgets.push({id:'t',kind:'timer',label:'Time',v:Math.max(0,120-M.elapsed),hot:M.elapsed>100});
    M.exitOpen=M.n>=3},                                  /* exitOpen: back to your ride ends the job */
  save:M=>({n:M.n}),load:(M,s)=>{M.n=s.n},
  payout:(M,ok)=>ok?[['Things done ×'+M.n,20*M.n]]:[],
  medal:M=>M.elapsed<90?3:M.elapsed<120?2:1,
  end(M,ok){/* story effects only (households, storefronts, flags): never runs on a replay */},
  /* optional per-job hooks: perceive(e,world) noise(n) vehicle(car,dt) camera(dt)->bool interact(prompt)->{txt,fn}|null fire()->bool hud(state) home(id)->bool */
  test:{/* dev/jobs-check.js: give(api) sets up progress; step(api,t) drives the player each frame; return 'done' when finished */
    give(a){},step(a,t){const M=a.M;if(M&&M.n<3&&t%10===0)M.n++}}
});
})();
