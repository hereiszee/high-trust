/* Sensible Dragway launch screenshot for the store: walks to the paddock board, takes the Hatchback, stages with real keys
   (hold Space + W), lets go of Space on the green and grabs frames just after the launch (tyre smoke, tree on green).
   Run with the 1080p/High wrapper: node -r ./tools/store-art/hiq.js tools/store-art/drag-launch.js */
const {open}=require('../../dev/ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const OUT=path.join(__dirname,'shots','dragstrip');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const {b,p}=await open({viewport:{width:1920,height:1080}});
  const ev=(f,a)=>p.evaluate(f,a),step=n=>ev(n=>{const H=window.__ht;H.step(n,1/30);H.ow.update(H.camera)},n);
  const keys=new Set();const key=async(k,d)=>{if(d&&!keys.has(k)){keys.add(k);await p.keyboard.down(k)}else if(!d&&keys.has(k)){keys.delete(k);await p.keyboard.up(k)}};
  const S=()=>ev(()=>HT.Strip.state()),menu=()=>ev(()=>HT.Strip.menu());
  const tree=()=>ev(()=>{const k=HT.Strip.S.tree&&HT.Strip.S.tree.key;return k?JSON.parse(k):[{},{}]});
  const shot=async n=>{await ev(()=>{window.__ht.draw()});for(let i=0;i<20;i++){const pend=await ev(()=>window.__ht.assets.stream.pending());if(!pend)break;await p.waitForTimeout(400)}
    await ev(()=>{window.__ht.draw()});await p.screenshot({path:path.join(OUT,n+'.png')});console.log('shot',n)};
  const def=await ev(()=>JSON.parse(JSON.stringify(HT.Strip.def())));
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
  await p.mouse.click(960,540);await step(2);
  const bd=def.paddockBoard;await ev(([x,z])=>{const H=window.__ht;H.P.pos.set(x,0,z+2.2);H.P.yaw=0;H.VAN.pos.set(274,0,292);H.step(4)},[bd.x,bd.z]);
  for(let i=0;i<10;i++){await step(2);await p.waitForTimeout(300)}
  await p.keyboard.press('e');await step(3);const m=await menu();console.log('menu',m.items);
  const i=m.items.findIndex(x=>/^Hatchback$/.test(x));await p.keyboard.press(String(i+1));await step(3);
  const lane=(await S()).run.lane,band=await ev(()=>HT.Strip.S.run.spec.band);await key(' ',true);let launched=0,n=0;
  while(n++<900){const r=await S();if(!r.run||r.run.phase==='done')break;
    if(!launched){if(r.run.phase==='roll'){await step(1);continue}const L=(await tree())[lane]||{};await key('w',r.run.rpm<(band[0]+band[1])/2-.04);
      if(L.green){await key(' ',false);await key('w',true);launched=1}await step(1);continue}
    launched++;await step(1);if(launched===16)await shot('launch-c');if(launched===24){await shot('launch-d');break}}
  await key('w',false);await b.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
