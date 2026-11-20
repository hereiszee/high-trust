/* HT.Stealth (js/stealth.js) unit tests, Node only: node --test dev/stealth.test.js  (or node dev/stealth.test.js)
   SPEC3 4.1: geometry, fill times, noise and the dog, decay and the search floor, the camera sweep, the silent takedown, perf. */
const test=require('node:test'),assert=require('node:assert');
const St=require('../js/stealth.js'),T=St.T;
const P=(x,z,o)=>Object.assign({x,z,stance:'stand',lit:1},o||{});
/* seconds until an observer reaches a state, ticking at 60 Hz with the player held still */
function until(S,id,state,p,max=30){let t=0;while(S.state(id)!==state&&t<max){S.tick(1/60,p);t+=1/60}return t}
const vis=(S,p)=>S.probe(p).v;

test('geometry: in front sees, behind and out of range do not, peripheral band is weaker',()=>{const S=St.create({night:false});S.addObserver({id:'g',pos:{x:0,z:0},yaw:0});
  assert.ok(vis(S,P(0,10))>0,'in front');assert.equal(vis(S,P(0,-10)),0,'behind');assert.equal(vis(S,P(0,T.R.day+1)),0,'out of range');
  const side=Math.tan(60*Math.PI/180)*10;/* 60 deg off: outside the 50 deg cone, inside the +25 deg band */
  const vp=vis(S,P(side,10)),vf=vis(S,P(0,Math.hypot(side,10)));assert.ok(vp>0&&vp<vf*.5,'peripheral band at x0.35 ('+vp.toFixed(3)+' vs '+vf.toFixed(3)+')');
  assert.equal(vis(S,P(Math.tan(80*Math.PI/180)*10,10)),0,'beyond the band')});
test('geometry: walls block, a crouched dad behind low cover is hidden, a standing one is not',()=>{const S=St.create({night:false});S.addObserver({id:'g',pos:{x:0,z:0},yaw:0});
  S.occluder({x0:-2,z0:9,x1:2,z1:10,h:1.1});/* a crate just in front of the player at z 10.5 */
  assert.equal(vis(S,P(0,10.6,{stance:'crouch'})),0,'crouched behind the crate');assert.ok(vis(S,P(0,10.6))>0,'standing behind the crate');
  S.occluder({x0:-3,z0:4,x1:3,z1:4.3,h:4});assert.equal(vis(S,P(0,10.6)),0,'behind a wall')});
/* tuned slower than SPEC3's worked numbers (1.3 / 2.4 / 3.3 s): fill 0.7/s and a 0.9 s double take read fairer at night */
test('fill times (tuned): daylight 10 m in the cone ~2.3 s to alert; crouched ~3.7 s; night unlit 10 m ~6.3 s; flashlight 10 m ~2.25 s',()=>{
  const day=()=>{const S=St.create({night:false});S.addObserver({id:'g',pos:{x:0,z:0},yaw:0});return S};
  const t1=until(day(),'g','alerted',P(0,10)),t2=until(day(),'g','alerted',P(0,10,{stance:'crouch'}));
  const nS=St.create({night:true});nS.addObserver({id:'g',pos:{x:0,z:0},yaw:0});const t3=until(nS,'g','alerted',P(0,10,{lit:.4}));
  const fS=St.create({night:true});fS.addObserver({id:'g',pos:{x:0,z:0},yaw:0,lamp:true});const t4=until(fS,'g','alerted',P(0,10,{lit:.4}));
  const near=(t,want)=>Math.abs(t-want)<=want*.15;
  assert.ok(near(t1,2.3),'day stand '+t1.toFixed(2));assert.ok(near(t2,3.7),'day crouch '+t2.toFixed(2));assert.ok(near(t3,6.3),'night dark '+t3.toFixed(2));assert.ok(near(t4,2.25),'flashlight '+t4.toFixed(2));
  assert.ok(t1<t2&&t2<t3,'crouching and darkness both help')});
test('the double take: after first noticing, there is a beat before it climbs again',()=>{const S=St.create({night:false});S.addObserver({id:'g',pos:{x:0,z:0},yaw:0});
  const p=P(0,16,{stance:'crouch'}),tc=until(S,'g','curious',p);const b=S.get('g');const s0=b.sus;for(let i=0;i<18;i++)S.tick(1/60,p);const slow=(b.sus-s0)/.3;for(let i=0;i<60;i++)S.tick(1/60,p);const s1=b.sus;for(let i=0;i<18;i++)S.tick(1/60,p);const fast=(b.sus-s1)/.3;
  assert.ok(tc>0&&slow<fast*.5,'slow '+slow.toFixed(3)+' fast '+fast.toFixed(3))});
