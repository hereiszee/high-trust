/* HT.Tail.slot / HT.Tail.boxed (Brake Check's formation helpers), headless. node dev/brake.test.js
   - slot(): his six/nine/twelve relative to his pose, widths, a lead for speed, and the along-the-lane version through a corner
   - boxed(): the timer needs every car in its slot AND the target under vmax for t seconds; it drains at 2x when the box breaks
   - SPEC3 4.2: two followers driving to slot() at 5 Hz box a scripted target within 20 s in 9/10 seeds */
global.window=global;require('../js/tail.js');const T=HT.Tail;
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};const near=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
const tg={x:10,z:20,yaw:0,spd:0};/* yaw 0 faces -z: forward (0,-1), right (1,0) */
let p=T.slot(tg,{side:0});ok(near(p.x,10)&&near(p.z,20+4.4+2.6),'six by default: bumper to bumper plus 2.6 m behind ('+p.z+')');
p=T.slot(tg,{side:0,back:-7.6});ok(near(p.x,10)&&near(p.z,20-7.6),'back < 0 is his twelve');
p=T.slot(tg,{side:-1});ok(near(p.x,10-(0.95+0.95+1.1))&&near(p.z,20),'side -1 is his nine: the next lane left, level with him');
p=T.slot({...tg,w:2.4},{side:1},{w:2});ok(near(p.x,10+(1.2+1+1.1)),'side offsets use both widths');
p=T.slot({...tg,spd:10},{side:-1,lead:.2});ok(near(p.z,20-2),'lead moves the point ahead by spd*lead');
/* along a lane with a right turn: the slot stays on the lane */
const P=T.poly([{x:0,z:0},{x:0,z:-50},{x:50,z:-50}]);const s0=48,a=P.at(s0);
p=T.slot({x:a.x,z:a.z,yaw:a.yaw},{side:0,back:-10,path:P,s:s0});const q=P.at(s0+10);ok(near(p.x,q.x,1e-6)&&near(p.z,q.z,1e-6),'path slot is measured along the lane round the corner');
const st={};ok(!T.boxed({x:0,z:0,yaw:0,spd:5},[{x:0,z:7,slot:{back:7}}],{st,dt:1,t:3}),'one second held: not boxed yet ('+st.t+')');
T.boxed({x:0,z:0,yaw:0,spd:5},[{x:0,z:7,slot:{back:7}}],{st,dt:1,t:3});ok(T.boxed({x:0,z:0,yaw:0,spd:5},[{x:0,z:7,slot:{back:7}}],{st,dt:1,t:3}),'three seconds held: boxed');
T.boxed({x:0,z:0,yaw:0,spd:12},[{x:0,z:7,slot:{back:7}}],{st,dt:1,t:3});ok(near(st.t,1)&&!st.ok,'too fast (12 > vmax 8) breaks it and the timer drains at 2x ('+st.t+')');
const st2={};T.boxed({x:0,z:0,yaw:0,spd:5},[{x:9,z:7}],{st:st2,dt:5,t:3,ok:()=>true});ok(st2.boxed,'o.ok overrides the in-slot test (a job with its own lane maths)');
/* 2 followers, a target on rails with random speed changes: box within 20 s in 9 of 10 seeds */
let wins=0;for(let seed=1;seed<=10;seed++){let r=seed*9301%233280;const rnd=()=>(r=(r*9301+49297)%233280)/233280;
  const path=T.poly([{x:0,z:0},{x:0,z:-2000}]),rail=T.Rail(path,{max:12});rail.place(30);rail.v=10;const cars=[{x:-3,z:-10,v:0,slot:{side:-1}},{x:0,z:30,v:0,slot:{side:0}}];const box={};let done=false;
  for(let t=0;t<20&&!done;t+=1/30){const want=t>10?6:9+rnd()*4;rail.step(1/30,{speedMul:want/12});const tgt={x:rail.x,z:rail.z,yaw:rail.yaw,spd:rail.v};
    for(const c of cars){if(Math.round(t*30)%6===0)c.goal=T.slot(tgt,Object.assign({lead:.2},c.slot),c);const dx=c.goal.x-c.x,dz=c.goal.z-c.z,d=Math.hypot(dx,dz),sp=Math.min(16,rail.v+d*1.2);if(d>.05){const m=Math.min(d,sp/30);c.x+=dx/d*m;c.z+=dz/d*m}}
    done=T.boxed(tgt,cars,{st:box,dt:1/30,t:3,r:4,vmax:8})}if(done)wins++}
ok(wins>=9,'two followers box a scripted target within 20 s in '+wins+'/10 seeds');
console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0);
