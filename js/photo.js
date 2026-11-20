/* =====================================================================
   HT.Photo (SPEC3 4.3 [PHOTO]): the phone camera. Owned by Exhibit HOA (js/jobs/hoa.js), reusable by any job.
   A job opens a session:  HT.Photo.begin({job, subjects:()=>[...], occluders:()=>[meshes], onShot(shot), stamp:()=>'7:02 PM', flash:true})
   and holds the phone item (M.item='phone'). RMB raises it (touch: the aim button), LMB / the shutter button shoots,
   the wheel or the 1x/2x/4x pills zoom, F toggles the flash, RMB again (or the back arrow) lowers it.
   Subjects: {id, item, label, pos:{x,y,z} (base), h (graded size, m), need:'any'|'face'|'plate'|'sign', facing (yaw the subject
   faces, game convention forward=(-sin,-cos)), pts:[{x,y,z}] sample points (default 3 up the middle), live:bool (false = skip)}.
   Grading, the pure function HT.Photo.grade(cam, subjects, o):
     in frame   projected centre inside the central 70% of the frame rectangle (the 16:9 viewfinder box, not the screen)
     visible    LOS from the lens to each sample point (o.los); 3/3 clear = fine, 2/3 caps at 2 stars, 1/3 caps at 1, 0 = not in the shot
     size       graded height / frame height: >= .12 one star, >= .22 two, >= .35 three
     face/plate the subject must face the lens within 70 deg (face) / 60 deg (plate, sign), or it caps at one star
     steady     turn rate over 1.2 rad/s / zoom^.7 (1x 1.2, 2x .74, 4x .45) or running: -1 star ("Blurry")
     focus      shot while the lens is still hunting, or the subject outside the depth of field of the focus point: -1 star
     dark       o.dark: -1 star
   Shots that hit something keep a 256x144 JPEG of the real frame (the renderer's own output, cropped to the viewfinder) with a
   burned-in date stamp, in HT.Photo.gallery (and the job decides what goes to SAVE.album through HT.Save.album).
   Hooks (system-wide, HT.Jobs.on): camera (the phone view), hud (the viewfinder, crosshair off). The item's use() = the shutter.
   Node: HT.Photo.grade and HT.Photo.T load without a DOM (dev tests).
   ===================================================================== */
