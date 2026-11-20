/* node dev/tail.test.js — HT.Tail (js/tail.js) headless checks (SPEC3 4.2 "Tests"):
   a follower at a constant 30 m stays ideal with sus 0; at 10 m it spooks in under 6 s; a swap resets familiarity;
   mirror-cone maths; LOS through tiles and cars; the rail driver stops at its stops and keeps its gap; save/load round trip. */
global.window=global;require('../js/tail.js');const T=global.HT.Tail,assert=require('assert');let n=0;
const test=(name,f)=>{f();n++;console.log('ok   '+name)};
/* a target driving north (-z) at 11 m/s on a straight road; the follower at a fixed gap behind */
function run(gap,secs,o){o=o||{};const tl=T.create();let r=null,t=0;const dt=1/30;
  for(;t<secs;t+=dt){const tz=-t*11,tg={x:0,z:tz,yaw:0,spd:11},p={x:o.side||0,z:tz+gap,yaw:0,spd:11};r=tl.tick(dt,{t:tg,p,carId:'van',carType:o.type||'minivan',los:o.los!==false});if(r.spooked||r.lost)break}
  return{r,t,tl}}
test('constant 30 m: ideal band, sus stays 0',()=>{const{r}=run(30,60);assert.equal(r.band,'ideal');assert.equal(r.sus,0);assert.ok(!r.spooked&&!r.lost)});
test('constant 10 m: spooked in under 6 s',()=>{const{r,t}=run(10,10);assert.ok(r.spooked,'spooked');assert.ok(t<6,'t='+t.toFixed(2))});
test('constant 30 m in the mirror: made after ~40 s in a minivan, ~50 s in a sedan, never in a bus inside 60 s',()=>{
  const a=run(30,41);assert.ok(a.r.made,'minivan made at 41 s');const b=run(30,45,{type:'sedan'});assert.ok(!b.r.made,'sedan not yet at 45 s');
  const c=run(30,60,{type:'bus'});assert.ok(!c.r.made)});
test('out of his sight (los false): no familiarity, slow lose drain only',()=>{const{r}=run(40,20,{los:false});assert.equal(r.fam,0);assert.ok(r.lose<12&&!r.lost)});
test('a swap resets familiarity; the target seeing it starts at 0.5',()=>{const{tl}=run(30,30);assert.ok(tl.S.fam.van>.7);tl.swap('ted','sedan',false);
  assert.equal(tl.S.fam.ted,0);tl.swap('walt','sedan',true);assert.equal(tl.S.fam.walt,.5);tl.swap('van','minivan',false);assert.ok(tl.S.fam.van>.7,'the van stays known')});
test('losing band: lost after 12 s (6 s without sight)',()=>{const a=run(90,20);assert.ok(a.r.lost);assert.ok(Math.abs(a.t-12)<.2,'t='+a.t);const b=run(90,20,{los:false});assert.ok(Math.abs(b.t-6)<.2,'t='+b.t)});
test('mirror cone maths: 60 degrees total behind the target',()=>{const t={x:0,z:0,yaw:0};assert.ok(T.cone(t,{x:0,z:20}));assert.ok(T.cone(t,{x:10,z:20}));/* 26.6 deg */
  assert.ok(!T.cone(t,{x:13,z:20}));/* 33 deg */assert.ok(!T.cone(t,{x:0,z:-20}));const t2={x:0,z:0,yaw:Math.PI/2};/* facing -x */assert.ok(T.cone(t2,{x:20,z:0}))});
test('LOS: blocked by a building tile and by a car in between',()=>{const map=['....','..#.','....'];const g={map,block:'#',tile:2};
  assert.ok(!T.los(1,3,7.9,3,{grid:g}));assert.ok(T.los(1,1,7.9,1,{grid:g}));assert.ok(!T.los(0,0,0,30,{blockers:[{x:.5,z:15,r:1.2}]}));assert.ok(T.los(0,0,0,30,{blockers:[{x:3,z:15,r:1.2}]}))});
test('copying his turns raises suspicion (1st free, then +7, +14)',()=>{const tl=T.create();const tg={x:0,z:-200,yaw:0,spd:0};
  for(let k=0;k<3;k++){tl.turn({x:100*k,z:0},Math.PI/2);for(const[p,y]of[[{x:100*k,z:20},0],[{x:100*k,z:0},0],[{x:100*k-20,z:0},Math.PI/2]])tl.tick(.01,{t:{x:p.x,z:p.z-50,yaw:0,spd:5},p:Object.assign(p,{yaw:y,spd:10}),carId:'van',los:false})}
  assert.equal(tl.S.streak,3);assert.ok(Math.abs(tl.S.sus-21)<1,'sus '+tl.S.sus)});
test('rail: brakes to a stop line, holds, goes; keeps its gap behind a stopped car',()=>{const P=T.poly([{x:0,z:0},{x:0,z:-300}]);let went=0;
  const R=T.Rail(P,{max:12,stops:[{s:100,t:2,onGo:()=>went++}]});let t=0,held=0;for(;t<30;t+=1/30){R.step(1/30);if(R.holding)held+=1/30}
  assert.equal(went,1);assert.ok(held>1.9&&held<2.4,'held '+held);assert.ok(R.s>200);
  const B={x:0,z:-60,yaw:0,len:4.6},R2=T.Rail(P,{max:12});for(let i=0;i<600;i++)R2.step(1/30,{ahead:me=>T.aheadGap(me,[B],40)});const gap=Math.abs(B.z-R2.z)-4.6;assert.ok(gap>6&&gap<10,'gap '+gap)});
test('save/load round trip',()=>{const{tl}=run(20,3);const s=JSON.stringify(tl.save()),t2=T.create();t2.load(JSON.parse(s));assert.equal(JSON.stringify(t2.save()),s)});
test('formation stubs keep their signatures',()=>{const p=T.slot({x:0,z:0,yaw:0},{side:1,back:8});assert.ok(Math.abs(p.z-8)<1e-9&&p.x>0);assert.equal(T.boxed({},[],{}),false)});
console.log(n+' passed');
