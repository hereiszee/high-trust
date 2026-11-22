/* FINAL-CHECK Part 2 · the drag strip: a losing race or bet can be walked away from with no money lost.
   node dev/audit/final-check/strip-loss-dodge.js
   Entry, rental and the stake of a bet are only taken in settleRace()/the watch result (js/dragstrip.js:423,557), i.e. when the race is
   over; a race that ends any other way (endRun 'asleep'/'abort', a reset, quit, reload) changes no money. Real keys and clicks:
   control  a race vs Dutch with $X on yourself, red light on purpose, played out: entry + rental + stake are lost
   A        same, red light on purpose (the red bulb is lit, the loss is certain), then Esc -> Quit to title -> confirm -> Continue
   B        same bet, never let go of the brake: the opponent runs, the tower calls it "asleep" after 8 s
   C        a bet on another race, watched from the tower, the page reloaded mid-race (= closing the game) and the save loaded
   D        bracket night, round 1, never launch ("that counts as a loss ... Entry refunded")
   Prints the cash before/after for each. EXPECTED for a fair strip: a certain loss costs what a played-out loss costs. */
const {open}=require('../../ai-ingame-lib.js');
const say=(...a)=>console.log(a.join(' '));let fails=0;const ok=(c,m)=>{say((c?'  ok   ':'  FAIL ')+m);if(!c)fails++};
(async()=>{let {b,p,errs}=await open({viewport:{width:1280,height:720}});
  const ev=(f,a)=>p.evaluate(f,a);
  const step=(n,dt)=>ev(([n,dt])=>{const H=window.__ht;H.step(n,dt||1/30);H.ow.update(H.camera)},[n,dt||1/30]);
  const st=()=>ev(()=>{const H=window.__ht,P=H.P,CV=H.CV;return{x:P.pos.x,z:P.pos.z,car:CV?{type:CV.type}:null,mode:H.mode,cash:Math.round(HT.Save.data.cash)}});
  const S=()=>ev(()=>HT.Strip.state());
  const keys=new Set();const key=async(k,down)=>{if(down&&!keys.has(k)){keys.add(k);await p.keyboard.down(k)}else if(!down&&keys.has(k)){keys.delete(k);await p.keyboard.up(k)}};
  const release=async()=>{for(const k of[...keys])await key(k,false)};
  const press=async(k,n=2)=>{await p.keyboard.press(k);await step(n)};
  const walk=async(x,z,r=1)=>{let last=null,stuck=0;for(let t=0;t<900;t++){const s=await st();const d=Math.hypot(x-s.x,z-s.z);if(d<r)break;
      if(last&&Math.hypot(s.x-last.x,s.z-last.z)<.03)stuck++;else stuck=0;last=s;
      await ev(([x,z])=>{const P=window.__ht.P;P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z))},[x,z]);await key('w',true);await key('d',stuck>4&&stuck<16);await step(2)}
    await release();await step(3)};
  const menu=()=>ev(()=>HT.Strip.menu());
  const pickItem=async(rx)=>{const m=await menu();if(!m.open)return false;const i=m.items.findIndex(x=>rx.test(x));if(i<0){say('  (no menu item '+rx+' in '+m.items.join(' | ')+')');return false}
    if(i<9)await press(String(i+1),1);else{for(let k=0;k<i;k++)await press('ArrowDown',0);await press('Enter',1)}return true};
  const tree=()=>ev(()=>{const k=HT.Strip.S.tree&&HT.Strip.S.tree.key;return k?JSON.parse(k):[{},{}]});
  const cashNow=()=>ev(()=>Math.round(HT.Save.data.cash));
  const savedCash=()=>ev(()=>{try{return Math.round(JSON.parse(localStorage.getItem('ht-save')).cash)}catch(e){return 'n/a '+e.message}});
  const tally=()=>ev(()=>{const s=HT.Save.data;return JSON.stringify(HT.Drag.day(s.strip,s.day||1))});
  let def;
  const boot=async()=>{def=await ev(()=>JSON.parse(JSON.stringify(HT.Strip.def())));
    await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
    await p.mouse.click(640,360);await step(2);
    await ev(()=>{const H=window.__ht;HT.Save.data.strip=HT.Save.data.strip||{};H.P.pos.set(274,0,292);H.VAN.pos.set(276,0,292);H.VAN.yaw=Math.PI/2;H.step(3);HT.Save.data.cash=1500;HT.Save.save();HT.Save.flush&&HT.Save.flush()});
    for(let i=0;i<6;i++){await step(1);await ev(()=>new Promise(r=>setTimeout(r,120)))}};
  await boot();
  const office=async()=>{const o=def.booth;const s0=await st();if(s0.x>o.x+1){await walk(Math.max(s0.x,248),286.4,1);await walk(o.x-1.6,286.4,.8)}await walk(o.x-1.4,o.z,.7);await ev(()=>{window.__ht.P.yaw=-Math.PI/2});await step(2);await press('e',2);const m=await menu();return m.open&&m.id==='office'};
  /* stage for a race vs Dutch in a rented hatchback with the biggest offered bet on yourself */
  const raceDutch=async()=>{ok(await office(),'race office open');await pickItem(/^Race the ladder$/);await pickItem(/^Dutch/);await pickItem(/^Rent: Hatchback$/);
    const m=await menu();const bets=m.items.filter(x=>/^Bet \$\d+ on yourself$/.test(x));const big=bets[bets.length-1];say('  self-bet offer: '+m.items.join(' | '));
    await pickItem(new RegExp('^'+big.replace('$','\\$')+'$'));await step(2);const r=await S();ok(r.run&&r.run.opp==='dutch','racing Dutch ('+big+')');return +big.match(/\d+/)[0]};
  /* drive to the red light: hold Space + W, let go on the last amber */
  const jump=async(playOut)=>{const lane=(await S()).run.lane;await key(' ',true);let red=false;
    for(let n=0;n<900;n++){const r=await S();if(!r.run||r.run.phase==='done')break;const L=(await tree())[lane]||{};
      if(!r.run.launched){await key('w',true);if(L.a3&&!L.green){await key(' ',false)}}else await key('w',true);
      if(L.red){red=true;if(!playOut)break}await step(1)}
    if(playOut){await release();for(let i=0;i<300;i++){const m=await menu();if(m.open)break;await step(2)}}
    return red};
  const quitContinue=async()=>{await release();await p.keyboard.press('Escape');await p.waitForTimeout(400);const scr=await ev(()=>window.__ht.HUD.screen);
    const q=await p.$('.ht-pause [data-act=quit]');if(q)await q.click();await p.waitForTimeout(400);
    const okb=await p.$('.ht-dlg [data-act=ok], .ht-dialog [data-act=ok]');if(okb)await okb.click();await p.waitForTimeout(600);
    const t=await ev(()=>window.__ht.HUD.screen);const c=await p.$('.ht-title [data-act=continue]');const hadCont=!!c;if(c)await c.click();await p.waitForTimeout(800);await step(4);
    return{pause:scr,title:t,cont:hadCont,mode:await ev(()=>window.__ht.mode)}};

  let c0,c1,stake,red,lossCost=145;const ONLY=process.argv[2]||'';if(ONLY!=='cd'){say('== control: a red light played out to the slip');
  c0=await cashNow();stake=await raceDutch();red=await jump(true);let L=(await S()).last;c1=await cashNow();
  ok(red&&L&&L.res&&!L.res.won,'red light, LOSS: '+JSON.stringify(L&&L.money&&L.money.lines));say('  cash '+c0+' -> '+c1+' ('+(c1-c0)+'), today '+await tally());lossCost=c0-c1;
  await pickItem(/^Done$/);await step(4);

  say('== A: red light (certain loss), then Esc -> Quit to title -> Continue');
  await ev(()=>{const H=window.__ht;HT.Save.save();HT.Save.flush&&HT.Save.flush()});c0=await cashNow();stake=await raceDutch();red=await jump(false);
  const lit=await tree();const rs=await S();ok(red&&rs.run,'the red bulb is lit in our lane, race still on (phase '+(rs.run&&rs.run.phase)+')');
  const q=await quitContinue();say('  pause screen: '+q.pause+', after quit: '+q.title+', Continue offered: '+q.cont+', mode now '+q.mode);
  c1=await cashNow();const sc=await savedCash();say('  cash '+c0+' -> '+c1+' (saved: '+sc+'), today '+await tally());
  ok(c1===c0-lossCost,'A: the certain loss costs what the played-out loss cost ($'+lossCost+'): it cost $'+(c0-c1));
  await ev(()=>{const H=window.__ht;if(H.mode!=='hub'){H.HUD.hide('title');H.enterHub()}H.P.pos.set(274,0,292);H.step(3)});for(let i=0;i<4;i++)await step(1);

  say('== B: the same race, never let go of the brake (the opponent runs, "asleep" after 8 s)');
  c0=await cashNow();stake=await raceDutch();await key(' ',true);let oppDone=null;
  for(let n=0;n<900;n++){const r=await S();if(!r.run)break;const o=await ev(()=>{const R=HT.Strip.S.run;return R&&R.opp&&R.opp.ctl?{x:+R.opp.ctl.R.x.toFixed(0),done:R.opp.ctl.R.done}:null});if(o&&o.done)oppDone=o;await step(1)}
  await release();c1=await cashNow();say('  opponent finished his pass while we sat: '+JSON.stringify(oppDone)+'; cash '+c0+' -> '+c1+', today '+await tally());
  ok(c1===c0-lossCost,'B: sitting it out costs what a loss costs ($'+lossCost+'): it cost $'+(c0-c1));
  for(let i=0;i<30;i++)await step(1);

  }else{c0=0;c1=0}
  say('== C: a bet on another race, watched from the tower; mid-race P (pause) -> Quit to title -> Continue');
  await ev(()=>{HT.Save.save();HT.Save.flush&&HT.Save.flush()});ok(await office(),'office');await pickItem(/^Bet on the next race$/);await press('1',1);let m=await menu();
  say('  menu '+m.id+': '+(m.items||[]).join(' | '));const st1=m.items.filter(x=>/^\$\d+$/.test(x));c0=await cashNow();await pickItem(new RegExp('^\\'+st1[st1.length-1]+'$'));await step(2);m=await menu();if(m.open)say('  menu after the stake '+m.id+': '+(m.items||[]).join(' | '));let w=await ev(()=>HT.Strip.watch());ok(!!w,'watching ('+(w&&w.m.join(' vs '))+'), stake '+st1[st1.length-1]);
  for(let n=0;n<400;n++){w=await ev(()=>HT.Strip.watch());if(!w||w.phase==='go'&&w.t>3)break;await step(1)}
  say('  mid-race: '+JSON.stringify(w&&{phase:w.phase,t:w.t}));
  await p.keyboard.press('p');await p.waitForTimeout(400);const scrC=await ev(()=>window.__ht.HUD.screen),wC=await ev(()=>!!HT.Strip.watch());say('  after P: screen '+scrC+', still watching '+wC);
  if(scrC==='pause'){const q2=await p.$('.ht-pause [data-act=quit]');if(q2)await q2.click();await p.waitForTimeout(400);const ok2=await p.$('.ht-dlg [data-act=ok], .ht-dialog [data-act=ok]');if(ok2)await ok2.click();await p.waitForTimeout(600);
    const cc=await p.$('.ht-title [data-act=continue]');if(cc)await cc.click();await p.waitForTimeout(800);await step(4)}
  c1=await cashNow();const lwC=await ev(()=>HT.Strip.state().lastWatch);say('  cash at the bet '+c0+', after quit + Continue '+c1+'; lastWatch '+JSON.stringify(lwC&&{win:lwC.win,net:lwC.net}));
  ok(c1<c0||!!(lwC&&lwC.net),'C: a spectator bet abandoned mid-race is settled (cash '+c0+' -> '+c1+')');

  say('== D: bracket night round 1, never launch');for(let i=0;i<3;i++){if((await menu()).open)await press('Escape',1)}
  await ev(()=>{const H=window.__ht;if(H.mode!=='hub'){H.HUD.hide('title');H.enterHub()}H.P.pos.set(274,0,292);H.step(3);const s=HT.Save.data;s.day=3;s.cash=1500;s.strip=s.strip||{};if(s.strip.bracket)s.strip.bracket.lastDay=0});for(let i=0;i<6;i++)await step(1);
  def=await ev(()=>JSON.parse(JSON.stringify(HT.Strip.def())));c0=await cashNow();ok(await office(),'office');await pickItem(/^Bracket night$/);await pickItem(/^Rent: Sedan$/);await step(2);
  await key(' ',true);for(let n=0;n<900;n++){const r=await S();if(!r.run)break;await step(1)}await release();c1=await cashNow();
  const feed=await ev(()=>document.body.innerText.match(/Bracket night: that counts[^\n]*/));const ld=await ev(()=>HT.Save.data.strip.bracket.lastDay);
  say('  feed: '+(feed&&feed[0])+'; cash '+c0+' -> '+c1+'; bracket lastDay '+ld);say('  (D is informational: not verified, the bracket may not have been offered) D: a forfeited round 1 costs the entry or uses up tonight\'s bracket (cost $'+(c0-c1)+', lastDay '+ld+')');const bm=await menu();say('  office menu at D: '+JSON.stringify(bm.items||[]));
  say(errs.length?'console errors: '+errs.slice(0,3).join(' | '):'no console errors');say(fails?fails+' FAIL (each FAIL = a loss that was dodged)':'all ok');await b.close();process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(2)});
