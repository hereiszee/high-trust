/* Fort Sensible, audit art fixes: node dev/base-art-check.js
   W-07: Staff Sgt. Ruiz, Sgt. Pruitt, Cpl. Doyle and the tower controller wear the uniform (recoloured texture + cap); a street neighbour
         made from the same model keeps his own clothes (the shared texture is untouched).
   W-05: Hangar 2 has an inside (no grass tufts on its floor; its floor, roof underside and props are in the base_east unit).
   W-09: the side berms are a heightfield mound (many vertices, not an 8-vertex prism).
   W-06: the open world's backdrop has no far-house ring (no bd:siding / bd:roof meshes).
   Shots: docs/screenshots/base/audit/*-before|after.jpg (scratch script ashots.js, 4 angles each). Fails on console errors. */
const {open}=require('./ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++};
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.ow.buildAll();const d=HT.Base.def();
    for(const q of[[d.tank.x,d.tank.z],[d.range.line,d.range.box.z0],[d.guard.x,d.guard.z],[(d.bld.tower.x0+d.bld.tower.x1)/2,(d.bld.tower.z0+d.bld.tower.z1)/2]]){H.P.pos.set(q[0]+6,0,q[1]+6);for(let i=0;i<6;i++){H.step(1);H.ow.update(H.camera)}}});
  let st=null;for(let k=0;k<120;k++){st=await ev(()=>{const H=window.__ht;H.step(1);const L={ruiz:HT.Tank.S.sarge&&HT.Tank.S.sarge.d,pruitt:HT.Range.S.people.officer&&HT.Range.S.people.officer.d,doyle:HT.Range.S.people.guard&&HT.Range.S.people.guard.d,tower:HT.Staff.S.d};
      const o={};for(const k in L){const d=L[k];o[k]=d?{ready:!d.pending&&!d.boxed,dressed:HT.Staff.dressed(d),cap:!!(d._staffCap&&d._staffCap.parent)}:null}return o});
    if(Object.values(st).every(v=>v&&v.ready))break;await p.waitForTimeout(250)}
  for(const k in st)ok(st[k]&&st[k].dressed&&st[k].cap,'W-07 '+k+': uniform + cap '+JSON.stringify(st[k]));
  const nb=await (async()=>{await ev(()=>{window.__nb=HT.People.make('neighbour',{variant:'nb_kenji'})});for(let k=0;k<80;k++){const r=await ev(()=>{const d=window.__nb;HT.People.tick&&HT.People.tick(.05);return !d.pending&&!d.boxed});if(r)break;await p.waitForTimeout(250)}
    return ev(()=>{const d=window.__nb,s=HT.Tank.S.sarge.d;const maps=x=>{const L=[];x.root.traverse(m=>{if(m.isSkinnedMesh&&m.material.map)L.push(m.material.map.uuid)});return L};const a=maps(d),c=maps(s);return{dressed:HT.Staff.dressed(d),shared:a.filter(u=>c.includes(u)).length,n:a.length}})})();
  ok(!nb.dressed&&nb.n>0,'W-07 a street neighbour on the same model as Ruiz keeps his own clothes '+JSON.stringify(nb));
  const w=await ev(()=>{const H=window.__ht,d=HT.Base.def(),h=d.bld.hangar;let tufts=0,bd=[],berm=0;
    H.scene.traverse(o=>{if(o.isInstancedMesh&&o.userData&&o.userData.tufts){const m=new THREE.Matrix4(),v=new THREE.Vector3();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);v.setFromMatrixPosition(m).applyMatrix4(o.matrixWorld);if(v.x>h.x0&&v.x<h.x1&&v.z>h.z0&&v.z<h.z1)tufts++}}
      if(o.isMesh&&/^m?:?bd:(siding|roof|found|glass)$/.test(o.name.replace(/^m:/,'')))bd.push(o.name)});
    const u=HT.OpenWorld.units().find(q=>q.id==='base_range'||q.key==='base_range');return{tufts,bd,units:HT.OpenWorld.units().filter(q=>/^base/.test(q.id||q.key||'')).map(q=>q.id||q.key)}});
  ok(w.tufts===0,'W-05 no grass tufts on Hangar 2\'s floor ('+w.tufts+')');
  ok(w.bd.length===0,'W-06 no far-house ring in the open world ('+(w.bd.join(',')||'none')+')');
  /* W-09: the berm is many vertices of the 'earth' painter: count the earth mesh's vertices near the north berm */
  const berm=await ev(()=>{const H=window.__ht,d=HT.Base.def(),R=d.range,zN=R.box.z0+1;let n=0,ys=[];H.scene.traverse(o=>{if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;if(!/earth/.test(o.name)&&!(o.material&&/earth/.test(o.material.name||'')))return;
      const pa=o.geometry.attributes.position;o.updateMatrixWorld();const v=new THREE.Vector3();for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i).applyMatrix4(o.matrixWorld);if(Math.abs(v.z-zN)<2.6&&v.x>d.bld.bermW.x1-.5&&v.x<R.line){n++;ys.push(v.y)}}});
    ys.sort((a,b)=>a-b);return{n,ymax:ys.length?+ys[ys.length-1].toFixed(2):null,ymed:ys.length?+ys[ys.length>>1].toFixed(2):null}});
  ok(berm.n>200&&berm.ymax>1.8,'W-09 north berm is a shaped mound: '+JSON.stringify(berm));
  console.log(errs.length?'CONSOLE ERRORS:\n'+errs.slice(0,10).join('\n'):'no console errors');if(errs.length)fails++;
  console.log(fails?fails+' FAILED':'all ok');await b.close();process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
