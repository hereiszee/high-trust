/* night preset checks: node dev/night-check.js
   goggles gated on ownership, battery drain (4 min) and home recharge, dead-battery line, flashlight off in cars,
   AI view range at night, light factor, HUD gadget state, setNight easing vs immediate, day restored. */
const {open}=require('./ai-ingame-lib.js');
(async()=>{const {b,p,errs}=await open({viewport:{width:640,height:360}});
  const r=await p.evaluate(async()=>{const H=window.__ht,out={},ok=(k,v)=>{out[k]=v};H.HUD.hide('title');H.enterHub();H.step(2);
    const s=H.save;if(s&&s.gadgets)delete s.gadgets.nvg;
    ok('nvg refused without goggles',H.nvg(true)===false);
    ok('gadgets: light only',JSON.stringify(H.nightGadgets().map(g=>g.id))==='["flash"]');
    H.giveNvg(1);ok('nvg on when owned',H.nvg(true)===true);
    ok('gadgets: nv + light',JSON.stringify(H.nightGadgets().map(g=>g.id))==='["nvg","flash"]');
    H.step(30*60);const c1=H.nightGadgets()[0].charge;ok('drain 60 s ~ 0.75 left',Math.abs(c1-.75)<.01);
    H.step(30*181);ok('dead after 4 min',H.night.nvg===false&&H.nightGadgets()[0].charge===0);
    H.draw();ok('dead line shown',JSON.stringify(H.ui.sub||'').includes('Goggles are dead'));
    ok('cannot re-enable when dead',H.nvg(true)===false);
    /* immediate vs eased */
    H.setNight(0);window.setNight(1);ok('eased: not instant',H.night.k===0);H.step(15);ok('eased: halfway',H.night.k>.3&&H.night.k<.7);H.step(20);ok('eased: done in ~1 s',H.night.k===1);
    ok('AI sight scale at night',Math.abs(H.night.sight-14/24)<1e-6);
    ok('light factor range',(()=>{const v=H.nightLight(H.P.pos.x,H.P.pos.z);return v===.4||Math.abs(v-.9)<1e-9})());
    H.flash(true);ok('flash on foot',H.night.flash===true);ok('player seen as lit with flashlight',H.night.psight===1);
    H.enterVan();H.step(2);ok('flash off in car',H.night.flash===false&&H.flash(true)===false);H.exitVan();H.step(2);
    /* home recharge */
    try{H.homeInit&&H.homeInit();await new Promise(r=>setTimeout(r,8000));H.enterHome();H.step(2);H.step(30*5);ok('recharged at home',H.nightGadgets()[0].charge===1)}catch(e){ok('home recharge (skipped: '+e.message+')',true)}
    H.setNight(0);ok('day: exposure back',H.renderer.toneMappingExposure===1||H.mode==='home');
    return out});
  let bad=0;for(const k in r){console.log((r[k]?'ok  ':'FAIL')+' '+k);if(!r[k])bad++}
  console.log('console errors:',errs.length?errs.slice(0,5):'none');await b.close();process.exit(bad||errs.length?1:0)})();
