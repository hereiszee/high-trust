/* the key-art scenes (page-side staging code) and per-format cameras; node tools/store-art/scenes.js <scene> <format>[,format] writes studio jobs */
'use strict';
const fs=require('fs'),path=require('path');
const van=(x,z,y)=>`const V=__ht.VAN;V.pos.set(${x},0,${z});V.yaw=${y};if(V.obj){V.obj.position.set(${x},V.obj.position.y,${z});V.obj.rotation.y=${y}}`;
const GOLD_FRONT=`T_.light({dir:[-.85,.24,-.45],sun:'#ffb36b',si:3.0,hemi:.5,exp:.97,sky:'#ffcc9c',fog:'#ebbd94',near:45,far:200,center:[33,0,15],ext:22});`;
const GOLD_BACK=`T_.light({dir:[.9,.22,-.4],sun:'#ffaa5e',si:3.4,hemi:.75,exp:1.0,sky:'#ffcfa2',fog:'#efc090',near:45,far:200,center:[33,0,15],ext:22});`;
const walk=(L,turn=0)=>`for(const [r,x,z,ph] of ${JSON.stringify(L)})T_.put(r,x,z,-Math.PI/2+${turn}+(15-z)*0.025,{vel:1.35,steps:45+ph});`;
const SCENES={
  /* A: the crew walks down Maple toward camera, minivan nose-on behind, low sun over the camera's shoulder */
  A:{set:van(38.6,14.4,-2.45)+walk([['you',30.6,15.0,0],['rosa',32.1,16.15,9],['gary',32.3,13.75,13],['rick',33.4,17.25,6],['dave',33.9,12.5,19],['doug',35.3,18.6,25]])+GOLD_FRONT,
     cam:{wide:[[25.6,0.72,15.1],[33,1.62,15.0],34]}},
  /* A, tighter group for tall formats */
  AT:{set:van(38.2,14.6,-2.45)+walk([['you',30.6,15.0,0],['rosa',31.7,15.9,9],['gary',31.9,14.0,13],['rick',32.9,16.6,6],['dave',33.1,13.2,19],['doug',34.2,17.4,25]])+GOLD_FRONT,cam:{}},
  /* C: low angle, sun behind the crew (rim light), minivan side-on */
  C:{set:van(37.8,15.8,-2.1)+walk([['you',30.8,14.9,0],['rosa',32.3,16.2,9],['gary',32.2,13.4,13],['rick',33.5,17.3,6],['dave',33.6,12.1,19],['doug',34.9,18.6,25]],-0.12)+GOLD_BACK,cam:{wide:[[27.6,0.35,14.0],[33,1.9,15.2],46]}},
  /* B: standing by the van, arms folded */
  B:{set:van(35.8,15.2,-2.0)+`const C0=[26.0,1.0,13.4];for(const [r,x,z,idle] of [['you',31.2,14.8,'idle'],['dave',32.4,12.9,'idle_arms_folded'],['gary',32.0,16.3,'idle_look'],['rick',33.3,17.4,'idle_arms_folded'],['rosa',32.9,13.9,'f_idle'],['doug',33.2,11.9,'idle']])T_.put(r,x,z,T_.yawTo(x,z,C0[0],C0[2]),{idle,steps:44});`+GOLD_FRONT,cam:{wide:[[26.0,1.0,13.4],[33,1.35,15.2],36]}},
  /* street only (no crew) for the page background */
  S:{set:van(38.6,14.4,-2.45)+GOLD_FRONT,cam:{}},
};
module.exports={SCENES};
if(require.main===module){const [sc,cams,w,h,name,matte]=process.argv.slice(2);const S=SCENES[sc];
  let cam=S.cam[cams];if(!cam)cam=JSON.parse(cams);
  const run=`T_.clear();T_.hideLive();T_.sprOff=true;${S.set}T_.cam(${JSON.stringify(cam[0])},${JSON.stringify(cam[1])},${cam[2]},${JSON.stringify(cam[3]||null)});return 1`;
  fs.writeFileSync(path.join(__dirname,'jobs',name+'.js'),'module.exports='+JSON.stringify({w:+w,h:+h,matte:matte!=='0',run})+';')}
