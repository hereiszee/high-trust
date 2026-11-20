/* HT.Photo.grade (SPEC3 4.3): synthetic cameras and subjects, no browser. node dev/photo.test.js */
global.window=global;const P=require('../js/photo.js');let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
const T=P.T,fr={x0:-.56,x1:.56,y0:-.56,y1:.56};/* a frame 56% of the view, like the kit's viewfinder */
const cam=(z,o)=>Object.assign({x:0,y:1.6,z,yaw:0,pitch:0,fov:P.camFov(T.vfov[2],1.12),aspect:16/9,frame:fr},o||{});/* looking down -z at 4x */
const person={id:'p',label:'P',pos:{x:0,y:0,z:0},h:.6,mid:1.42,need:'face',facing:0};/* faces -z... */
const faceCam={...person,facing:Math.PI};/* faces +z, towards a camera at +z */
const g=(c,s,o)=>P.grade(c,[s],Object.assign({zoom:4,focus:{locked:true,dist:Math.abs(c.z)}},o||{}));
ok(g(cam(4),faceCam).stars===3,'close and facing: 3 stars');
ok(g(cam(9),faceCam).stars===2,'a bit further: 2 stars ('+g(cam(9),faceCam).hits[0].size.toFixed(2)+')');
ok(g(cam(14),faceCam).stars===1,'far: 1 star');
ok(g(cam(60),faceCam).stars===0,'very far: nothing');
ok(g(cam(4),person).stars===1,"facing away: capped at 1 ("+g(cam(4),person).hits[0].why.join('/')+')');
ok(!g(cam(4,{yaw:1.2}),faceCam).hits.length,'out of frame: no hit');
ok(g(cam(4),faceCam,{los:()=>false}).hits.length===0,'occluded: no hit');
let n=0;ok(g(cam(4),faceCam,{los:()=>(n++%3)!==0}).stars===2,'one sample point blocked: capped at 2');
ok(g(cam(4),faceCam,{turn:2}).stars===2,'turning fast: blur -1');
ok(g(cam(4),faceCam,{focus:{locked:false}}).stars===2,'still focusing: -1');
ok(g(cam(4),faceCam,{focus:{locked:true,dist:20}}).stars===2,'focused on the background: -1');
ok(g(cam(4),faceCam,{dark:true}).stars===2,'dark: -1');
ok(g(cam(4),faceCam,{cap:{n:2,why:'windshield'}}).stars===2,'job cap (windshield): 2');
const plate={id:'pl',label:'Plate',pos:{x:0,y:.3,z:0},h:.58,mid:.22,need:'plate',facing:Math.PI/2};
ok(g(cam(4,{pitch:-Math.atan2(1.08,4)}),plate).stars===1,'plate at 90 degrees: capped at 1');ok(g(cam(4,{pitch:-Math.atan2(1.08,4)}),{...plate,facing:Math.PI}).stars===3,'plate square on: 3');
console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0);
