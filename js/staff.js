/* Fort Sensible: the post's staff look like post staff (audit W-07).
 *   HT.Staff.dress(dd): a neighbour-pool character (never the crew or the family) in a generic, fictional utility uniform: the same
 *   model and its own texture, with the shirt and trousers recoloured olive on a copy of the atlas (shading kept, skin left alone), and
 *   an olive patrol cap. No insignia, no badges, no symbols. Characters that arrive late (People swaps the real model in) are dressed
 *   when they arrive (HT.People.onSwap).
 *   The tower: a controller in the cab (the voice on the radio has a body now).
 *   Used by js/range.js (Sgt. Pruitt, Cpl. Doyle) and js/tank.js (Staff Sgt. Ruiz). */
(function(){'use strict';
const HT=window.HT=window.HT||{};const Staff={};HT.Staff=Staff;
const OLIVE=[85,96,63],TROUSER=[72,78,54];/* sRGB */
const SHIRT_B=/^Bip01_(Spine\d?|[LR]_Clavicle|[LR]_UpperArm)$/,LEG_B=/^Bip01_(Pelvis|[LR]_Thigh|[LR]_Calf)$/,SKIN_B=/^Bip01_(Neck|MJaw|MNose|[LR]Cheek|MUpperLip|MBottomLip)$/;
const CACHE=new Map();Staff.stats={};/* atlas uuid -> recoloured CanvasTexture (Ruiz and a street Kenji share a model; only Ruiz gets this copy) */

function skinnedAll(dd){const L=[];dd.root.traverse(m=>{if(m.isSkinnedMesh&&m.material&&m.material.map)L.push(m)});return L}/* some models are two skinned meshes (body + a small part) */
/* each vertex's strongest bone */
function vbones(sk){const g=sk.geometry,si=g.attributes.skinIndex.array,sw=g.attributes.skinWeight.array,n=g.attributes.position.count,names=sk.skeleton.bones.map(b=>b.name),o=new Array(n);
  for(let i=0;i<n;i++){let w=0,b=0;for(let k=0;k<4;k++)if(sw[i*4+k]>w){w=sw[i*4+k];b=si[i*4+k]}o[i]=names[b]||''}return o}
function recolour(sk){const map=sk.material.map,img=map.image;if(!img||!img.width)return null;if(CACHE.has(map.uuid))return CACHE.get(map.uuid);
  const W=img.width,H=img.height,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(img,0,0);
  const g=sk.geometry,uv=g.attributes.uv.array,idx=g.index?g.index.array:null,nT=idx?idx.length/3:g.attributes.position.count/3,vb=vbones(sk);
  const P=(i)=>[uv[i*2]*W,(map.flipY?1-uv[i*2+1]:uv[i*2+1])*H];
  /* masks: 1 = shirt, 2 = trousers (whole triangle on those bones; a 1 px stroke closes the seams) */
  const mk=document.createElement('canvas');mk.width=W;mk.height=H;const m=mk.getContext('2d');m.lineWidth=1.5;m.lineJoin='round';
  const skin=[];
  for(let t=0;t<nT;t++){const a=idx?idx[t*3]:t*3,b=idx?idx[t*3+1]:t*3+1,d=idx?idx[t*3+2]:t*3+2;const bs=[vb[a],vb[b],vb[d]];
    let col=null;if(bs.every(s=>SHIRT_B.test(s)))col='#f00';else if(bs.every(s=>LEG_B.test(s)))col='#0f0';else if(bs.every(s=>SKIN_B.test(s))){skin.push(a,b,d);continue}else continue;
    const A=P(a),B=P(b),D=P(d);m.fillStyle=m.strokeStyle=col;m.beginPath();m.moveTo(A[0],A[1]);m.lineTo(B[0],B[1]);m.lineTo(D[0],D[1]);m.closePath();m.fill();m.stroke()}
  const src=x.getImageData(0,0,W,H),px=src.data,mask=m.getImageData(0,0,W,H).data;
  /* the face's skin tone (median of the neck, jaw, nose, cheek texels; not the whole head: hair): pixels near it stay skin (bare forearms, a short sleeve's arm) */
  const sr=[],sg=[],sbl=[];for(let k=0;k<skin.length;k+=7){const[u,v]=P(skin[k]);const o=((v|0)*W+(u|0))*4;if(o>=0&&o<px.length){sr.push(px[o]);sg.push(px[o+1]);sbl.push(px[o+2])}}
  const med=a=>{a.sort((p,q)=>p-q);return a.length?a[a.length>>1]:-999};const SK=[med(sr),med(sg),med(sbl)];
  /* mean luminance of each garment, so the olive keeps the folds and seams but not the old colour's brightness */
  const lum=o=>.299*px[o]+.587*px[o+1]+.114*px[o+2];let s1=0,n1=0,s2=0,n2=0;
  for(let o=0;o<px.length;o+=4){if(mask[o]>128){s1+=lum(o);n1++}else if(mask[o+1]>128){s2+=lum(o);n2++}}const m1=s1/Math.max(1,n1)||1,m2=s2/Math.max(1,n2)||1;
  let kept=0,done=0;for(let o=0;o<px.length;o+=4){const sh=mask[o]>128,tr=!sh&&mask[o+1]>128;if(!sh&&!tr)continue;
    const dr=px[o]-SK[0],dg=px[o+1]-SK[1],db=px[o+2]-SK[2];if(dr*dr+dg*dg+db*db<38*38){kept++;continue}done++;
    const k=Math.max(.55,Math.min(1.45,lum(o)/(sh?m1:m2))),C=sh?OLIVE:TROUSER;px[o]=Math.min(255,C[0]*k);px[o+1]=Math.min(255,C[1]*k);px[o+2]=Math.min(255,C[2]*k)}
  Staff.stats[map.uuid]={skin:SK,shirt:n1,trousers:n2,skinKept:kept,recoloured:done};/* test hook */
  x.putImageData(src,0,0);const T=new THREE.CanvasTexture(c);T.flipY=map.flipY;T.encoding=map.encoding;T.wrapS=map.wrapS;T.wrapT=map.wrapT;T.anisotropy=map.anisotropy;
  T.htChanged=done>0;CACHE.set(map.uuid,T);return T}
/* the patrol cap: on the head bone of a real model, on the box head of a fallback one */
let CAPM=null;
function cap(dd){if(dd._staffCap&&dd._staffCap.parent)return;try{const T=THREE;CAPM=CAPM||new T.MeshStandardMaterial({color:new T.Color('rgb('+OLIVE.join(',')+')').convertSRGBToLinear(),roughness:.85});
    const g=new T.Group();g.name='staffCap';const top=new T.Mesh(new T.CylinderGeometry(.105,.115,.09,14),CAPM);top.position.y=.07;g.add(top);
    const brim=new T.Mesh(new T.BoxGeometry(.2,.012,.09),CAPM);brim.position.set(0,.03,.1);g.add(brim);
    const bone=dd.rb&&dd.rb.bones&&(dd.rb.bones.Bip01_Head||dd.rb.bones.Head);
    if(bone){dd.root.updateMatrixWorld(true);const s=bone.getWorldScale(new T.Vector3()).x||1;g.scale.setScalar(1/s);g.position.set(.1/s,0,0);g.rotation.set(0,0,-Math.PI/2);bone.add(g)}
    else if(dd.head){g.position.y=.12;dd.head.add(g)}else return;dd._staffCap=g}catch(_){}}
function apply(dd){if(!dd||!dd.root)return;cap(dd);if(dd.pending||dd.boxed)return;
  for(const sk of skinnedAll(dd)){if(sk.userData.staff!==undefined)continue;sk.userData.staff=false;
    try{const t=recolour(sk);if(!t||!t.htChanged)continue;const m=sk.material.clone();m.map=t;m.needsUpdate=true;sk.material=m;sk.userData.staff=true;sk.userData.noBatch=true}catch(e){console.warn('[staff]',e)}}}
Staff.dress=dd=>{if(!dd)return dd;dd._staff=true;apply(dd);return dd};
Staff.dressed=dd=>!!dd&&skinnedAll(dd).some(sk=>sk.userData.staff===true);
(function onSwap(){const PP=HT.People;if(!PP||!PP.onSwap){setTimeout(onSwap,60);return}PP.onSwap(d=>{if(d&&d._staff){d._staffCap=null;apply(d)}})})();

/* ---------- the tower controller: in the cab, facing the runway ---------- */
const S={d:null,L:null};Staff.S=S;
function tower(){const a=HT.Jobs&&HT.Jobs.api,B=HT.Base;if(!a||!a.L||!a.L.ow||a.mode!=='hub'||!B||!B.def)return;const d=B.def();if(!d||!d.bld||!d.bld.tower)return;
  const b=d.bld.tower,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
  if(!S.d||S.L!==a.L){const PP=HT.People;let dd=null;try{if(PP&&PP.ok)dd=PP.make('neighbour',{variant:'nb_marcus'})}catch(_){dd=null}
    if(!dd)try{dd=a.makeDude({shirt:'#55603f',pants:'#4b4f3a'})}catch(_){dd=null}if(!dd)return;
    dd.root.position.set(cx+.6,9.0,cz+.9)/* the cab floor (base.js tower(): H 8.6 + the .4 slab) */;dd.root.rotation.y=.35;a.L.group.add(dd.root);Staff.dress(dd);S.d=dd;S.L=a.L}
  else if(S.d.root.parent!==a.L.group)a.L.group.add(S.d.root);
  const c=a.camera.position,dd=Math.hypot(c.x-cx,c.z-cz);S.d.root.visible=dd<160||c.y>40;if(dd<70)try{a.pose(S.d,1/30,{})}catch(_){}}
(function hook(){const J=HT.Jobs;if(!J||!J.on){setTimeout(hook,60);return}J.on('pose',()=>{try{tower()}catch(e){if(!S.err){S.err=1;console.warn('[staff] tower',e)}}})})();
})();