test('light: lights reach unshadowed points, an occluder throws a shadow',()=>{const S=St.create({night:true});S.light({x:0,y:3,z:0,r:10,i:.95});
  assert.ok(S.lightAt(0,4,1,.4)>.9,'under the lamp');assert.equal(S.lightAt(0,12,1,.4),.4,'beyond its reach');
  S.occluder({x0:-1,z0:2,x1:1,z1:3,h:2.4});assert.equal(S.lightAt(0,4,.8,.4),.4,'in the shadow of a 2.4 m box');
  const C=St.create({night:true});C.light({x:0,y:3,z:0,r:10,i:.95,yaw:0,half:.5});assert.ok(C.lightAt(0,5,1,.4)>.9,'inside the flood cone');assert.equal(C.lightAt(5,0,1,.4),.4,'outside it')});
test('noise: within r +0.35, within r/2 +0.6, hearing never alerts, walls cut it to 60%',()=>{const S=St.create({night:true});S.addObserver({id:'g',pos:{x:0,z:0},yaw:0});
  S.noise({x:0,z:-2,r:3,kind:'hiss'});S.tick(1/60,null);assert.ok(Math.abs(S.get('g').sus-.35)<.01,'far half');
  const S2=St.create({night:true});S2.addObserver({id:'g',pos:{x:0,z:0},yaw:0});S2.noise({x:0,z:-1,r:3,kind:'hiss'});S2.tick(1/60,null);assert.ok(Math.abs(S2.get('g').sus-.6)<.01,'near half');
  for(let i=0;i<10;i++){S2.noise({x:0,z:-1,r:3});S2.tick(.1,null)}assert.ok(S2.get('g').sus<=T.hear.cap+1e-9&&S2.state('g')==='searching','capped at searching');
  assert.deepEqual(S2.get('g').lkp,{x:0,z:-1},'goes to look where it came from');
  const S3=St.create({night:true});S3.addObserver({id:'g',pos:{x:0,z:0},yaw:0});S3.occluder({x0:-3,z0:-1.6,x1:3,z1:-1.4,h:3});S3.noise({x:0,z:-2.5,r:3});S3.tick(1/60,null);
  assert.equal(S3.get('g').sus,0,'2.5 m away through a wall: out of the 1.8 m it carries')});
test('the dog: hears steps by stance (12 m walking, 4 m crouched), barks, and doesn\'t see',()=>{const S=St.create({night:true});const d=S.addObserver({id:'dog',kind:'dog',pos:{x:0,z:0},yaw:0});let barks=0;S.on('bark',()=>barks++);
  S.noise({x:0,z:-11,r:2.5,kind:'step',player:true});S.tick(1/60,P(0,30));assert.equal(barks,1,'walking at 11 m');
  const S2=St.create({night:true});S2.addObserver({id:'dog',kind:'dog',pos:{x:0,z:0}});let b2=0;S2.on('bark',()=>b2++);S2.noise({x:0,z:-5,r:1,kind:'step',player:true});S2.tick(1/60,null);assert.equal(b2,0,'crouched at 5 m: no');
  S2.noise({x:0,z:-3.5,r:1,kind:'step',player:true});S2.tick(1/60,null);assert.equal(b2,1,'crouched at 3.5 m: yes');
  assert.equal(St.create({night:false}).addObserver({id:'d',kind:'dog',pos:{x:0,z:0}}).sight,false,'no eyes');
  for(let i=0;i<30;i++)S.tick(.1,P(0,2));assert.notEqual(S.state('dog'),'alerted','standing in front of him does nothing');
  const S4=St.create({night:true});S4.addObserver({id:'dog',kind:'dog',pos:{x:0,z:0}});let b4=0;S4.on('bark',()=>b4++);S4.noise({x:0,z:-2,r:3,kind:'treat',not:'dog'});S4.tick(1/60,null);assert.equal(b4,0,'a treat landing is not a reason to bark')});
