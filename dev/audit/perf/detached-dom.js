/* perf audit: who keeps detached DOM alive? New game, then N x (start job 0 -> Esc -> Quit to title -> confirm -> Continue), then a
   CDP heap snapshot; lists detached DOM nodes grouped by tag.class and, for the biggest groups, the first JS retainer path.
   node dev/audit/perf/detached-dom.js [--n=4] */
const path=require('path');const lib=require(path.join(process.cwd(),'dev/ai-ingame-lib.js'));
const N=+((process.argv.find(a=>a.startsWith('--n='))||'--n=4').split('=')[1]);
(async()=>{const {b,p,errs}=await lib.open();const ev=(f,a)=>p.evaluate(f,a);const cdp=await p.context().newCDPSession(p);const step=n=>ev(n=>window.__ht.step(n),n);
  await p.click('.ht-title [data-act=newgame]');await ev(async()=>{await window.__ht.jobs.ready;window.__ht.step(5)});
  const counts=[];const dc=async()=>{await cdp.send('HeapProfiler.collectGarbage');return (await cdp.send('Memory.getDOMCounters')).nodes};counts.push(await dc());
  for(let i=0;i<N;i++){await ev(async()=>{const H=window.__ht;H.startMissionWorld(0);for(let k=0;k<100&&H.mode!=='mission';k++)await new Promise(r=>setTimeout(r,100));H.step(30)});
    await p.keyboard.press('Escape');await step(2);await p.click('.ht-pause [data-act=quit]');await step(2);await p.click('.ht-dlg [data-dlg=ok]');await step(5);await ev(()=>{const c=document.querySelector('.ht-title [data-act=continue]');if(c&&!c.hidden)c.click();else document.querySelector('.ht-title [data-act=newgame]').click()});await step(3);if(await p.$('.ht-dlg [data-dlg=ok]'))await p.click('.ht-dlg [data-dlg=ok]');await step(8);counts.push(await dc())}
  console.log('Memory.getDOMCounters nodes after each cycle:',counts.join(' '));
  /* heap snapshot */
  const chunks=[];cdp.on('HeapProfiler.addHeapSnapshotChunk',e=>chunks.push(e.chunk));await cdp.send('HeapProfiler.collectGarbage');await cdp.send('HeapProfiler.takeHeapSnapshot',{reportProgress:false});
  const snap=JSON.parse(chunks.join(''));const m=snap.snapshot.meta,nf=m.node_fields.length,ef=m.edge_fields.length,nodes=snap.nodes,edges=snap.edges,strs=snap.strings;
  const NT=m.node_types[0],ET=m.edge_types[0];const iName=m.node_fields.indexOf('name'),iType=m.node_fields.indexOf('type'),iEC=m.node_fields.indexOf('edge_count'),iDet=m.node_fields.indexOf('detachedness');
  const eType=m.edge_fields.indexOf('type'),eName=m.edge_fields.indexOf('name_or_index'),eTo=m.edge_fields.indexOf('to_node');
  const n=nodes.length/nf;const first=new Uint32Array(n+1);for(let i=0,e=0;i<n;i++){first[i]=e;e+=nodes[i*nf+iEC]*ef}first[n]=edges.length;
  const ret=new Map();/* node -> [parent, edgeName] (first retainer) */
  for(let i=0;i<n;i++)for(let e=first[i];e<first[i+1];e+=ef){const t=edges[e+eTo]/nf;const ty=ET[edges[e+eType]];if(ty==='weak')continue;if(!ret.has(t))ret.set(t,[i,ty==='element'||ty==='hidden'?String(edges[e+eName]):strs[edges[e+eName]]])}
  const groups={};for(let i=0;i<n;i++){const nm=strs[nodes[i*nf+iName]];const det=iDet>=0?nodes[i*nf+iDet]:0;if(det===2||/^Detached /.test(nm)){(groups[nm]=groups[nm]||[]).push(i)}}
  const top=Object.entries(groups).sort((a,b)=>b[1].length-a[1].length).slice(0,12);let total=0;for(const g of Object.values(groups))total+=g.length;
  console.log('detached DOM nodes in snapshot:',total);
  for(const [nm,ids] of top){/* walk up to the first non-DOM retainer */let path=[];let cur=ids[0],hops=0;const seen=new Set();
    while(ret.has(cur)&&hops<40&&!seen.has(cur)){seen.add(cur);const [par,edge]=ret.get(cur);const pn=strs[nodes[par*nf+iName]];path.push(pn.slice(0,50)+'.'+edge);cur=par;hops++;if(!/Detached|HTML|Text|Node|Element|DOM/.test(pn)&&hops>2&&path.length>8)break}
    console.log(String(ids.length).padStart(5),nm.slice(0,70),'\n       retainers:',path.slice(0,10).join(' <- '))}
  console.log('console errors',errs.length);await b.close()})();
