/* HT.Social disguise / cover / politeness (SPEC3 4.6 b), in Node: node dev/jobs/pawn-unit.js
   every rate of the cover table, the disguise maxima and staff-zone drains, crowd camouflage, nobody watching = no change,
   the politeness timer (start, cancel by leaving / talking / fixing, expiry -> "excuse me" and a 20 s watch), the mustache x1.5,
   recognition after a disguise swap, the blown event at 0, save/load reproducibility. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;const S=require('../../js/social.js');const {COVER:C,DISGUISES:Dz}=S;
const near=(a,b,e)=>assert.ok(Math.abs(a-b)<(e||1e-6),a+' ~ '+b);
const one=[{id:'g1',d:5}];
test('the three disguises: max cover and staff-zone drain',()=>{assert.equal(Dz.press.max,.9);assert.equal(Dz.cousin.max,.85);assert.equal(Dz.mustache.max,.7);
  assert.equal(Dz.press.staff,-.18);assert.equal(Dz.cousin.staff,-.06);assert.equal(Dz.mustache.staff,-.12);assert.equal(Dz.mustache.polite,1.5)});
test('every rate of the table while somebody watches',()=>{const D=S.cover({id:'press'});
  const r=st=>D.rate(Object.assign({seen:one,zone:'public'},st));
  near(r({running:true}),C.run);near(r({crouch:true}),C.crouch);near(r({carry:true}),C.carry);near(r({slipped:true}),C.slip);near(r({loiter:true}),C.loiter);
  near(r({}),C.public);near(r({zone:'staff'}),Dz.press.staff);near(r({zone:'staff',access:true}),0);
  near(S.cover({id:'cousin'}).rate({seen:one,zone:'staff'}),-.06);near(S.cover({id:'mustache'}).rate({seen:one,zone:'restricted'}),-.12);
  near(r({running:true,crouch:true}),C.run+C.crouch)});
test('nobody watching: nothing changes; a crowd halves drains and doubles the gain',()=>{const D=S.cover({id:'mustache'});
  assert.equal(D.rate({seen:[],running:true}),0);near(D.rate({seen:one,running:true,crowd:2}),C.run/2);near(D.rate({seen:one,crowd:3}),C.public*2);near(D.rate({seen:one,running:true,crowd:1}),C.run)});
test('conversation results and the bump kinds',()=>{const D=S.cover({id:'press'});D.cover=.5;D.bump('win');near(D.cover,.65);D.bump('lose');near(D.cover,.55);D.bump(-1);assert.equal(D.cover,0);assert.ok(D.blown);
  const E=S.cover({id:'press'});E.bump(.5);assert.equal(E.cover,.9,'never above the disguise max')});
test('a walk across the room: cover drains at the running rate and climbs back in public',()=>{const D=S.cover({id:'press'});
  for(let i=0;i<30;i++)D.tick(.1,{seen:one,zone:'public',running:true});near(D.cover,.9+3*C.run,1e-9);for(let i=0;i<50;i++)D.tick(.1,{seen:one,zone:'public'});near(D.cover,.9+3*C.run+5*C.public,1e-9)});
test('politeness: low cover in front of someone starts a 4-8 s timer; mustache x1.5',()=>{for(const id of['press','mustache']){const D=S.cover({id,seed:3});D.cover=.3;const r=D.tick(.01,{seen:one,zone:'public'});
    assert.deepEqual(r.events.map(e=>e.kind),['polite']);const T=D.timers.g1.T,m=id==='mustache'?1.5:1;assert.ok(T>=4*m-1e-9&&T<=8*m+1e-9,id+' '+T);assert.equal(D.started,1)}});
test('politeness cancels: out of sight, talking to them, or cover back over 45%',()=>{let D=S.cover({id:'press',seed:4});D.cover=.3;D.tick(.01,{seen:one});let r=D.tick(.01,{seen:[]});assert.equal(r.events[0].kind,'cancel');assert.equal(r.events[0].why,'gone');
  D=S.cover({id:'press',seed:4});D.cover=.3;D.tick(.01,{seen:one});assert.equal(D.talk('g1'),true);assert.ok(!D.timers.g1);
  D=S.cover({id:'press',seed:4});D.cover=.3;D.tick(.01,{seen:one});D.bump('win');r=D.tick(.01,{seen:one});assert.equal(r.events[0].kind,'cancel');assert.equal(r.events[0].why,'fixed')});
test('standing there doing nothing odd lets cover climb past 45% and the timer lapses on its own',()=>{const D=S.cover({id:'press',seed:5});D.cover=.34;D.tick(.01,{seen:one});let c=null;for(let t=0;t<12&&!c;t+=.1){c=D.tick(.1,{seen:one,zone:'public',crowd:2}).events.find(e=>e.kind==='cancel')}assert.ok(c&&c.why==='fixed')});
test('politeness expires: "excuse me", cover -0.3, then 20 s of being watched (drains x1.5)',()=>{const D=S.cover({id:'press',seed:5});D.cover=.34;D.tick(.01,{seen:one});const T=D.timers.g1.T;
  let ex=null;for(let t=0;t<T+.2&&!ex;t+=.1){const r=D.tick(.1,{seen:one,zone:'public',crouch:true});ex=r.events.find(e=>e.kind==='excuse')}assert.ok(ex,'excuse (still crouching in front of him)');assert.equal(D.excused,1);assert.ok(D.cover<.1,'cover '+D.cover);
  assert.ok(D.watch.g1>19);near(D.rate({seen:one,running:true}),C.run*C.watchMul);
  const r2=D.tick(.1,{seen:one});assert.ok(!r2.events.some(e=>e.kind==='polite'),'no second timer while watching');
  for(let t=0;t<21;t+=.5)D.tick(.5,{seen:[]});assert.ok(!(D.watch.g1>0),'the watch wears off')});
test('cover 0 -> blown, once',()=>{const D=S.cover({id:'press'});D.cover=.05;const r=D.tick(1,{seen:one,running:true});assert.ok(r.events.some(e=>e.kind==='blown'));const r2=D.tick(1,{seen:one,running:true});assert.ok(!r2.events.some(e=>e.kind==='blown'))});
test('a new disguise: back to its max; people you met remember the old one',()=>{const D=S.cover({id:'press'});D.talk('g1');D.cover=.4;D.swap('mustache');assert.equal(D.cover,.7);assert.ok(D.knows('g1'));
  D.recognise('g1');near(D.cover,.5);assert.ok(D.timers.g1);assert.ok(!D.knows('g1'),'recognised once');assert.ok(!D.knows('stranger'))});
test('the tell slips on the disguise schedule',()=>{const D=S.cover({id:'mustache',seed:9});for(let i=0;i<20;i++){const s=D.nextSlip();assert.ok(s>=26&&s<=44)}const P=S.cover({id:'press',seed:9});assert.ok(P.nextSlip()>=95)});
test('save / load round trip (the same next timer after load)',()=>{const D=S.cover({id:'cousin',seed:11});D.talk('a');D.cover=.3;D.tick(.1,{seen:one});D.tick(.1,{seen:[]});
  const s=JSON.parse(JSON.stringify(D.save()));const E=S.cover({id:'press',seed:11}).load(s);assert.equal(E.id,'cousin');near(E.cover,D.cover,1e-3);assert.deepEqual(E.met,D.met);assert.equal(E.started,D.started);
  assert.equal(E.nextSlip(),D.nextSlip())});
test('Small Talk still loads the same engine (no clobbering)',()=>{assert.ok(S.convo&&S.check&&S.TABLE.bored.joke[0]===18)});