(function(root){'use strict';const HT=root.HT=root.HT||{};
const T={zoom:[1,2,4],vfov:[48,24,12],size:[.12,.22,.35],frame:.7,blur:1.2,run:3.4,cool:.4,face:70,plate:60,
  hunt:[.28,.38,.46],dof:[.6,.38,.24],zoomT:.16,refocus:.3,sens:.85,thumbW:256,thumbH:144,jpgQ:.6,flashR:24};
const D2R=Math.PI/180;
/* ---------------- pure grading ---------------- */
function basis(c){const cy=Math.cos(c.yaw),sy=Math.sin(c.yaw),cp=Math.cos(c.pitch),sp=Math.sin(c.pitch);
  const f={x:-sy*cp,y:sp,z:-cy*cp},r={x:cy,y:0,z:-sy},u={x:r.y*f.z-r.z*f.y,y:r.z*f.x-r.x*f.z,z:r.x*f.y-r.y*f.x};return{f,r,u}}
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
/* cam {x,y,z,yaw,pitch,fov(deg, vertical, of the whole view),aspect, frame:{x0,y0,x1,y1} in NDC (-1..1, y up)} */
function project(c,B,p){const d={x:p.x-c.x,y:p.y-c.y,z:p.z-c.z},zf=dot(d,B.f);if(zf<.15)return null;const t=Math.tan(c.fov*D2R/2);
  return{x:dot(d,B.r)/zf/(t*c.aspect),y:dot(d,B.u)/zf/t,z:zf}}
function grade(c,subjects,o){o=o||{};const B=basis(c),fr=c.frame||{x0:-1,y0:-1,x1:1,y1:1},fw=fr.x1-fr.x0,fh=fr.y1-fr.y0,fcx=(fr.x0+fr.x1)/2,fcy=(fr.y0+fr.y1)/2,t=Math.tan(c.fov*D2R/2);
  const zi=Math.max(0,T.zoom.indexOf(o.zoom||1)),hits=[];
  for(const s of subjects||[]){if(!s||s.live===false)continue;const h=s.h||1.7,mid={x:s.pos.x,y:s.pos.y+(s.mid!=null?s.mid:h/2),z:s.pos.z};
    const q=project(c,B,mid);if(!q)continue;
    const nx=(q.x-fcx)/(fw/2),ny=(q.y-fcy)/(fh/2);if(Math.abs(nx)>T.frame||Math.abs(ny)>T.frame)continue;
    const pts=s.pts&&s.pts.length?s.pts:[{x:mid.x,y:s.pos.y+h*.85,z:mid.z},mid,{x:mid.x,y:s.pos.y+h*.2,z:mid.z}];
    let vis=0;for(const p of pts)if(!o.los||o.los({x:c.x,y:c.y,z:c.z},p))vis++;if(!vis)continue;
    const size=h/(2*q.z*t)/(fh/2);/* graded height as a fraction of the frame's height */
    let st=size>=T.size[2]?3:size>=T.size[1]?2:size>=T.size[0]?1:0;const why=[];
    if(!st){hits.push({id:s.id,item:s.item||s.id,label:s.label,stars:0,size,why:['Too far away'],nx,ny,z:q.z});continue}
    if(st<3)why.push(st===2?'A little far':'Too far away');
    const capV=Math.max(1,Math.round(3*vis/pts.length));if(st>capV){st=capV;why.push("Something's in the way")}
    if((s.need==='face'||s.need==='plate'||s.need==='sign')&&s.facing!=null){const fx=-Math.sin(s.facing),fz=-Math.cos(s.facing),vx=c.x-s.pos.x,vz=c.z-s.pos.z,l=Math.hypot(vx,vz)||1;
      const ang=Math.acos(Math.max(-1,Math.min(1,(fx*vx+fz*vz)/l)))/D2R,lim=s.need==='face'?T.face:T.plate;
      if(ang>lim&&st>1){st=1;why.push(s.need==='face'?"Can't see the face":s.need==='plate'?"Plate's at an angle":"Sign's at an angle")}}
    if(o.cap&&st>o.cap.n){st=o.cap.n;why.push(o.cap.why||'Capped')}
    let pen=0;const lim=T.blur/Math.pow(T.zoom[zi],.7);
    if((o.turn||0)>lim||(o.move||0)>T.run){pen++;why.push('Blurry: hold still')}
    if(o.focus&&!o.focus.locked){pen++;why.push('Still focusing')}
    else if(o.focus&&o.focus.dist>0&&Math.abs(q.z-o.focus.dist)/o.focus.dist>T.dof[zi]){pen++;why.push('Focused on the wrong thing')}
    if(o.dark){pen++;why.push('Too dark')}
    st=Math.max(st>0?1:0,st-pen);/* a subject that is in the shot always counts for one star */
    if(!why.length)why.push('Sharp');
    hits.push({id:s.id,item:s.item||s.id,label:s.label,stars:st,size,why,nx,ny,z:q.z,vis:vis/pts.length})}
  hits.sort((a,b)=>b.stars-a.stars||Math.hypot(a.nx,a.ny)-Math.hypot(b.nx,b.ny));
  return{stars:hits.length?hits[0].stars:0,hits,best:hits[0]||null}}
/* the photo's vertical field of view -> the camera's, when the frame is fh (NDC height, 0..2) of the view */
function camFov(vfov,fh){return 2*Math.atan(Math.tan(vfov*D2R/2)/Math.max(.2,fh/2))/D2R}

const Photo=HT.Photo={T,grade,project,basis,camFov,gallery:[],S:null,
  /* public state for bots and HUD */
  get raised(){return!!(R.on)},get zoom(){return T.zoom[R.zi]},get focus(){return{locked:R.fLock,dist:R.fDist,k:R.fK}},get last(){return R.last}};
if(typeof module!=='undefined'&&module.exports)module.exports=Photo;
const hasDOM=typeof document!=='undefined'&&!!document.createElement;
const J=HT.Jobs;if(!hasDOM||!J){return}
const A=()=>J.api;

/* ---------------- runtime ---------------- */
const R={on:false,zi:0,fov:0,fK:0,fLock:false,fDist:0,fT:0,cool:0,flash:true,last:null,py:null,pp:null,turn:0,ui:null,blur:-1,lastPos:null,move:0,grade:null,gT:0,tid:0,wasAim:false,lockSnd:false,frame:null,fW:0};
/* begin/end a session (one job at a time) */
Photo.begin=function(o){Photo.S=Object.assign({job:null,subjects:()=>[],occluders:()=>[],onShot:null,stamp:null,flash:true,dark:null,canShoot:null,label:''},o||{});R.flash=Photo.S.flash!==false;R.zi=0;R.cool=0;R.last=null;R.on=false;return Photo.S};
Photo.end=function(){lower(true);Photo.S=null;if(R.ui){A().overlay('photo',null);R.ui=null}};
Photo.setZoom=function(i){i=Math.max(0,Math.min(T.zoom.length-1,i|0));if(i===R.zi)return;R.zi=i;refocus(true);blip(660+i*220,.035,.05);if(R.ui)R.ui.vf.set({zoom:T.zoom[i]+'×'});syncPills()};
Photo.toggleFlash=function(){R.flash=!R.flash;blip(R.flash?1200:700,.03,.05);syncFlash()};
Photo.raise=function(on){const a=A();if(!a||!Photo.S)return;a.P.aim=!!on};
/* point the phone at a world point (bots, cutscenes): sets the look and the turn-rate baseline */
Photo.aimAt=function(x,y,z){const a=A(),P=a.P,e=eye();const dx=x-e.x,dy=y-e.y,dz=z-e.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.max(-1.2,Math.min(1.2,Math.atan2(dy,Math.hypot(dx,dz))));R.py=P.yaw;R.pp=P.pitch};
Photo.isRaised=()=>R.on;
Photo.preview=()=>R.on?gradeNow():null;/* the live grade (bots, tests) */
function M_(){const a=A();return a&&a.M&&a.M.state==='go'?a.M:null}
function active(){const a=A(),M=M_();return!!(Photo.S&&M&&M.item==='phone'&&a.mode==='mission'&&!a.CV)}
function eye(){const a=A(),P=a.P,M=M_();const o=Photo.S&&Photo.S.eye&&Photo.S.eye();if(o)return o;return{x:P.pos.x-Math.sin(P.yaw)*.18,y:(P.crouch?1.25:1.6),z:P.pos.z-Math.cos(P.yaw)*.18}}
/* the viewfinder rectangle in NDC (the kit's .fr box), cached per screen size */
function frame(){const w=innerWidth,h=innerHeight;if(R.frame&&R.fW===w*10000+h)return R.frame;let r=null;
  const fr=R.ui&&R.ui.vf.el.querySelector('.fr');if(fr){const b=fr.getBoundingClientRect();if(b.width>40&&b.height>40)r=b}
  if(!r){const fw=Math.min(w*.56,(h-270)*16/9),fh=fw*9/16;r={left:(w-fw)/2,top:(h-fh)/2,width:fw,height:fh}}
  R.fW=w*10000+h;R.frame={x0:r.left/w*2-1,x1:(r.left+r.width)/w*2-1,y0:1-(r.top+r.height)/h*2,y1:1-r.top/h*2,px:r};return R.frame}
function camState(){const a=A(),c=a.camera,P=a.P;return{x:c.position.x,y:c.position.y,z:c.position.z,yaw:P.yaw,pitch:P.pitch,fov:c.fov,aspect:c.aspect,frame:frame()}}
/* line of sight from the lens: the level's camera solids plus the job's own props (hedges, the truck, a fence) */
const _ray={r:null,list:[]};
function solids(){const a=A(),L=a.L;const base=L?(L.camSolids||L.solids||[]):[];const extra=Photo.S&&Photo.S.occluders?Photo.S.occluders()||[]:[];return extra.length?base.concat(extra):base}
function los(p,q){const a=A(),THREE=a.THREE;if(!_ray.r)_ray.r=new THREE.Raycaster();const d=new THREE.Vector3(q.x-p.x,q.y-p.y,q.z-p.z),l=d.length();if(l<.05)return true;d.multiplyScalar(1/l);
  _ray.r.set(new THREE.Vector3(p.x,p.y,p.z),d);_ray.r.near=.05;_ray.r.far=l-.12;const h=_ray.r.intersectObjects(_ray.list,true);return!h.length}
Photo.los=(p,q)=>{_ray.list=solids();return los(p,q)};
/* focus: the centre of the frame, whatever is there first (a subject's head counts as a target) */
function centreDist(){const a=A(),THREE=a.THREE,c=a.camera;if(!_ray.r)_ray.r=new THREE.Raycaster();const dir=new THREE.Vector3(0,0,-1).applyQuaternion(c.quaternion);
  _ray.r.set(c.position,dir);_ray.r.near=.1;_ray.r.far=80;const h=_ray.r.intersectObjects(_ray.list,true);let d=h.length?h[0].distance:80;
  for(const s of(Photo.S?Photo.S.subjects():[])){if(!s||s.live===false)continue;const m={x:s.pos.x-c.position.x,y:s.pos.y+(s.mid!=null?s.mid:(s.h||1.7)/2)-c.position.y,z:s.pos.z-c.position.z};
    const t=m.x*dir.x+m.y*dir.y+m.z*dir.z;if(t<.2||t>d)continue;const px=m.x-dir.x*t,py=m.y-dir.y*t,pz=m.z-dir.z*t;if(Math.hypot(px,py,pz)<Math.max(.45,(s.h||1)*.45))d=t}
  return d}
function refocus(hard){if(hard||R.fLock){R.fT=0;R.fLock=false;R.lockSnd=false}}

/* ---------------- the phone view (JH.camera) ---------------- */
J.on('camera',dt=>{const a=A();if(!active()){if(R.on)lower();return}
  const P=a.P,want=!!P.aim;if(want&&!R.on)raise();else if(!want&&R.on){lower();return}
  if(!R.on)return;
  const c=a.camera,e=eye();
  /* slower look at higher zoom (and a steadier hand): scale this frame's mouse delta */
  if(R.py!=null){let dy=P.yaw-R.py;while(dy>Math.PI)dy-=6.2832;while(dy<-Math.PI)dy+=6.2832;const k=T.sens/Math.pow(T.zoom[R.zi],.75);P.yaw=R.py+dy*k;P.pitch=R.pp+(P.pitch-R.pp)*k;
    let d=P.yaw-R.py;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;const rate=Math.hypot(d,P.pitch-R.pp)/Math.max(dt,1/240);R.turn+=(rate-R.turn)*Math.min(1,dt*14)}
  R.py=P.yaw;R.pp=P.pitch;
  const lp=R.lastPos;if(lp){const v=Math.hypot(P.pos.x-lp.x,P.pos.z-lp.z)/Math.max(dt,1/240);R.move+=(v-R.move)*Math.min(1,dt*8)}R.lastPos={x:P.pos.x,z:P.pos.z};
  /* hand sway: a tiny breathing drift, more at 4x */
  R.t=(R.t||0)+dt;const sw=.0012*T.zoom[R.zi]*(P.crouch?.6:1);
  c.position.set(e.x,e.y,e.z);c.rotation.set(P.pitch+Math.sin(R.t*1.3)*sw,P.yaw+Math.sin(R.t*.9+1)*sw*1.3,0,'YXZ');
  const fr=frame(),tf=camFov(T.vfov[R.zi],fr.y1-fr.y0);if(!R.fov)R.fov=c.fov;R.fov+=(tf-R.fov)*Math.min(1,dt/T.zoomT*2.2);c.fov=R.fov;c.updateProjectionMatrix();
  if(P.dude)P.dude.root.visible=false;
  /* focus hunt: restart when the centre distance jumps; lock after the hunt time for this zoom */
  _ray.list=solids();R.gT-=dt;if(R.gT<=0){R.gT=1/8;const d=centreDist();if(R.fDist&&Math.abs(d-R.fDist)/R.fDist>T.refocus&&R.fLock){refocus(true)}R.fTarget=d}
  if(!R.fLock){R.fT+=dt;const H=T.hunt[R.zi];R.fK=Math.min(1,R.fT/H);if(R.fT>=H){R.fLock=true;R.fDist=R.fTarget||R.fDist||10;if(!R.lockSnd){R.lockSnd=true;beep()}}}
  if(R.cool>0)R.cool-=dt;
  liveGrade(dt);
  return true});
function raise(){const a=A();R.on=true;R.fov=0;R.py=a.P.yaw;R.pp=a.P.pitch;R.turn=0;R.move=0;R.lastPos=null;refocus(true);R.fDist=0;ui();R.ui.root.classList.add('on');R.frame=null;
  blip(520,.03,.06);syncPills();syncFlash();if(Photo.S&&Photo.S.onRaise)try{Photo.S.onRaise(true)}catch(e){}}
function lower(quiet){const a=A();if(!R.on)return;R.on=false;setBlur(0);if(R.ui){R.ui.root.classList.remove('on');R.ui.vf.set({bracket:null,stars:null})}
  if(a&&a.P&&a.P.dude)a.P.dude.root.visible=true;if(a&&a.camera){/* the normal camera eases its own FOV back */}
  if(!quiet)blip(400,.03,.05);if(Photo.S&&Photo.S.onRaise)try{Photo.S.onRaise(false)}catch(e){}}
function setBlur(px){px=Math.round(px*4)/4;if(px===R.blur)return;R.blur=px;const cv=A()&&A().camera&&window.__ht&&window.__ht.renderer?window.__ht.renderer.domElement:null;if(cv)cv.style.filter=px>0?'blur('+px+'px)':''}
/* live preview: the best subject gets a bracket and a predicted grade (8 Hz) */
function liveGrade(dt){const u=R.ui;if(!u)return;setBlur(R.fLock?0:(1-R.fK)*2.2*(window.__htHeadless?0:1));
  R.lg=(R.lg||0)-dt;if(R.lg>0)return;R.lg=1/8;const g=gradeNow();R.grade=g;const b=g.best,fr=frame(),w=innerWidth,h=innerHeight;
  if(b&&b.stars>0){const s=Photo.S.subjects().find(s=>s.id===b.id);const c=camState(),B=basis(c);const hh=s.h||1.7,top=project(c,B,{x:s.pos.x,y:s.pos.y+hh,z:s.pos.z}),bot=project(c,B,{x:s.pos.x,y:s.pos.y,z:s.pos.z}),mid=project(c,B,{x:s.pos.x,y:s.pos.y+hh/2,z:s.pos.z});
    if(top&&bot&&mid){const y0=(1-top.y)/2*h,y1=(1-bot.y)/2*h,hpx=Math.max(26,Math.abs(y1-y0)),wpx=Math.max(26,Math.min(hpx*(s.aspect||.62),fr.px.width*.6)),cx=(mid.x+1)/2*w;
      u.vf.set({bracket:{x:cx-wpx/2,y:Math.min(y0,y1),w:wpx,h:hpx,label:b.label,ok:b.stars>=2},stars:b.stars})}}
  else u.vf.set({bracket:null,stars:b?0:null});
  u.af.classList.toggle('lk',R.fLock);u.af.classList.toggle('hunt',!R.fLock);
  const why=b&&b.stars>0?b.why.filter(x=>x!=='Sharp')[0]||'':'';u.tip.textContent=why;u.tip.classList.toggle('on',!!why)}
function gradeNow(){_ray.list=solids();const c=camState();return grade(c,Photo.S?Photo.S.subjects():[],{los,zoom:T.zoom[R.zi],turn:R.turn,move:R.move,focus:{locked:R.fLock,dist:R.fDist},dark:Photo.S&&Photo.S.dark?Photo.S.dark():false,cap:Photo.S&&Photo.S.cap?Photo.S.cap():null})}

/* ---------------- the shutter ---------------- */
Photo.shoot=function(){const a=A(),S=Photo.S;if(!S||!R.on||R.cool>0)return null;if(S.canShoot&&S.canShoot()===false)return null;R.cool=T.cool;
  const g=gradeNow(),flash=R.flash,shot={id:'ph'+Date.now().toString(36)+(R.tid++),job:S.job,t:a.simT,stars:g.stars,hits:g.hits.map(h=>({id:h.id,item:h.item,label:h.label,stars:h.stars,why:h.why})),
    item:g.best&&g.best.stars>0?g.best.item:null,label:g.best&&g.best.stars>0?g.best.label:null,flash,zoom:T.zoom[R.zi],jpg:null,stamp:S.stamp?S.stamp():''};
  shutterFx(flash);shutterSnd();
  if(g.hits.some(h=>h.stars>0)||S.keepAll)shot.jpg=capture(shot.stamp);
  Photo.gallery.push(shot);if(Photo.gallery.length>40)Photo.gallery.splice(0,Photo.gallery.length-40);R.last=shot;
  if(shot.jpg&&R.ui){R.ui.thImg.src=shot.jpg;R.ui.th.classList.add('has');flyThumb(shot.jpg)}
  toast(shot);
  if(S.onShot)try{S.onShot(shot)}catch(e){console.warn('[photo] onShot',e)}
  return shot};
/* the real frame: render once (the game's own draw, post included), copy the viewfinder box out of the canvas in the same task */
function capture(stamp){const H=window.__ht;if(!H||!H.renderer)return null;try{
  const blurWas=R.blur;setBlur(0);H.draw();const src=H.renderer.domElement,fr=frame(),k=src.width/innerWidth;
  let sx=fr.px.left*k,sy=fr.px.top*k,sw=fr.px.width*k,sh=fr.px.height*k;const want=T.thumbW/T.thumbH;if(sw/sh>want){const nw=sh*want;sx+=(sw-nw)/2;sw=nw}else{const nh=sw/want;sy+=(sh-nh)/2;sh=nh}
  const c=document.createElement('canvas');c.width=T.thumbW;c.height=T.thumbH;const x=c.getContext('2d');x.drawImage(src,sx,sy,sw,sh,0,0,c.width,c.height);
  if(stamp){x.font='700 13px "Courier New",monospace';x.textAlign='right';x.textBaseline='bottom';x.shadowColor='rgba(255,120,20,.85)';x.shadowBlur=4;x.fillStyle='#ffb347';x.fillText(stamp,c.width-8,c.height-6);x.shadowBlur=0}
  R.blur=-1;setBlur(blurWas>0?blurWas:0);return c.toDataURL('image/jpeg',T.jpgQ)}catch(e){console.warn('[photo] capture failed',e);return null}}
/* flash: a burst of light anyone looking your way can see (the job decides what that costs) */
function shutterFx(flash){const u=R.ui;if(!u)return;u.vf.set({flash:true});setTimeout(()=>{if(R.ui)R.ui.vf.set({flash:false})},60);
  u.bl.classList.remove('go');void u.bl.offsetWidth;u.bl.classList.add('go');u.sh.classList.remove('go');void u.sh.offsetWidth;u.sh.classList.add('go');
  if(flash){u.fl.classList.remove('go');void u.fl.offsetWidth;u.fl.classList.add('go')}}
function flyThumb(src){const u=R.ui;if(!u)return;const fr=frame().px,tb=u.th.getBoundingClientRect();if(!tb.width)return;const im=document.createElement('img');im.className='ph-fly';im.src=src;
  Object.assign(im.style,{left:fr.left+'px',top:fr.top+'px',width:fr.width+'px',height:fr.height+'px'});u.root.appendChild(im);
  const dx=tb.left-fr.left,dy=tb.top-fr.top,s=tb.width/fr.width;
  try{im.animate([{transform:'none',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(${s})`,opacity:.9}],{duration:420,easing:'cubic-bezier(.5,0,.3,1)',fill:'forwards'}).onfinish=()=>im.remove()}catch(e){im.remove()}
  setTimeout(()=>{if(im.parentNode)im.remove()},800)}
function toast(shot){const u=R.ui;if(!u)return;const b=shot.hits.find(h=>h.stars>0);const st=b?b.stars:0;
  u.ts.innerHTML=b?`<b>${'★'.repeat(st)}<i>${'★'.repeat(3-st)}</i></b><span>${esc(b.label)}</span><small>${esc((b.why||[]).filter(x=>x!=='Sharp')[0]||'Sharp')}</small>`:`<span>Nothing the HOA can use</span><small>${esc(shot.flash?'(but the flash went off)':'Frame a violation')}</small>`;
  u.ts.classList.remove('on');void u.ts.offsetWidth;u.ts.classList.add('on');clearTimeout(u.tsT);u.tsT=setTimeout(()=>u.ts.classList.remove('on'),2200)}
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- sound: shutter, focus beep, UI blips (Web Audio through HT.Audio) ---------------- */
function au(){const Au=HT.Audio;return Au&&Au.ready&&Au.ctx?Au:null}
function blip(f,dur,v){const Au=au();if(!Au)return;const c=Au.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.004);g.gain.exponentialRampToValueAtTime(.0005,t+dur);
  o.connect(g);g.connect(Au.output||c.destination);o.start(t);o.stop(t+dur+.02)}
function beep(){blip(2350,.045,.05);setTimeout(()=>blip(2350,.05,.045),70)}
let NB=null;
function shutterSnd(){const Au=au();if(!Au)return;const c=Au.ctx,t=c.currentTime,out=Au.output||c.destination;
  if(!NB){const n=Math.floor(c.sampleRate*.08);NB=c.createBuffer(1,n,c.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2)}
  /* two-blade click-clack, a little body underneath: the sound everybody knows a phone makes */
  for(const[at,f,v,q]of[[0,3200,.34,1.6],[.075,2300,.3,1.2]]){const s=c.createBufferSource();s.buffer=NB;const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=f;bp.Q.value=q;const g=c.createGain();g.gain.value=v;
    s.connect(bp);bp.connect(g);g.connect(out);s.start(t+at);s.stop(t+at+.08)}
  const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(70,t+.09);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.1);o.connect(g);g.connect(out);o.start(t);o.stop(t+.12)}

/* ---------------- the viewfinder UI: the kit's frame + phone camera chrome ---------------- */
const SVG={flash:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  live:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5" stroke-dasharray="2 2"/><circle cx="12" cy="12" r="10"/></svg>'};
function css(){if(document.getElementById('ht-photo-css'))return;const s=document.createElement('style');s.id='ht-photo-css';s.textContent=`
.ph{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .16s;font-family:var(--ht-ui,system-ui)}
.ph.on{opacity:1}
.ph .ph-top,.ph .ph-bot{position:absolute;left:0;right:0;background:rgba(6,7,9,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.ph .ph-top{top:0;height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 calc(var(--sa-r,0px) + 22px) 0 calc(var(--sa-l,0px) + 22px)}
.ph .ph-bot{bottom:0;height:128px}
.ph button{pointer-events:auto;border:0;background:none;color:#fff;cursor:pointer;font:inherit;padding:0;-webkit-tap-highlight-color:transparent}
.ph .ph-fl{display:flex;align-items:center;gap:6px;height:30px;padding:0 11px;border-radius:15px;background:rgba(255,255,255,.12);font:700 13px/1 var(--ht-ui);letter-spacing:.12em}
.ph .ph-fl svg{width:16px;height:16px}.ph .ph-fl.on{background:#ffd60a;color:#111}.ph .ph-fl.on b::after{content:'ON'}.ph .ph-fl:not(.on) b::after{content:'OFF'}
.ph .ph-fl:not(.on) svg{opacity:.8}
.ph .ph-mid{display:flex;gap:16px;align-items:center;font:700 12px/1 var(--ht-ui);letter-spacing:.18em;color:rgba(255,255,255,.8)}
.ph .ph-mid svg{width:20px;height:20px;color:#ffd60a}.ph .ph-mid .clk{color:#fff;font-variant-numeric:tabular-nums}
.ph .ph-zoom{position:absolute;left:50%;top:-50px;transform:translateX(-50%);display:flex;gap:6px;padding:4px;border-radius:20px;background:rgba(6,7,9,.42)}
.ph .ph-zoom button{width:34px;height:34px;border-radius:50%;font:700 12px/1 var(--ht-ui);color:#fff;background:rgba(30,32,36,.75)}
.ph .ph-zoom button.on{color:#ffd60a;width:40px;height:34px;border-radius:17px;font-size:14px}
.ph .ph-modes{position:absolute;left:0;right:0;top:12px;display:flex;justify-content:center;gap:22px;font:700 12px/1 var(--ht-ui);letter-spacing:.16em;color:rgba(255,255,255,.55)}
.ph .ph-modes b{color:#ffd60a}
.ph .ph-row{position:absolute;left:0;right:0;bottom:20px;height:74px;display:flex;align-items:center;justify-content:space-between;padding:0 calc(var(--sa-r,0px) + 44px) 0 calc(var(--sa-l,0px) + 44px)}
.ph .ph-th{width:52px;height:52px;border-radius:10px;overflow:hidden;background:#222;box-shadow:inset 0 0 0 2px rgba(255,255,255,.85)}
.ph .ph-th img{width:100%;height:100%;object-fit:cover;display:block;opacity:0}.ph .ph-th.has img{opacity:1}
.ph .ph-sh{width:72px;height:72px;border-radius:50%;box-shadow:inset 0 0 0 4px #fff;display:grid;place-items:center}
.ph .ph-sh i{display:block;width:58px;height:58px;border-radius:50%;background:#fff;transition:transform .08s}
.ph .ph-sh.go i{animation:ph-press .22s ease-out}
@keyframes ph-press{0%{transform:scale(.82)}100%{transform:none}}
.ph .ph-x{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center}.ph .ph-x svg{width:24px;height:24px}
.ph .ph-af{position:absolute;left:50%;top:50%;width:76px;height:76px;margin:-38px 0 0 -38px;border:1.5px solid #ffd60a;opacity:.9;transition:transform .12s,opacity .2s}
.ph .ph-af::before,.ph .ph-af::after{content:'';position:absolute;background:#ffd60a}
.ph .ph-af::before{left:50%;top:-1px;width:1.5px;height:7px}.ph .ph-af::after{left:-1px;top:50%;width:7px;height:1.5px}
.ph .ph-af.hunt{animation:ph-hunt .38s ease-in-out infinite alternate}
.ph .ph-af.lk{transform:scale(.86);box-shadow:0 0 10px rgba(255,214,10,.5)}
@keyframes ph-hunt{0%{transform:scale(1.12)}100%{transform:scale(.94)}}
.ph .ph-af b{position:absolute;left:calc(100% + 6px);top:-2px;font:700 10px/1 var(--ht-ui);letter-spacing:.1em;color:#ffd60a;opacity:0;transition:opacity .2s}.ph .ph-af.lk b{opacity:1}
.ph .ph-tip{position:absolute;left:50%;top:calc(50% + 52px);transform:translateX(-50%);padding:4px 10px;border-radius:12px;background:rgba(6,7,9,.55);font:700 12px/1.2 var(--ht-ui);letter-spacing:.06em;color:#ffd60a;opacity:0;transition:opacity .2s;white-space:nowrap}
.ph .ph-tip.on{opacity:1}
.ph .ph-ts{position:absolute;left:50%;top:70px;transform:translate(-50%,-8px);display:flex;align-items:baseline;gap:10px;padding:8px 14px;border-radius:14px;background:rgba(10,12,16,.82);color:#fff;font:700 15px/1.1 var(--ht-ui);letter-spacing:.04em;opacity:0;transition:opacity .2s,transform .2s;white-space:nowrap}
.ph .ph-ts.on{opacity:1;transform:translate(-50%,0)}
.ph .ph-ts b{color:#ffd60a;letter-spacing:.05em}.ph .ph-ts b i{font-style:normal;color:rgba(255,255,255,.25)}.ph .ph-ts small{font-size:12px;color:rgba(255,255,255,.65);letter-spacing:.08em;text-transform:uppercase}
.ph .ph-bl{position:absolute;inset:0;background:#000;opacity:0}
.ph .ph-bl.go{animation:ph-blink .2s steps(1,end)}
@keyframes ph-blink{0%{opacity:.85}50%{opacity:0}}
.ph .ph-flash{position:absolute;inset:0;background:#fff;opacity:0}.ph .ph-flash.go{animation:ph-fls .35s ease-out}
@keyframes ph-fls{0%{opacity:1}100%{opacity:0}}
.ph .ph-fly{position:absolute;object-fit:cover;border-radius:10px;transform-origin:0 0;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.ph .ht-vf .ft{display:none}
.ph .ph-hint{position:absolute;left:0;right:0;bottom:5px;text-align:center;font:700 10px/1 var(--ht-ui);letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.45)}
.ph .ph-hint b{color:#fff;font-weight:700;padding:1px 4px;border-radius:3px;background:rgba(255,255,255,.14);margin:0 4px 0 12px}
.ht-root.touch .ph .ph-hint,.ht-root.compact .ph .ph-hint{display:none}
.ph .ph-st{display:flex;align-items:center;gap:7px;height:28px;padding:0 11px;border-radius:14px;background:rgba(255,255,255,.1);font:700 12px/1 var(--ht-ui);letter-spacing:.14em;color:#fff;transition:background .2s}
.ph .ph-st svg{width:16px;height:16px}.ph .ph-st.w1{background:rgba(255,201,74,.85);color:#111}.ph .ph-st.w2{background:rgba(255,138,60,.92);color:#111}.ph .ph-st.w3{background:#ff5a47;color:#fff;animation:ph-hunt .3s infinite alternate}
.ph .ph-st:empty{display:none}
.ph-note{position:fixed;left:50%;top:calc(var(--sa-t,0px) + 12px);transform:translate(-50%,-140%);width:min(380px,calc(100vw - 32px));display:flex;gap:10px;padding:10px 12px;border-radius:16px;background:rgba(242,242,247,.94);color:#111;
  box-shadow:0 10px 30px rgba(0,0,0,.35);font:500 14px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;z-index:30;pointer-events:none;transition:transform .32s cubic-bezier(.2,.9,.25,1.15)}
.ph-note.on{transform:translate(-50%,0)}
.ph-note .ic{flex:none;width:34px;height:34px;border-radius:9px;background:linear-gradient(#5df07b,#28c048);display:grid;place-items:center;color:#fff;font:800 15px/1 system-ui}
.ph-note .tx{flex:1;min-width:0}.ph-note .hd{display:flex;justify-content:space-between;font-weight:700;font-size:13px}.ph-note .hd span{font-weight:500;color:#777}
.ht-root.compact .ph .ph-bot{height:180px}.ht-root.compact .ph .ph-modes{display:none}
.ht-root.compact .ph .ph-row{bottom:calc(var(--sa-b,0px) + 18px);padding:0 28px}
.ht-root.compact .ph .ph-zoom{top:-52px}
.ht-root.compact .ph .ph-top{height:46px;top:calc(var(--sa-t,0px) + 0px)}
`;document.head.appendChild(s)}
function ui(){if(R.ui&&R.ui.root.isConnected)return R.ui;css();const a=A(),H=a.HUD,root=document.createElement('div');root.className='ph';
  const vf=H&&H.kit&&H.kit.viewfinder?H.kit.viewfinder():{el:document.createElement('div'),set(){return this}};root.appendChild(vf.el);
  root.insertAdjacentHTML('beforeend',`<div class="ph-af"><b>AF</b></div><div class="ph-tip"></div><div class="ph-top"><button class="ph-fl" data-ph="flash">${SVG.flash}<b></b></button>
    <div class="ph-mid"><span>${SVG.live}</span><span>HDR</span><span class="clk"></span></div><span class="ph-st"></span></div>
    <div class="ph-bot"><div class="ph-zoom">${T.zoom.map((z,i)=>`<button data-z="${i}">${z}${'×'}</button>`).join('')}</div>
    <div class="ph-modes"><span>TIME-LAPSE</span><span>SLO-MO</span><span>VIDEO</span><b>PHOTO</b><span>PORTRAIT</span><span>PANO</span></div>
    <div class="ph-hint"><b>LMB</b>Shutter<b>Wheel</b>Zoom<b>F</b>Flash<b>RMB</b>Lower</div><div class="ph-row"><button class="ph-th" data-ph="gallery"><img alt=""></button><button class="ph-sh" data-ph="shoot" aria-label="Shutter"><i></i></button><button class="ph-x" data-ph="lower" aria-label="Lower the phone">${SVG.back}</button></div></div>
    <div class="ph-ts"></div><div class="ph-flash"></div><div class="ph-bl"></div>`);
  const q=s=>root.querySelector(s);
  const u={root,vf,af:q('.ph-af'),tip:q('.ph-tip'),ts:q('.ph-ts'),bl:q('.ph-bl'),fl:q('.ph-flash'),sh:q('.ph-sh'),th:q('.ph-th'),thImg:q('.ph-th img'),clk:q('.clk'),stx:q('.ph-st'),flb:q('.ph-fl'),pills:[...root.querySelectorAll('.ph-zoom button')]};
  root.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('button');if(!b)return;e.preventDefault();e.stopPropagation();
    if(b.dataset.z!=null)Photo.setZoom(+b.dataset.z);else if(b.dataset.ph==='shoot')Photo.shoot();else if(b.dataset.ph==='flash')Photo.toggleFlash();else if(b.dataset.ph==='lower')Photo.raise(false)});
  vf.set({zoom:T.zoom[R.zi]+'×',label:'',hint:'[LMB] Shutter   [Wheel] Zoom   [F] Flash   [RMB] Lower'});
  a.overlay('photo',root);R.ui=u;R.frame=null;syncPills();syncFlash();return u}
function syncPills(){if(!R.ui)return;R.ui.pills.forEach((b,i)=>b.classList.toggle('on',i===R.zi));R.ui.vf.set({zoom:T.zoom[R.zi]+'×'})}
function syncFlash(){if(R.ui)R.ui.flb.classList.toggle('on',!!R.flash)}

/* the HUD each frame: crosshair off while raised, a phone chip, the clock and label in the top bar */
J.on('hud',st=>{const a=A(),M=a&&a.M;
  if(!Photo.S||!M||M.state!=='go'){if(R.on)lower(true);if(R.ui&&(!M||M.state!=='go')){a.overlay('photo',null);R.ui=null;setBlur(0)}return}
  if(R.on&&R.ui){st.crosshair=Object.assign({},st.crosshair,{hidden:true});st.prompt=null;const S=Photo.S;if(S.stamp)R.ui.clk.textContent=S.stamp();const sx=S.status?S.status():null;if(sx){const k=sx.v<.2?0:sx.v<.35?0:sx.v<.6?1:sx.v<.9?2:3,h='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'+sx.text;if(R.ui.stx.dataset.h!==h){R.ui.stx.dataset.h=h;R.ui.stx.innerHTML=h}R.ui.stx.className='ph-st w'+k}
    st.objective=null;st.meters=[];st.widgets=[]}
  if(M.item==='phone'){st.gadgets=(st.gadgets||[]).concat([{id:'phone',label:R.on?'Phone · '+T.zoom[R.zi]+'×':'Phone',key:a.P&&'RMB',on:R.on,icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="2" width="12" height="20" rx="2.5"/><circle cx="12" cy="18" r="1"/></svg>'}])}});
/* zoom on the wheel and flash on F while raised (capture phase: the game's wheel would swap guns) */
addEventListener('wheel',e=>{if(!R.on)return;e.stopImmediatePropagation();Photo.setZoom(R.zi+(e.deltaY<0?1:-1))},{capture:true,passive:true});
addEventListener('keydown',e=>{if(!R.on||e.repeat)return;const k=e.key.toLowerCase();if(k==='f'){Photo.toggleFlash();e.stopImmediatePropagation()}else if(k==='='||k==='+'){Photo.setZoom(R.zi+1);e.stopImmediatePropagation()}else if(k==='-'||k==='_'){Photo.setZoom(R.zi-1);e.stopImmediatePropagation()}},{capture:true});

/* ---------------- the phone item: LMB raises it, then it is the shutter ---------------- */
J.item('phone',{name:'Phone',use(M){if(!Photo.S)return;if(!R.on){Photo.raise(true);return}Photo.shoot()}});

/* ---------------- text messages: a notification card at the top of the screen ---------------- */
let NOTE=null;
Photo.notify=function(from,text,o){o=o||{};if(!NOTE){css();NOTE=document.createElement('div');NOTE.className='ph-note';NOTE.innerHTML='<div class="ic"></div><div class="tx"><div class="hd"><b></b><span>now</span></div><div class="bd"></div></div>';document.body.appendChild(NOTE)}
  NOTE.querySelector('.ic').textContent=(o.icon||from||'?').slice(0,1).toUpperCase();NOTE.querySelector('.ic').style.background=o.color||'';NOTE.querySelector('b').textContent=from;NOTE.querySelector('.bd').textContent=text;
  NOTE.classList.remove('on');void NOTE.offsetWidth;NOTE.classList.add('on');clearTimeout(NOTE.t);NOTE.t=setTimeout(()=>NOTE&&NOTE.classList.remove('on'),o.dur||4200);
  const Au=au();if(Au){blip(1568,.06,.05);setTimeout(()=>blip(2093,.09,.05),90)}};
Photo.clearNote=function(){if(NOTE)NOTE.classList.remove('on')};

/* ---------------- evidence strip / board (the result card, the board card) ---------------- */
/* items: [{id,label,photo:{jpg,stars}|null,need}] -> a DOM element (cards share this) */
Photo.board=function(items,o){css();o=o||{};const e=document.createElement('div');e.className='ph-board'+(o.cls?' '+o.cls:'');
  e.innerHTML=items.map(it=>{const p=it.photo,st=p?p.stars:0;return`<div class="ph-slot${p?' got':''}${st>=(it.need||2)?' ok':''}"><div class="im">${p&&p.jpg?`<img src="${p.jpg}" alt="">`:`<span>${esc(it.empty||'No photo')}</span>`}</div>
    <div class="lb"><b>${esc(it.label)}</b><i>${'★'.repeat(st)}<u>${'★'.repeat(3-st)}</u></i></div></div>`}).join('');
  if(!document.getElementById('ht-photo-board-css')){const s=document.createElement('style');s.id='ht-photo-board-css';s.textContent=`
.ph-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0}
.ph-slot{background:#f7f1de;border-radius:4px;padding:6px 6px 7px;box-shadow:0 3px 10px rgba(0,0,0,.35);transform:rotate(-1.2deg);color:#1a1a1a}
.ph-slot:nth-child(2n){transform:rotate(1.1deg)}.ph-slot:nth-child(3n){transform:rotate(-.4deg)}
.ph-slot .im{aspect-ratio:16/9;background:#2a2d33;display:grid;place-items:center;overflow:hidden;border-radius:2px}
.ph-slot .im img{width:100%;height:100%;object-fit:cover;display:block}.ph-slot .im span{font:700 11px/1.2 var(--ht-ui,system-ui);letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.4);text-align:center;padding:4px}
.ph-slot .lb{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:5px;font:700 12px/1.15 var(--ht-ui,system-ui);letter-spacing:.03em}
.ph-slot .lb b{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-slot .lb i{font-style:normal;color:#d9a400;letter-spacing:.02em;flex:none}.ph-slot .lb i u{text-decoration:none;color:rgba(0,0,0,.18)}
.ph-slot:not(.ok) .lb b{color:#8a3a2a}
@media (max-width:520px){.ph-board{grid-template-columns:repeat(2,minmax(0,1fr))}}`;document.head.appendChild(s)}
  return e};
})(typeof window!=='undefined'?window:globalThis);
