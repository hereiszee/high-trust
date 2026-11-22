/* Dumps every MISSIONS entry: id, giver, hood, type, winTrust, unlock, from/start, repeatable, order, pay. Fresh save.
   node dev/audit/playthrough/dump-jobs.js > docs/audit/playthrough/jobs-table.json */
const {open}=require('../../ai-ingame-lib.js');
(async()=>{const {b,p,errs}=await open({init:()=>{try{localStorage.clear()}catch(e){}}});
  await p.click('.ht-title [data-act=newgame]').catch(()=>{});await p.waitForTimeout(500);
  const r=await p.evaluate(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);
    const W=H.WORLD;return H.MISSIONS.map((m,i)=>({i,id:m.id,title:m.title,giver:m.giver,giverName:((H.HOMIES||H.jobs.api.HOMIES||{})[m.giver]||{}).name,hood:m.hood||'maple',type:m.type,winTrust:m.winTrust,reg:!!m.reg,
      unlock:m.unlock?JSON.parse(JSON.stringify(m.unlock,(k,v)=>typeof v==='function'?'fn:'+String(v).slice(0,140):v)):null,
      from:m.from?JSON.parse(JSON.stringify(m.from)):null,repeatable:!!m.repeatable,order:m.order,pay:m.pay,night:!!m.night,noGuns:!!m.noGuns,
      giverPlace:W.places['g_'+m.giver]?[Math.round(W.places['g_'+m.giver].x),Math.round(W.places['g_'+m.giver].z)]:null,obj:m.obj}))});
  console.log(JSON.stringify(r,null,1));console.error('errs',errs.slice(0,5));await b.close()})();
