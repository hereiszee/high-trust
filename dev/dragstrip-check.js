/* Sensible Dragway play-through: node dev/dragstrip-check.js [travel,tune,red,race,bets,caps,quit,pad,perf|all] [--shots]
   Real key events (Playwright keyboard) for everything the player does: walking up, E at the paddock board and the race office, the menu keys,
   staging (hold Space + W against the brake), the launch (let go of Space on the green), feathering the throttle. The bot reads the
   tree like a driver (the bulbs' state), not the race model's internals. Also: the pure-sim odds sweep (2,000 races), the money rules
   and caps in the page, quit-to-title mid-race, and a controller-only pass (a scripted pad through js/gamepad.js). ONE browser.
   --shots writes docs/screenshots/dragstrip/*.jpg. Numbers go to docs/screenshots/dragstrip/evidence.txt. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path'),DR=require('../js/dragsim.js');
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
        const jumped=o.jump&&L.a3&&!L.green;if(L.green&&o.late&&(o._w=(o._w||0)+1)<o.late){await step(1);continue}if(L.green||jumped){await key(' ',false);await key('w',true);launched=true}}
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

  /* walk to the race office window and open it with E */
  const office=async()=>{const o=def.booth;const s0=await st();if(s0.x>o.x+1){await walk(Math.max(s0.x,248),286.4,1);await walk(o.x-1.6,286.4,.8)}await walk(o.x-1.4,o.z,.7);await ev(()=>{window.__ht.P.yaw=-Math.PI/2});await step(2);await press('e',2);const m=await menu();return m.open&&m.id==='office'};
  const cashNow=()=>ev(()=>Math.round(HT.Save.data.cash));
  const today=()=>ev(()=>{const s=HT.Save.data;return JSON.parse(JSON.stringify(HT.Drag.day(s.strip,s.day||1)))});
  if(phases.includes('race')){say('== money races: a win and a loss, cash to the dollar, the daily cap');
    await ev(()=>{const s=HT.Save.data;s.cash=1500});
    /* a win: Dutch (tier 1) in a rented sedan, $25 on yourself */
    ok(await office(),'E at the race office window opens it');await shot('race-office');
    await pickItem(/^Race the ladder$/);let m=await menu();ok(m.id==='ladder'&&m.items.length===7,'the ladder: '+m.items.join(', '));await shot('ladder');
    await pickItem(/^Dutch/);await pickItem(/^Rent: Sedan$/);m=await menu();ok(m.id==='selfbet','the self-bet offer');await shot('self-bet');
    let c0=await cashNow();await pickItem(/^Bet \$25 on yourself$/);await step(2);let r=await S();ok(r.run&&r.run.opp==='dutch','racing Dutch Hendricks, lane '+(r.run&&r.run.lane));
    if(SHOTS){for(let k=0;k<20;k++)await step(1);await shot('race-staged')}
    r=await pass({});let L=r.last;ok(L&&L.res&&L.res.won,'won: '+JSON.stringify(L&&L.res));await shot('race-board',{hideHud:true});await shot('race-result');
    let c1=await cashNow();ok(L&&L.money&&c1-c0===L.money.net,'cash moved by the settlement exactly: '+(c1-c0)+' = '+(L&&L.money.net)+' '+JSON.stringify(L&&L.money.lines));
    const beat=await ev(()=>!!HT.Save.data.strip.ladder.beaten.dutch);ok(beat,'Dutch marked beaten (first-win bonus paid once)');
    await pickItem(/^Done$/);await step(4);
    /* a loss: Marisol (hatch) in a rented work van, leaving late, $10 on yourself */
    await office();await pickItem(/^Race the ladder$/);await pickItem(/^Marisol/);await pickItem(/^Rent: The Contractor$/);c0=await cashNow();await pickItem(/^Bet \$10 on yourself$/);await step(2);
    r=await pass({late:30});L=r.last;ok(L&&L.res&&!L.res.won,'lost: '+JSON.stringify(L&&L.res));c1=await cashNow();
    ok(L&&L.money&&c1-c0===L.money.net&&L.money.net===-(20+25+10),'a loss costs the rental, the entry and the bet: '+(c1-c0));await pickItem(/^Done$/);await step(4);
    /* the daily cap: today's strip winnings near the cap, a repeat win over Dutch pays only what's left */
    await ev(()=>{const s=HT.Save.data;HT.Drag.day(s.strip,s.day||1).won=HT.Drag.ECON.dayCap-7});
    await office();await pickItem(/^Race the ladder$/);await pickItem(/^Dutch/);await pickItem(/^Rent: Sedan$/);c0=await cashNow();await pickItem(/^No bet$/);await step(2);
    r=await pass({});L=r.last;c1=await cashNow();const td=await today();
    ok(L&&L.res&&(!L.res.won||(L.money.lines.some(x=>/Purse/.test(x[0])&&x[1]===7)&&td.won===DR.ECON.dayCap)),'repeat win capped: '+JSON.stringify(L&&L.money)+' day '+JSON.stringify(td));
    await pickItem(/^Done$/);await step(4)}

  if(phases.includes('bets')){say('== bets on other races: watch one to the end, skip one, settle both from the race model');
    await ev(()=>{const s=HT.Save.data;s.cash=1500;const D=HT.Drag.day(s.strip,s.day||1);D.betWon=0;D.betLost=0});
    for(const skip of[false,true]){ok(await office(),'office');await pickItem(/^Bet on the next race$/);let m=await menu();ok(m.id==='bet'&&/^Back /.test(m.items[0]),'two racers on offer: '+m.items.slice(0,2).join(' | '));if(!skip)await shot('betting-booth');
      await press('1',1);m=await menu();ok(m.id==='stake','stake menu');const c0=await cashNow();await pickItem(/^\$25$/);await step(2);let w=await ev(()=>HT.Strip.watch());ok(!!w,'watching from the tower ('+(w&&w.m.join(' vs '))+')');
      let n=0;while(n++<400){w=await ev(()=>HT.Strip.watch());if(!w)break;if(skip&&w.phase==='go'&&w.t>.4){await press('e',1);continue}if(!skip&&SHOTS&&w.phase==='go'&&Math.abs(w.t-3.2)<.05)await shot('spectator-race');await step(1)}
      const lw=await ev(()=>HT.Strip.state().lastWatch),c1=await cashNow();ok(lw&&(c1-c0===lw.net)&&(lw.net===-25||lw.net>0),(skip?'skipped: ':'watched: ')+'winner lane '+(lw&&lw.win)+' by '+(lw&&lw.margin)+', bet '+(lw&&lw.net)+', cash '+(c1-c0));
      if(!skip)await shot('spectator-result');await press('Escape',1);await step(2)}}

  if(phases.includes('caps')){say('== caps and the floor (in the page) and the odds sweep (pure sim, 2,000 races)');
    const r=await ev(()=>{const D=HT.Drag,E=D.ECON.bet,d={won:0,betWon:0,betLost:0,beat:{}};const o={};
      o.floor=D.canBet(E.floor+20,d,25,2);o.noTab=D.maxStake(E.floor-1,d,2);o.max=D.canBet(5000,d,E.max+5,2);
      let lost=0;for(let i=0;i<30;i++){if(D.canBet(5000,d,50,2))break;lost+=50;D.settle(d,50,2,false)}o.lost=lost;
      const w={won:0,betWon:0,betLost:0,beat:{}};let won=0;for(let i=0;i<30;i++){const st=D.maxStake(5000,w,3);if(!st)break;won+=D.settle(w,Math.min(st,50),3,true)}o.won=won;
      const A=D.racer('walt'),B=D.racer('priya'),a={spec:D.spec(A.car),driver:A.d},b={spec:D.spec(B.car),driver:B.d};const p=D.winP(a,b,600,31);const rnd=D.rng(777);let n=0;for(let i=0;i<2000;i++)if(D.race(a,b,rnd).win===0)n++;o.p=p;o.f=n/2000;return o});
    ok(r.floor&&r.noTab===0&&r.max,'a bet never takes cash under the floor, no stake without the cash, the per-bet max ('+r.floor+')');
    ok(r.lost<=200&&r.won<=300,'daily caps: lost '+r.lost+' (cap 200), won '+r.won+' (cap 300)');
    ok(Math.abs(r.p-r.f)<.035,'odds: Walt vs Priya stated '+r.p.toFixed(3)+', 2,000 races '+r.f.toFixed(3));
    /* the booth itself refuses at the floor */
    await ev(()=>{HT.Save.data.cash=HT.Drag.ECON.bet.floor+5});await office();await pickItem(/^Bet on the next race$/);await press('1',1);const m=await ev(()=>{const M=HT.Strip.S.menu;return M&&M.o.items.map(x=>!!x.off)});
    ok(m&&m.every(Boolean),'at $'+(await cashNow())+' every stake is refused (floor $150)');await press('Escape',1);await press('Escape',1);await press('Escape',1);await step(2);await ev(()=>{HT.Save.data.cash=1500})}

  if(phases.includes('quit')){say('== quit to title mid-race: nothing left behind');
    const c0=await cashNow(),s0=await ev(()=>JSON.stringify(HT.Save.data.strip.ladder));await office();await pickItem(/^Race the ladder$/);await pickItem(/^Dutch/);await pickItem(/^Rent: Hatchback$/);await pickItem(/^Bet \$25 on yourself$/);await step(2);
    await key(' ',true);await key('w',true);for(let i=0;i<70;i++)await step(1);await release();let r=await S();ok(r.run&&(r.run.phase==='go'||r.run.phase==='tree'),'mid-race ('+(r.run&&r.run.phase)+')');
    await ev(()=>{window.__ht.HUD.emit?0:0});await ev(()=>{const H=window.__ht;H.quitToTitle?H.quitToTitle():document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))});await step(2);
    const q=await ev(()=>{const H=window.__ht;return{st:HT.Strip.state(),cars:(H.L&&H.L.cars||[]).filter(e=>e.stripLoaner).length,hud:!!document.querySelector('.ht-drhud'),menus:document.querySelectorAll('.ht-dr').length,cash:Math.round(HT.Save.data.cash),lad:JSON.stringify(HT.Save.data.strip.ladder),fly:!!(H.CV&&H.CV.fly)}});
    ok(!q.st.run&&!q.st.loaner&&!q.st.watch&&q.cars===0&&!q.hud&&!q.menus&&!q.fly,'no run, no loaner, no HUD, no menu: '+JSON.stringify({cars:q.cars,hud:q.hud,menus:q.menus}));
    ok(q.cash===c0&&q.lad===s0,'no money moved, no ladder change (cash '+q.cash+' vs '+c0+')');
    await ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3);H.P.pos.set(274,0,292)});await settle(4)}

  if(phases.includes('pad')){say('== controller only: the picker, a pass, the slip, with a scripted pad');
    const {FAKE_PAD}=require('../desktop/test/fake-pad.js');await ev(FAKE_PAD);
    await ev(()=>{const T=window.__T={t:1000};T.tick=(n=1)=>{for(let i=0;i<n;i++){T.t+=16;HT.Pad._tick(T.t)}};T.set=o=>{window.__pad.set(o);T.tick()};T.tap=(i,n=1)=>{T.set({buttons:{[i]:1}});T.tick(n);T.set({buttons:{[i]:0}});T.tick()}});
    await ev(()=>{__T.set({axes:[0,0,.6,0]});__T.set({axes:[0,0,0,0]})});ok(await ev(()=>HT.Pad.active),'the pad is the device in use');
    const b=def.paddockBoard;await ev(([x,z])=>{const H=window.__ht;if(H.CV)H.exitCar&&0;H.P.pos.set(x,0,z);H.P.yaw=0;H.step(3)},[b.x,b.z+2]);await step(3);
    const pr=await ev(()=>{window.__ht.draw();const el=document.querySelector('.ht-pr .tt, .ht-prompt');return document.body.innerText.match(/Test & tune[^\n]*/)?document.body.innerText.match(/.{0,8}Test & tune[^\n]*/)[0]:''});say('  prompt: '+pr);
    await ev(()=>{__T.tap(0,2)});await step(2);let m=await menu();ok(m.open&&m.id==='picker','A opens the picker');
    const foot=await ev(()=>document.querySelector('.ht-dr .foot').innerText);ok(!/\b(Enter|Esc|E \/|1-9)\b/.test(foot),'menu foot names pad buttons: '+foot);
    await ev(()=>{__T.tap(13);__T.tap(13);__T.tap(12)});m=await menu();ok(m.i===1,'D-pad moves the selection (on '+m.items[m.i]+')');
    await ev(()=>{__T.tap(0)});await step(2);let r=await S();ok(r.run&&r.loaner&&r.loaner.type==='minivan','A takes the minivan loaner');
    /* the pass: hold A (brake) and RT, let go of A on the green, keep RT down */
    const band=await ev(()=>HT.Strip.S.run.spec.band);let n=0,launched=false;await ev(()=>{__T.set({buttons:{0:1}})});
    while(n++<900){r=await S();if(!r.run||r.run.phase==='done')break;const lt=await tree(),Lt=lt[r.run.lane]||{};
      if(!launched){const want=(band[0]+band[1])/2;await ev(v=>{__T.set({buttons:{0:1,7:v}})},r.run.rpm<want-.04?1:0);
        if(Lt.green){await ev(()=>{__T.set({buttons:{0:0,7:1}})});launched=true}}else{const sp=await ev(()=>HT.Strip.S.run.run.spin);await ev(v=>{__T.set({buttons:{7:v}})},sp<.32?1:.4)}
      if(n===8){const tip=await ev(()=>document.querySelector('.ht-drhud .tip').innerText);ok(/\bA\b/.test(tip)&&/\bRT\b/.test(tip)&&!/Space|\bW\b/.test(tip),'the teach line names A and RT: '+tip)}
      await ev(()=>__T.tick());await step(1)}
    await ev(()=>{__T.set({buttons:{0:0,7:0}})});for(let i=0;i<100;i++){m=await menu();if(m.open)break;await step(2)}
    r=await S();ok(m.open&&m.id==='slip'&&r.last&&r.last.slip&&r.last.slip.et>8,'slip after a controller pass: ET '+(r.last&&r.last.slip&&r.last.slip.et));
    await ev(()=>{__T.tap(13);__T.tap(13);__T.tap(0)});await step(3);r=await S();ok(!r.loaner&&!(await menu()).open,'D-pad to Done, A: loaner back');
    await ev(()=>{__T.set({axes:[0,0,0,0]});HT.Pad.setLast&&HT.Pad.setLast('kb')})}

  if(phases.includes('perf')){say('== draw calls at the strip (ours vs everything), 0 away from it; day and night shots');
    await ev(()=>{const H=window.__ht,R=H.renderer,orig=R.renderBufferDirect.bind(R);window.__sk=-1;R.renderBufferDirect=function(c,s,g,m,o,gr){if(window.__sk>=0){let q=o;while(q){if(q.name==='dragstrip'||/^strip_/.test(q.name||'')){window.__sk++;break}q=q.parent}}return orig(c,s,g,m,o,gr)}});
    const probe=(x,z,lx,lz,h)=>ev(([x,z,lx,lz,h])=>{const H=window.__ht,c=H.camera;H.P.pos.set(x,0,z);H.step(3);c.position.set(x,h||3,z);c.lookAt(lx,1.5,lz);c.updateMatrixWorld();H.ow.update(c);H.ow.update(c);
      const R=H.renderer;R.info.autoReset=false;R.info.reset();window.__sk=0;R.render(H.scene,c);const all=R.info.render.calls,ours=window.__sk;window.__sk=-1;R.info.autoReset=true;return{all,ours}},[x,z,lx,lz,h]);
    for(const[n,v]of[['paddock',[262,292,150,278]],['start line',[262,278,60,278]],['stands',[230,262,240,280,4]],['finish',[50,286,120,276]],['the Route 9 sign',[208,160,208,170]],['Maple Heights',[39,15,80,15]],['Fort Sensible gate',[203,170,203,200]]]){await settle(3);const r=await probe(...v);
      const lim=/Maple|Sensible gate/.test(n)?0:40;ok(r.ours<=lim,n+': ours '+r.ours+' of '+r.all+' calls (limit '+lim+')')}
    if(SHOTS){await ev(()=>{const H=window.__ht;H.P.pos.set(262,0,268);H.P.yaw=Math.PI/2+.35;H.P.pitch=-.08;H.step(3)});await settle(6);await shot('strip-day',{hideHud:true});
      await ev(()=>{const H=window.__ht;H.P.pos.set(250,0,284.6);H.P.yaw=Math.PI/2-.25;H.P.pitch=.02;H.step(3)});await settle(4);await shot('tree-closeup',{hideHud:true});
      await ev(()=>{const H=window.__ht;H.setNight(1);H.P.pos.set(262,0,268);H.P.yaw=Math.PI/2+.35;H.P.pitch=-.08;H.step(3)});await settle(8);await shot('strip-night',{hideHud:true});await ev(()=>window.__ht.setNight(0))}}

  say('== done in '+((Date.now()-T0)/1000).toFixed(0)+' s; console errors: '+errs.length);for(const e of errs.slice(0,6))say('   '+e);if(errs.length)fails++;
  fs.writeFileSync(path.join(OUT,'evidence.txt'),log.join('\n')+'\n');
  await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