test('decay and the search floor',()=>{const S=St.create({night:false});S.addObserver({id:'g',pos:{x:0,z:0},yaw:0});until(S,'g','searching',P(0,10));const b=S.get('g');
  const hide=P(0,-10);const s0=b.sus;for(let i=0;i<20;i++)S.tick(.1,hide);assert.ok(Math.abs(b.sus-s0)<1e-9,'held for 2.5 s ('+s0.toFixed(3)+' -> '+b.sus.toFixed(3)+')');
  for(let t=0;t<12;t+=.1)S.tick(.1,hide);assert.ok(Math.abs(b.sus-T.floor)<1e-6,'down to the floor while it holds ('+b.sus.toFixed(3)+')');
  for(let t=0;t<T.floorT;t+=.1)S.tick(.1,hide);for(let t=0;t<4;t+=.1)S.tick(.1,hide);assert.ok(b.sus<T.floor-.2&&S.state('g')==='calm','then back to calm')});
test('camera: sweeps +-30 deg at 12 deg/s',()=>{const S=St.create({night:false});const c=S.addObserver({id:'c',kind:'camera',pos:{x:0,z:0},yaw:0});let mx=0,mn=0;
  for(let t=0;t<12;t+=1/60){S.tick(1/60,null);mx=Math.max(mx,c.yaw);mn=Math.min(mn,c.yaw)}assert.ok(Math.abs(mx-T.cam.sweep)<.01&&Math.abs(mn+T.cam.sweep)<.01,'range');
  const half=T.cam.sweep*2/T.cam.rate;assert.ok(Math.abs(half-5)<.01,'one side to the other in 5 s')});
test('silent takedown: from behind, close, before he wonders',()=>{const S=St.create({night:false});const g=S.addObserver({id:'g',pos:{x:0,z:0},yaw:0});
  assert.ok(S.canTakedown('g',{x:0,z:-1}),'1 m behind');assert.ok(!S.canTakedown('g',{x:0,z:1}),'in front');assert.ok(!S.canTakedown('g',{x:0,z:-1.6}),'too far');
  assert.ok(!S.canTakedown('g',{x:1,z:0}),'beside him (90 deg)');g.sus=.4;assert.ok(!S.canTakedown('g',{x:0,z:-1}),'he is already wondering');g.sus=0;
  assert.ok(S.takedown('g')&&S.state('g')==='cuffed');assert.equal(vis(S,P(0,5)),0,'a zip-tied guard sees nothing');assert.ok(!S.canTakedown('g',{x:0,z:-1}),'only once')});
test('export/import and calm (checkpoint restore)',()=>{const S=St.create({night:false});S.addObserver({id:'a',pos:{x:0,z:0},yaw:0});S.addObserver({id:'b',pos:{x:5,z:0},yaw:0});
  S.get('a').sus=.5;S.takedown('b');const e=JSON.parse(JSON.stringify(S.export()));const R=St.create({night:false});R.addObserver({id:'a',pos:{x:0,z:0},yaw:0});R.addObserver({id:'b',pos:{x:5,z:0},yaw:0});
  R.import(e);assert.equal(R.state('a'),'curious');assert.equal(R.state('b'),'cuffed');R.get('a').sus=0;R.calm(1);R.tick(.5,P(0,3));assert.equal(R.get('a').sus,0,'no fill while calm')});
test('perf: 12 observers, tick under 0.15 ms',()=>{const S=St.create({night:true});for(let i=0;i<12;i++)S.addObserver({id:'o'+i,pos:{x:(i%4)*8,z:Math.floor(i/4)*8},yaw:i,lamp:i%2===0});
  for(let i=0;i<30;i++)S.occluder({x0:i*3,z0:5,x1:i*3+1.5,z1:6,h:i%3?1:3});for(let i=0;i<4;i++)S.light({x:i*9,y:3,z:4,r:9,i:.9});
  const p=P(14,9,{lit:.4});for(let i=0;i<200;i++)S.tick(1/60,p);const n=3000,t0=process.hrtime.bigint();for(let i=0;i<n;i++){p.x=14+Math.sin(i*.01)*3;S.tick(1/60,p)}
  const ms=Number(process.hrtime.bigint()-t0)/1e6/n;console.log('  tick: '+(ms*1000).toFixed(1)+' us');assert.ok(ms<.15,ms.toFixed(4)+' ms')});
