module.exports=[
{key:'jump',async run(p,ok,shot){
  const r=await p.evaluate(()=>{const H=__ht;H.startMission(0);M_.calm();H.P.fp=false;
    /* open floor: a spot with nothing within 3 m */
    const L=H.L;let s=null;for(let z=3;z<L.H-3&&!s;z++)for(let x=3;x<L.W-3&&!s;x++){const X=x*2+1,Z=z*2+1;if(!H.solidAt(X,Z,3,0))s={x:X,z:Z}}
    M_.place(s.x,s.z);H.jump();const tr=M_.run(80);const air=tr.filter(t=>t[3]==='a').length/60;const apex=Math.max(...tr.map(t=>t[1]));
    /* coyote: walk off a crate, jump 0.06 s after leaving it */
    return{apex:+apex.toFixed(3),air:+air.toFixed(3),spot:s}});
  ok('jump apex 1.0-1.1 m',r.apex>=1&&r.apex<=1.1,r.apex);ok('airtime ~0.6 s',r.air>.55&&r.air<.68,r.air);
  const c=await p.evaluate(()=>{const H=__ht,P=H.P;const L=H.L;
    /* coyote: step off a ledge, press jump 0.07 s later */
    const crate=M_.tiles('c').map(t=>M_.col(t.x,t.z)).find(c=>c&&M_.approach(c).length);const cx=(crate.x0+crate.x1)/2,cz=(crate.z0+crate.z1)/2;
    const o=M_.approach(crate)[0];M_.place(cx,cz,1.15);M_.face(-o.dx,-o.dz);H.keys.w=true;let left=-1,jumped=false;
    for(let i=0;i<90;i++){M_.god();H.step(1,1/60);if(left<0&&!P.onGround){left=i}if(left>=0&&i===left+4){H.jump()}if(left>=0&&i>left+4&&P.vy>3)jumped=true}
    H.keys.w=false;
    /* buffer: press jump 0.1 s before touching down */
    M_.place(o.x,o.z);H.jump();let buf=false,pressed=-1;for(let i=0;i<120;i++){H.step(1,1/60);if(pressed<0&&!P.onGround&&P.vy<0&&P.pos.y<P.vy*-0.1+0.0){}
      if(pressed<0&&!P.onGround&&P.vy<0&&P.pos.y<1.0*0.25){pressed=i;H.jump()}if(pressed>=0&&i>pressed&&P.vy>4){buf=i-pressed;break}}
    /* crouched jump: stands, then hops */
    M_.place(o.x,o.z);P.crouch=true;H.jump();let cj=null;for(let i=0;i<40;i++){H.step(1,1/60);if(!P.onGround&&cj===null)cj={i,crouch:P.crouch}}
    return{coyote:jumped,buf,cj}});
  const tb=await p.evaluate(()=>{const H=__ht,P=H.P;const b=document.querySelector('.ht-tb[data-a=jump]');if(!b)return{exists:false};M_.place(P.pos.x,P.pos.z);
    b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7}));b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7}));H.step(3,1/60);return{exists:true,air:!H.move.onGround,vy:+H.move.vy.toFixed(2)}});
  ok('HUD touch Jump button jumps',tb.exists&&tb.air,tb);
  ok('coyote time: jump just after walking off a crate',c.coyote,c);ok('jump buffer: early press jumps on landing',c.buf>0&&c.buf<10,c.buf);ok('crouch + jump stands up then hops',c.cj&&!c.cj.crouch&&c.cj.i>=6,c.cj);
}},
{key:'crate',async run(p,ok,shot){
  const r=await p.evaluate(()=>{const H=__ht,P=H.P;H.startMission(0);M_.calm();P.fp=false;
    const crate=M_.tiles('c').map(t=>M_.col(t.x,t.z)).find(c=>c&&M_.approach(c,.25).length);const o=M_.approach(crate,.25)[0];
    /* standing jump next to it, then push forward in the air: lands on top */
    M_.place(o.x,o.z);M_.face(o.dx,o.dz);H.jump();H.step(1,1/60);H.keys.w=true;M_.run(14);H.keys.w=false;const tr=M_.run(60);const top=P.pos.y;
    const stay=M_.run(60);const still=stay.every(t=>Math.abs(t[1]-1.15)<1e-3);
    /* walk off the far side: falls, lands at ground level */
    H.keys.w=true;M_.run(60);H.keys.w=false;M_.run(30);const after=P.pos.y;
    /* running jump into it: climbs on (too deep to vault) */
    M_.place(o.x-o.dx*1.2,o.z-o.dz*1.2);M_.face(o.dx,o.dz);H.keys.w=true;M_.run(8);H.jump();const kinds=new Set();M_.run(40,1/60,()=>kinds.add(H.move.vault||'-'));H.keys.w=false;M_.run(20);
    return{top:+top.toFixed(3),still,after:+after.toFixed(3),climbTop:+P.pos.y.toFixed(3),kinds:[...kinds],o}});
  ok('standing jump + forward lands on top of a 1.15 m crate',Math.abs(r.top-1.15)<1e-3,r.top);
  ok('stands on the crate without sinking or sliding',r.still);
  ok('walks off the far side down to the ground',Math.abs(r.after)<.01,r.after);
  ok('running jump into a crate climbs onto it',r.kinds.includes('climb')&&Math.abs(r.climbTop-1.15)<1e-3,r);
  if(__SHOTS){
    await shot('on_top_of_crate',()=>{const H=__ht,P=H.P;H.startMission(3);M_.calm();P.fp=false;H.step(100);const rc=new THREE.Raycaster();const open=c=>{rc.set(new THREE.Vector3((c.x0+c.x1)/2,1.3,(c.z0+c.z1)/2),new THREE.Vector3(0,1,0));rc.far=30;return !rc.intersectObjects(H.L.solids,false).length&&!H.solidAt((c.x0+c.x1)/2,(c.z0+c.z1)/2,3.2,1.15)};const crate=M_.tiles('c').map(t=>M_.col(t.x,t.z)).filter(c=>c&&open(c))[0];
      M_.place((crate.x0+crate.x1)/2,(crate.z0+crate.z1)/2,1.15);P.yaw+=Math.PI*.75;P.pitch=-.18;M_.run(30);H.draw()});
    await shot('mid_jump_third_person',()=>{const H=__ht,P=H.P;const o=M_.approach(M_.tiles('c').map(t=>M_.col(t.x,t.z)).find(c=>c&&M_.approach(c,2.5).length),2.5)[0];
      M_.place(o.x-o.dx*1.5,o.z-o.dz*1.5);M_.face(o.dx+.6*o.dz,o.dz+.6*o.dx);P.pitch=-.12;H.keys.w=true;M_.run(20);H.jump();M_.run(14);H.keys.w=false;H.draw()});
  }
}},
{key:'vault',async run(p,ok,shot){
  /* hedges sit in the waves mission (block party) and the hub; tables in the stash mission */
  for(const [mi,ch,name] of [[3,'f','hedge'],[1,'T','stash table']]){
    const r=await p.evaluate(([mi,ch])=>{const H=__ht,P=H.P;H.startMission(mi);M_.calm();P.fp=false;
      const cands=M_.tiles(ch).map(t=>M_.col(t.x,t.z)).filter(Boolean);let res=null;
      for(const c of cands){for(const o of M_.approach(c,.9)){M_.place(o.x,o.z);M_.face(o.dx,o.dz);H.keys.w=true;M_.run(3);H.jump();const kinds=new Set();let maxY=0;
          M_.run(50,1/60,()=>{kinds.add(H.move.vault||'-');maxY=Math.max(maxY,P.pos.y)});H.keys.w=false;M_.run(10);
          const side=((P.pos.x-(c.x0+c.x1)/2)*o.dx+(P.pos.z-(c.z0+c.z1)/2)*o.dz);
          if(kinds.has('vault')){res={kinds:[...kinds],side:+side.toFixed(2),y:+P.pos.y.toFixed(3),maxY:+maxY.toFixed(2),top:c.h,inside:!!H.solidAt(P.pos.x,P.pos.z,.3,P.pos.y)};break}}
        if(res)break}
      return res||{none:true,n:cands.length}},[mi,ch]);
    ok('vaults a '+name+' and lands on the far side',r&&r.kinds&&r.side>0&&Math.abs(r.y)<.02&&!r.inside,r);
  }
  if(__SHOTS){
    await shot('mid_vault',()=>{const H=__ht,P=H.P;H.startMission(3);M_.calm();P.fp=false;H.step(100);const cands=M_.tiles('f').map(t=>M_.col(t.x,t.z)).filter(Boolean);
      for(const c of cands){for(const o of M_.approach(c,.9)){M_.place(o.x,o.z);M_.face(o.dx,o.dz);H.keys.w=true;M_.run(3);H.jump();M_.run(2);if(H.move.vault==='vault'){M_.run(10);H.keys.w=false;
            /* side-on camera so the arc reads */P.yaw+=.9;H.draw();return}H.keys.w=false;M_.run(40)}}});
  }
}},
{key:'mantle',async run(p,ok){
  const r=await p.evaluate(()=>{const H=__ht,P=H.P;H.startMission(0);M_.calm();
    /* a chest-high (1.6 m) ledge made for the test in open floor */
    const L=H.L;let s=null;for(let z=3;z<L.H-3&&!s;z++)for(let x=3;x<L.W-3&&!s;x++){const X=x*2+1,Z=z*2+1;if(!H.solidAt(X,Z,3.5,0))s={x:X,z:Z}}
    const c={x0:s.x-1,z0:s.z,x1:s.x+1,z1:s.z+2,h:1.6};L.colliders.push(c);
    M_.place(s.x,s.z-.9);M_.face(0,1);const kinds=new Set();
    /* plain jump without moving: cannot reach the top */
    H.jump();M_.run(50);const plain=P.pos.y;
    H.keys.w=true;M_.run(2);H.jump();M_.run(60,1/60,()=>kinds.add(H.move.vault||'-'));H.keys.w=false;M_.run(10);const y=P.pos.y;
    L.colliders.splice(L.colliders.indexOf(c),1);return{plain:+plain.toFixed(3),kinds:[...kinds],y:+y.toFixed(3)}});
  ok('a 1.6 m ledge is out of reach of a plain jump',r.plain<.01,r.plain);
  ok('jump while moving into a chest-high ledge mantles onto it',r.kinds.includes('mantle')&&Math.abs(r.y-1.6)<1e-3,r);
}},
{key:'fuzz',async run(p,ok){
  for(let mi=0;mi<4;mi++){
    const r=await p.evaluate(mi=>{const H=__ht,P=H.P;H.startMission(mi);let seed=1234+mi;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
      let bad=[],below=0,maxY=0,jumps=0,vaults=0,lastV=null;P.pos.copy(H.L.start);
      for(let i=0;i<2000;i++){if(i%18===0){M_.keysOff();for(const k of['w','a','s','d'])if(rnd()<.35)H.keys[k]=true;if(rnd()<.25)H.keys.shift=true;P.yaw+=(rnd()-.5)*1.6}
        if(rnd()<.06){H.jump();jumps++}if(rnd()<.01)P.crouch=!P.crouch;
        P.hp=100;H.step(1,1/30);const m=H.move;if(m.vault&&m.vault!==lastV)vaults++;lastV=m.vault;
        if(!m.vault){const s=H.solidAt(P.pos.x,P.pos.z,.28,P.pos.y);if(s&&bad.length<5)bad.push({i,x:+P.pos.x.toFixed(2),z:+P.pos.z.toFixed(2),y:+P.pos.y.toFixed(2),c:[s.x0,s.z0,s.x1,s.z1,s.h]})}
        const g=H.ground(P.pos.x,P.pos.z);if(P.pos.y<g-.02&&!m.vault)below++;maxY=Math.max(maxY,P.pos.y)}
      M_.keysOff();return{mi,bad,below,maxY:+maxY.toFixed(2),jumps,vaults,state:H.M.state}},mi);
    ok('fuzz mission '+mi+': 2000 random steps never inside a solid or under the ground',!r.bad.length&&!r.below,r);
  }
}},
{key:'curb',async run(p,ok){
  const r=await p.evaluate(()=>{const H=__ht,P=H.P;H.enterHub();H.step(2);M_.calm();const L=H.L;
    /* a straight line that goes sidewalk -> road -> sidewalk with nothing solid in the way */
    let line=null;for(let z=2;z<L.H-2&&!line;z++)for(let x=2;x<L.W-10&&!line;x++){const X=x*2+1,Z=z*2+1;
      if(H.ground(X,Z)!==0||H.ground(X+2,Z)>-.1)continue;let k=2;while(k<10&&H.ground(X+k*2,Z)<-.1)k++;if(k>=10||H.ground(X+k*2,Z)!==0)continue;
      let free=true;for(let t=0;t<=k*2+2;t+=.25)if(H.solidAt(X+t,Z,.45,-.12)){free=false;break}if(free)line={X,Z,len:k*2+2}}
    if(!line)return{none:true};M_.place(line.X,line.Z);M_.face(1,0);H.keys.w=true;const ys=[],vs=[];let maxDv=0,prevV=P.visY;
    for(let i=0;i<Math.ceil(line.len/4.3*60);i++){M_.god();H.step(1,1/60);ys.push(+P.pos.y.toFixed(3));maxDv=Math.max(maxDv,Math.abs(P.visY-prevV));prevV=P.visY}H.keys.w=false;
    return{line,dist:+(P.pos.x-line.X).toFixed(2),minY:Math.min(...ys),endY:ys[ys.length-1],maxStep:+maxDv.toFixed(3),airFrames:0}});
  ok('hub curbs: walk off and back up a 12 cm curb without stopping',r.line&&r.dist>r.line.len*.9&&r.minY<-.1&&Math.abs(r.endY)<.01,r);
  ok('curb steps are smoothed for the camera (<4 cm per frame)',r.maxStep<.04,r.maxStep);
}},
{key:'ammo',async run(p,ok,shot){
  const r=await p.evaluate(()=>{const H=__ht,P=H.P;H.startMission(0);M_.calm();P.fp=false;const out={};
    const L=H.L;let s=null;for(let z=3;z<L.H-3&&!s;z++)for(let x=3;x<L.W-3&&!s;x++){const X=x*2+1,Z=z*2+1;if(!H.solidAt(X,Z,3,0))s={x:X,z:Z}}
    M_.place(s.x,s.z);M_.face(1,0);const t='9mm';
    /* dropped box: walk into reach */
    P.pool[t]=20;H.pickups.slice().forEach(()=>{});const box=H.dropAt('pistol',s.x+2.6,s.z);/* a pistol drop of a carried type */
    const before=P.pool[t];H.keys.w=true;M_.run(30);H.keys.w=false;M_.run(12);out.gun={before,after:P.pool[t],left:H.pickups.includes(box)};
    out.toast=[...document.querySelectorAll('.ht-fi span')].map(d=>d.textContent);
    /* ammo bag tile 'a' */
    const bag=L.ammo.find(a=>!a.got);P.pool[t]=10;M_.place(bag.x-2.2,bag.z);M_.face(1,0);H.keys.w=true;M_.run(40);H.keys.w=false;M_.run(14);out.bag={got:bag.got,pool:P.pool[t],inScene:!!bag.mesh.parent};
    /* full: nothing taken, one message */
    P.pool[t]=H.AMMO[t].cap;P.fullSaid=null;const g2=H.dropAt('pistol',P.pos.x+.6,P.pos.z);for(const d of document.querySelectorAll('.ht-fi span'))d.remove();M_.run(30);
    out.full={stays:H.pickups.includes(g2),msgs:[...document.querySelectorAll('.ht-fi span')].map(d=>d.textContent)};
    /* an ammo box of a type you have room for */
    P.pool[t]=50;const ab=H.pickups.length;H.L.pickups;const o={ammo:{type:t,n:17},x:P.pos.x+1.0,z:P.pos.z+.2,src:'crate'};
    return out});
  ok('walking over a dropped gun of a carried type takes its ammo, no key',r.gun.after>r.gun.before&&!r.gun.left,r.gun);
  ok('toast shows the amount',r.toast.some(t=>/^\+\d+ 9mm$/.test(t)),r.toast);
  ok('ammo bag collects automatically and flies to you',r.bag.got&&r.bag.pool>10&&!r.bag.inScene,r.bag);
  ok('full pouch: pickup stays and says "9mm full" once',r.full.stays&&r.full.msgs.filter(m=>m==='9mm full').length===1,r.full);
  const r2=await p.evaluate(()=>{const H=__ht,P=H.P;P.pool['9mm']=40;P.fullSaid=null;
    /* a non-carried gun still needs hold-E */
    const g=H.dropAt('rifle',P.pos.x+.5,P.pos.z);M_.run(20);return{stays:H.pickups.includes(g),weapons:P.weapons.slice()}});
  ok('a gun you do not carry is not auto-taken (hold E prompt)',r2.stays&&!r2.weapons.includes('rifle'),r2);
  if(__SHOTS)await shot('ammo_toast',()=>{const H=__ht,P=H.P;H.startMission(0);M_.calm();P.fp=false;H.step(100);
    const L=H.L;let s=null;for(let z=3;z<L.H-3&&!s;z++)for(let x=3;x<L.W-3&&!s;x++){const X=x*2+1,Z=z*2+1;if(!H.solidAt(X,Z,4,0))s={x:X,z:Z}}
    M_.place(s.x,s.z);M_.face(1,.3);P.pitch=-.2;P.pool['9mm']=30;for(const d of document.querySelectorAll('.ht-fi span'))d.remove();
    H.dropAt('pistol',P.pos.x-Math.sin(P.yaw)*2.4,P.pos.z-Math.cos(P.yaw)*2.4);H.keys.w=true;M_.run(24);H.keys.w=false;M_.run(4);H.draw()});
}},
{key:'crew',async run(p,ok){
  const r=await p.evaluate(()=>{const H=__ht,P=H.P;H.startMission(3);M_.calm();
    const cands=M_.tiles('f').map(t=>M_.col(t.x,t.z)).filter(Boolean);let res=null;
    const nav=H.L.nav;for(const c of cands){for(const o of M_.approach(c,.9)){if(!nav.path(o.x-o.dx*1.5,o.z-o.dz*1.5,o.x+o.dx*8,o.z+o.dz*8)||!nav.path(H.allies[0].pos.x,H.allies[0].pos.z,o.x,o.z))continue;M_.place(o.x,o.z);for(const a of H.allies){a.pos.set(o.x-o.dx*1.5,0,o.z-o.dz*1.5)}M_.face(o.dx,o.dz);M_.run(30,1/30);
        H.keys.w=true;M_.run(3);H.jump();M_.run(30);if(!H.move.vault&&((P.pos.x-o.x)*o.dx+(P.pos.z-o.z)*o.dz)>2){M_.run(40,1/30);H.keys.w=false;if(((P.pos.x-o.x)*o.dx+(P.pos.z-o.z)*o.dz)<6){continue}
          /* stand still past the hedge; the crew has to path around it */
          M_.run(240,1/30);const cx=(c.x0+c.x1)/2,cz=(c.z0+c.z1)/2,side=q=>(q.x-cx)*o.dx+(q.z-cz)*o.dz;res={d:H.allies.map(a=>+Math.hypot(a.pos.x-P.pos.x,a.pos.z-P.pos.z).toFixed(1)),across:H.allies.map(a=>side(a.pos)>0),inside:H.allies.filter(a=>H.solidAt(a.pos.x,a.pos.z,.28,0)).length};break}H.keys.w=false}
      if(res)break}
    return res||{none:true}});
  const r2=await p.evaluate(()=>{const H=__ht,P=H.P;H.startMission(3);M_.calm();
    /* the pocket behind the mission van, closed off on the nav grid by the van, a hedge row and the edge trees */
    M_.place(3,5);M_.face(0,-1);const before=H.allies.map(a=>!!H.L.nav.path(a.pos.x,a.pos.z,P.pos.x,P.pos.z));M_.run(300,1/30);return{reachable:before,d:H.allies.map(a=>+Math.hypot(a.pos.x-P.pos.x,a.pos.z-P.pos.z).toFixed(1))}});
  ok('crew catches up (within 8 m in 10 s) when the dad is somewhere the grid cannot reach',r2.d.every(d=>d<8),r2);
  ok('crew paths around the hedge after the dad vaults it (all across, within 8 m, in 8 s)',r.d&&r.d.every(d=>d<8)&&r.across.every(Boolean)&&!r.inside,r);
}},
{key:'fpshot',async run(p,ok,shot){
  if(!__SHOTS)return;
  await shot('first_person_jump',()=>{const H=__ht,P=H.P;H.startMission(1);M_.calm();P.fp=true;P.pitch=-.05;H.step(100);H.jump();M_.run(5);H.draw()});
  await shot('first_person_vault',()=>{const H=__ht,P=H.P;H.startMission(3);M_.calm();P.fp=true;H.step(100);const cands=M_.tiles('f').map(t=>M_.col(t.x,t.z)).filter(Boolean);
    for(const c of cands){for(const o of M_.approach(c,.9)){M_.place(o.x,o.z);M_.face(o.dx,o.dz);P.pitch=-.15;H.keys.w=true;M_.run(3);H.jump();M_.run(2);if(H.move.vault==='vault'){M_.run(9);H.keys.w=false;H.draw();return}H.keys.w=false;M_.run(40)}}});
}},
{key:'missions',async run(p,ok){
  for(let i=0;i<4;i++){const t0=Date.now();
    const r=await p.evaluate(i=>{const H=__ht;H.startMission(i);const L=H.L,M=()=>H.M;
      const god=()=>{const P=H.P;P.hp=100;for(const w of P.weapons){const a=P.ammo[w];if(a){a.res=999;if(a.mag<=0&&P.reloadT<=0)a.mag=3}}};
      const aim=p=>{const P=H.P;const eye=P.pos.clone().add(new THREE.Vector3(0,P.crouch?1.15:1.65,0));const d=p.clone().sub(eye);P.yaw=Math.atan2(-d.x,-d.z);P.pitch=Math.asin(d.y/d.length())};
      const live=()=>H.enemies.filter(e=>e.state==='idle');
      const engage=e=>{const P=H.P;P.fp=true;P.aim=true;let n=0;while(e.state==='idle'&&n<400){const dx=P.pos.x-e.pos.x,dz=P.pos.z-e.pos.z,dd=Math.hypot(dx,dz);
          if(dd>6||dd<2||n%40===0){for(let k=0;k<24;k++){const a=Math.atan2(dx,dz)+k/24*6.28,px=e.pos.x+Math.sin(a)*3.5,pz=e.pos.z+Math.cos(a)*3.5;if(!H.solidAt(px,pz,.4,0)){P.pos.set(px,0,pz);break}}}
          god();H.scene.updateMatrixWorld();aim(e.pos.clone().setY(1.3));H.mouse=true;H.step(1);n++}H.mouse=false;P.fp=false;P.aim=false;H.step(1)};
      const clearAll=()=>{for(let k=0;k<40;k++){const l=live();if(!l.length)break;l.sort((a,b)=>a.pos.distanceTo(H.P.pos)-b.pos.distanceTo(H.P.pos));engage(l[0])}
        for(const e of H.enemies)if(e.state==='surrender')for(let k=0;k<30&&e.state==='surrender';k++){H.P.pos.set(e.pos.x+.9,0,e.pos.z);god();H.use=true;H.step(1)}};
      const hold=(x,z,n)=>{for(let k=0;k<n;k++){H.P.pos.set(x,0,z);god();H.keys.e=true;H.step(1)}H.keys.e=false};
      const t=M().def.type;
      if(t==='loot'){clearAll();for(const it of L.items)if(!it.got)hold(it.x,it.z,40)}
      if(t==='stash'){clearAll();for(const s of L.stashes)if(!s.done)hold(s.x,s.z,60)}
      if(t==='waves'){for(let k=0;k<40&&M().state==='go';k++){clearAll();for(let j=0;j<6;j++){god();H.step(30)}}}
      if(t==='boss')clearAll();
      if(M().state==='go'&&M().exitOpen)for(let k=0;k<20&&M().state==='go';k++){H.P.pos.set(L.exit.x,0,L.exit.z);god();H.step(1)}
      return{i,state:M().state}},i);
    ok('mission '+i+' completes by script',r.state==='won',Object.assign(r,{sec:Math.round((Date.now()-t0)/1000)}));}
}},

];
