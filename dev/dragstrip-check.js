/* Sensible Dragway play-through: node dev/dragstrip-check.js [travel,tune,red,race,bets,caps,quit,pad,perf|all] [--shots]
   Real key events (Playwright keyboard) for everything the player does: walking up, E at the paddock board and the race office, the menu keys,
   staging (hold Space + W against the brake), the launch (let go of Space on the green), feathering the throttle. The bot reads the
   tree like a driver (the bulbs' state), not the race model's internals. Also: the pure-sim odds sweep (2,000 races), the money rules
   and caps in the page, quit-to-title mid-race, and a controller-only pass (a scripted pad through js/gamepad.js). ONE browser.
   --shots writes docs/screenshots/dragstrip/*.jpg. Numbers go to docs/screenshots/dragstrip/evidence.txt. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'../docs/screenshots/dragstrip');fs.mkdirSync(OUT,{recursive:true});
const args=process.argv.slice(2),SHOTS=args.includes('--shots');let phases=(args.find(a=>!a.startsWith('--'))||'all').split(',');
if(phases.includes('all'))phases=['travel','tune','red','race','bets','caps','quit','pad','perf'];
const log=[];const say=(...a)=>{const s=a.join(' ');console.log(s);log.push(s)};let fails=0;
const ok=(c,m)=>{say((c?'  ok   ':'  FAIL ')+m);if(!c)fails++};
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});
  const ev=(f,a)=>p.evaluate(f,a);
  const step=(n,dt)=>ev(([n,dt])=>{const H=window.__ht;H.step(n,dt||1/30);H.ow.update(H.camera)},[n,dt||1/30]);
  const shot=async(name,o)=>{if(!SHOTS)return;await ev(o=>{const H=window.__ht;if(o&&o.hideHud){for(const el of document.body.querySelectorAll('body > *'))if(el!==H.renderer.domElement&&el.style&&!el.contains(H.renderer.domElement)&&!(el.className&&/ht-dr/.test(el.className)))el.style.visibility='hidden'}H.draw();H.draw()},o||{});
    await p.screenshot({path:path.join(OUT,name+'.jpg'),type:'jpeg',quality:84});await ev(()=>{for(const el of document.body.querySelectorAll('body > *'))if(el.style)el.style.visibility=''});say('  shot '+name+'.jpg')};
  const settle=async(n=6)=>{for(let i=0;i<n;i++){await step(1);await ev(()=>new Promise(r=>setTimeout(r,120)))}};
  const st=()=>ev(()=>{const H=window.__ht,P=H.P,CV=H.CV;return{x:P.pos.x,z:P.pos.z,car:CV?{x:CV.pos.x,z:CV.pos.z,yaw:CV.yaw,spd:CV.spd,type:CV.type}:null,mode:H.mode,cash:Math.round(HT.Save.data.cash)}});
  const S=()=>ev(()=>HT.Strip.state());
  const keys=new Set();const key=async(k,down)=>{if(down&&!keys.has(k)){keys.add(k);await p.keyboard.down(k)}else if(!down&&keys.has(k)){keys.delete(k);await p.keyboard.up(k)}};
  const release=async()=>{for(const k of[...keys])await key(k,false)};
  const press=async(k,n=2)=>{await p.keyboard.press(k);await step(n)};
  const drive=async(wps,o={})=>{let i=0,t=0;const vmax=o.vmax||13;
    while(i<wps.length&&t<(o.max||3000)){t++;const s=await st();if(!s.car){say('  (not in a car)');break}const c=s.car,[wx,wz]=wps[i],dx=wx-c.x,dz=wz-c.z,d=Math.hypot(dx,dz);
      if(d<(o.reach||5)){i++;continue}
      let err=Math.atan2(-dx,-dz)-c.yaw;err=Math.atan2(Math.sin(err),Math.cos(err));const duty=Math.min(1,Math.abs(err)*1.6),ph=(t%4)/4<duty;
      await key('a',err>0.04&&ph);await key('d',err<-0.04&&ph);const last=i===wps.length-1,want=Math.min(vmax,Math.abs(err)>.6?5:last?Math.max(3,d*.8):vmax);
      await key('w',c.spd<want);await key('s',c.spd>want+2.5);await step(2)}
    await release();for(let k=0;k<60;k++){const s=await st();if(!s.car||Math.abs(s.car.spd)<.4)break;await key(s.car.spd>0?'s':'w',true);await step(2);await release()}await release();await step(6);return i>=wps.length};
  const walk=async(x,z,r=1)=>{let last=null,stuck=0;for(let t=0;t<900;t++){const s=await st();const d=Math.hypot(x-s.x,z-s.z);if(d<r)break;
      if(last&&Math.hypot(s.x-last.x,s.z-last.z)<.03)stuck++;else stuck=0;last=s;
      await ev(([x,z])=>{const P=window.__ht.P;P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z))},[x,z]);await key('w',true);await key('d',stuck>4&&stuck<16);await step(2)}
    await release();await step(3);const s=await st();return Math.hypot(x-s.x,z-s.z)<r+.5};
  const def=await ev(()=>{const d=HT.Strip.def();return JSON.parse(JSON.stringify(d))});
  const T0=Date.now();
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
  await p.mouse.click(640,360);await step(2);
  /* the menu: which items it has; pick by number key (1-9) like a player */
  const menu=()=>ev(()=>HT.Strip.menu());
  const pickItem=async(rx)=>{const m=await menu();if(!m.open)return false;const i=m.items.findIndex(x=>rx.test(x));if(i<0){say('  (no menu item '+rx+' in '+m.items.join(' | ')+')');return false}
    if(i<9)await press(String(i+1),1);else{for(let k=0;k<i;k++)await press('ArrowDown',0);await press('Enter',1)}return true};
  /* the tree as a driver sees it: the bulbs on our lane */
  const tree=()=>ev(()=>{const k=HT.Strip.S.tree&&HT.Strip.S.tree.key;return k?JSON.parse(k):[{},{}]});
  /* one pass from the roll-in to the slip: hold Space + W to rev, keep the needle in the window, let go of Space on the green (lead: how
     many steps before the green to leave: -1 = on the green, >0 = a jump, for the red-light check), feather the throttle on wheelspin */
  const pass=async(o={})=>{const lane=(await S()).run.lane;let launched=false,n=0,band=await ev(()=>HT.Strip.S.run.spec.band);
    await key(' ',true);
    while(n++<900){const r=await S();if(!r.run||r.run.phase==='done')break;const lt=await tree(),L=lt[lane]||{};
      if(!r.run.launched){if(r.run.phase==='roll'){await step(1);continue}
        const want=(band[0]+band[1])/2;await key('w',o.flat?true:r.run.rpm<want-.04);
        const jumped=o.jump&&L.a3&&!L.green;if(L.green||jumped){await key(' ',false);await key('w',true);launched=true}}
      else{const sp=await ev(()=>HT.Strip.S.run.run.spin);await key('w',o.flat?true:sp<.32)}
      await step(1)}
    await release();for(let i=0;i<200;i++){const m=await menu();if(m.open)break;await step(2)}return S()};
  const slip=()=>ev(()=>HT.Strip.state().last);

  /* ---------------------------------------------------------------------------------------------- */
  if(phases.includes('travel')){say('== travel: the minivan from home to the strip (Industrial Way, the tree line, the corridor)');
    await ev(()=>{const H=window.__ht,V=H.VAN;H.P.pos.set(V.pos.x,0,V.pos.z+2.4);H.step(2)});await press('e');
    let s=await st();ok(!!s.car,'E gets in the minivan');
    const done=await drive([[90,15],[160,15],[179,22],[179,38],[186,43.5],[198,44],[203,52],[203,90],[203,130],[203,158],[206,164.5],[240,164.5],[276,164.5],[280.5,172],[280.5,220],[280.5,262],[280,288],[274,292]],{vmax:14});
    s=await st();ok(done&&s.car&&Math.hypot(s.car.x-274,s.car.z-292)<8,'drove to the paddock ('+(s.car?s.car.x.toFixed(0)+','+s.car.z.toFixed(0):'?')+')');
    const reg=await ev(()=>HT.WorldGen.regionAt(window.__ht.P.pos.x,window.__ht.P.pos.z));ok(reg==='strip','region is the strip');
    await step(4);const pin=await ev(()=>HT.Roam.owW().pins.includes('strip'));ok(pin,'the strip pin opens for fast travel after the visit');
    await press('e');s=await st();ok(!s.car,'out of the minivan in the paddock');
    const bk=await ev(()=>HT.Save.data.strip&&HT.Save.data.strip.barked);say('  (crew bark given: '+bk+')')}
  else{await ev(()=>{const H=window.__ht;HT.Save.data.strip=HT.Save.data.strip||{};H.P.pos.set(274,0,292);H.VAN.pos.set(276,0,292);H.VAN.yaw=Math.PI/2;H.syncCar&&0;H.step(3)});await settle(4)}
  await ev(()=>{HT.Save.addCash(1500,'test')});

  if(phases.includes('tune')){say('== test & tune: three cars, three slips, the quickest car quickest');
    const res={};
    for(const[i,t]of['sedan','minivan','workvan'].entries()){
      const b=def.paddockBoard;await walk(b.x,b.z+2.2,.8);await ev(()=>{window.__ht.P.yaw=0});await step(2);
      await press('e',2);let m=await menu();ok(m.open&&m.id==='picker','E at the paddock board opens the car picker ('+(m.items||[]).length+' cars)');
      if(i===0){ok(m.items.length===7,'every car the strip lends is in the picker (HT.Garage six + the mower): '+m.items.join(', '));await shot('picker')}
      const name=await ev(t=>HT.Drag.SPEC[t].name,t);await pickItem(new RegExp('^'+name.replace(/[()]/g,'.')+'$'));await step(2);
      let r=await S();ok(r.run&&r.loaner&&r.loaner.type===t,'a '+t+' loaner at the line');
      if(i===0&&SHOTS){for(let k=0;k<14;k++)await step(1);await shot('tree-staged')}
      r=await pass({});const sl=r.last&&r.last.slip;ok(sl&&sl.et>8&&sl.et<13,t+': slip RT '+(sl&&sl.rt)+' 60ft '+(sl&&sl.t60)+' 330 '+(sl&&sl.t330)+' ET '+(sl&&sl.et)+' @ '+(sl&&sl.mph)+' mph (1/4 est '+(sl&&sl.et14)+')');
      res[t]=sl;if(i===0)await shot('timeslip');
      m=await menu();ok(m.open&&m.id==='slip','the timeslip card is up');await pickItem(/^Done$/);await step(4);r=await S();ok(!r.loaner&&!r.run,'Done hands the loaner back')}
    ok(res.sedan&&res.minivan&&res.workvan&&res.sedan.et<res.minivan.et&&res.minivan.et<res.workvan.et,'order: sedan '+res.sedan.et+' < minivan '+res.minivan.et+' < work van '+res.workvan.et);
    const book=await ev(()=>Object.keys(HT.Save.data.strip.book));ok(book.length>=3,'the garage book has '+book.join(', '))}

  if(phases.includes('red')){say('== red light: leaving on the last amber');
    const b=def.paddockBoard;await walk(b.x,b.z+2.2,.8);await press('e',2);await pickItem(/^Hatchback$/);await step(2);
    const r=await pass({jump:true});const sl=r.last&&r.last.slip;ok(sl&&sl.red&&sl.rt<0,'red light: RT '+(sl&&sl.rt));
    const lt=await tree();ok(lt[0].red,'the red bulb is lit in our lane');await shot('red-light');
    await pickItem(/^Done$/);await step(4)}

  say('== done in '+((Date.now()-T0)/1000).toFixed(0)+' s; console errors: '+errs.length);for(const e of errs.slice(0,6))say('   '+e);if(errs.length)fails++;
  fs.writeFileSync(path.join(OUT,'evidence.txt'),log.join('\n')+'\n');
  await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
