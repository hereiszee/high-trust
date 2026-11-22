/* Pad only: a conversation with choices ("talk", HT.Social). How does a controller player move between the numbered choices?
   node dev/audit/input/pad-talk.js */
const {boot,LEAK_SRC}=require('./lib.js');
(async()=>{const r=await boot();const {ev,p}=r;const out={};
  await p.click('.ht-title [data-act=newgame]');await r.wait(300);
  out.setup=await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('talk');j.test.give(H.jobs.api);H.jobs.start('talk');H.step(3);
    const V=()=>H.M&&H.M.V;let f=0;for(;f<9000;f++){const v=V();if(v&&v.choice&&v.mounted)break;j.test.step(H.jobs.api,f,{});H.step(1)}const v=V();return{f,choice:!!(v&&v.choice),n:v&&v.choice&&v.choice.list.length,sel:v&&v.sel}});
  if(!out.setup.choice){console.log(JSON.stringify(out));await r.b.close();return}
  await ev(()=>{const v=window.__ht.M.V;if(v.choice){v.choice.t=1e9;v.choice.T=0}});
  await r.pad();await ev(()=>{__T.set({axes:[0,0,.3,0]});__T.set({axes:[0,0,0,0]})});
  const st=()=>ev(()=>{const v=window.__ht.M.V;return{sel:v.sel,choice:!!v.choice,flash:!!(window.__ht.P.flash||(window.__ht.night&&window.__ht.night.flash))}});
  out.start=await st();
  await ev(()=>{__T.tap(13)});out.dpadDown=await st();out.dpadDownKeys=await ev(()=>__T.keys.join(' '));
  await ev(()=>{__T.set({axes:[0,1,0,0]});__T.tick(10);__T.set({axes:[0,0,0,0]});__T.tick()});out.stickDown=await st();
  await ev(()=>{__T.tap(15)});out.dpadRight=await st();
  out.choiceLabels=await ev(()=>[...document.querySelectorAll('.soc-ch .k')].map(e=>e.textContent).join(','));
  out.leaks=await ev(LEAK_SRC);await r.shot('pad-talk-choices');
  console.log(JSON.stringify(out,null,1));console.log('errs',r.errs.slice(0,3));await r.b.close()})().catch(e=>{console.error(e);process.exit(1)});
