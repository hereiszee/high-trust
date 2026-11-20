/* Where do the extra draw calls and triangles come from when every job is done? (QA, persistent world changes)
   For each camera spot: a fresh game vs a save, the visible meshes within 70 m grouped by their top-level owner (the child of the
   scene or of the level group they hang under, named by its .name/type and position), sorted by triangles. The draw calls and
   triangles the renderer reports are printed too.
   node dev/perf-attrib.js <save.json> */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs');
const SAVE=process.argv[2];
const CAMS=[{x:330,z:52,yaw:-0.4,label:'church'},{x:400,z:70,yaw:2.6,label:'garden / Dock St'},{x:362,z:52,yaw:0.2,label:'mart / Main St'}];
async function run(seed){const {b,p}=await open(seed?{init:{fn:s=>{try{if(!sessionStorage.getItem('__seeded')){localStorage.setItem('ht-save',s);sessionStorage.setItem('__seeded','1')}}catch(e){}},arg:seed}}:{});
  await p.click('.ht-title [data-act='+(seed?'continue':'newgame')+']');await p.waitForTimeout(300);
  const r=await p.evaluate(async CAMS=>{const H=window.__ht;await H.jobs.ready;const s=H.jobs.api.SV();if(s&&s.flags){s.flags.act2Intro=true;s.flags.finale2=true}
    H.enterHub();H.step(5);if(H.hudScreen==='result'&&H.UIacts['result:retry'])H.UIacts['result:retry']();const T=H.jobs.api.THREE,out=[];
    for(const c of CAMS){H.P.pos.set(c.x,0,c.z);H.collide(H.P.pos,.35);H.P.yaw=c.yaw;H.P.pitch=-.12;H.step(30);const R=H.renderer;R.info.autoReset=false;H.draw();R.info.reset();H.draw();const calls=R.info.render.calls,tris=R.info.render.triangles;R.info.autoReset=true;
      const by=new Map();const top=o=>{let n=o;while(n.parent&&n.parent!==H.scene&&n.parent!==H.L.group)n=n.parent;return n};
      H.scene.traverse(o=>{if(!o.isMesh||!o.geometry)return;for(let n=o;n;n=n.parent)if(!n.visible)return;const w=new T.Vector3();o.getWorldPosition(w);if(Math.hypot(w.x-c.x,w.z-c.z)>70)return;
        const t=top(o),tw=new T.Vector3();t.getWorldPosition(tw);const k=(t.name||t.userData&&t.userData.kind||t.type)+(t.userData&&t.userData.rb?'(person)':'');
        const g=o.geometry,tri=(g.index?g.index.count:(g.attributes.position?g.attributes.position.count:0))/3*(o.isInstancedMesh?o.count:1);
        const e=by.get(k)||{k,meshes:0,tris:0,n:new Set()};e.meshes++;e.tris+=tri;e.n.add(t.uuid);by.set(k,e)});
      out.push({label:c.label,calls,tris,top:[...by.values()].map(e=>({k:e.k,meshes:e.meshes,tris:Math.round(e.tris),objs:e.n.size})).sort((a,b)=>b.tris-a.tris).slice(0,25)})}
    return out},CAMS);await b.close();return r}
(async()=>{const a=await run(null),z=await run(SAVE?fs.readFileSync(SAVE,'utf8'):null);
  for(let i=0;i<CAMS.length;i++){const A=a[i],Z=z[i];console.log('== '+A.label+': draw calls '+A.calls+' -> '+Z.calls+', triangles '+A.tris+' -> '+Z.tris);
    const m=new Map(A.top.map(e=>[e.k,e]));for(const e of Z.top){const o=m.get(e.k)||{meshes:0,tris:0,objs:0};const dt=e.tris-o.tris,dm=e.meshes-o.meshes;if(Math.abs(dt)>5000||Math.abs(dm)>3)console.log('   '+e.k.padEnd(28)+' meshes '+o.meshes+'->'+e.meshes+'  tris '+o.tris+'->'+e.tris+'  objects '+o.objs+'->'+e.objs)}}
})().catch(e=>{console.error(e);process.exit(1)});
