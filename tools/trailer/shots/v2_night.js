/* v2 NIGHT (G, HUD on): Riverside Flats after dark (the game's night: setNight(1), lamps and windows lit), the dad on foot with his
   flashlight (F) up a dark street. Its beam finds two of a street crew loitering by a parked car; they put their hands up (the game's
   surrender). Holstered: nobody draws. Gameplay camera pulled in over the shoulder. */
module.exports={frames:125,from:48,warm:4,
  async stage(s){const r=await s.p.evaluate(async()=>{const H=window.__ht,T=window.__T,O=H.ow,G=O.roads();
      await T.cast(['thug_hoodie','thug_cap','thug_track','thug_f_hood','thug_beanie','thug_red','thug_jacket']);H.openBridge();T.flags();
      const edges=[];for(const [i,n] of G.nodes.entries())for(const e of n.e){const m=G.nodes[e.to],l=Math.hypot(m.x-n.x,m.z-n.z);const rg=O.regionAt((n.x+m.x)/2,(n.z+m.z)/2);if(l>=26&&(/river/.test(rg)||(n.x+m.x)/2>340))edges.push({a:i,b:e.to,l,rg})}
      if(!edges.length)return{err:'no riverside edge'};
      edges.sort((p,q)=>q.l-p.l);const E=edges[Math.min(1,edges.length-1)],A=G.nodes[E.a],B=G.nodes[E.b],ux=(B.x-A.x)/E.l,uz=(B.z-A.z)/E.l;
      /* on the pavement (5 m off the centre line), facing down the street */const sx=-uz*5,sz=ux*5;
      const P=H.P;P.pos.set(A.x+ux*4+sx,0,A.z+uz*4+sz);H.collide(P.pos,.35);P.yaw=Math.atan2(-ux,-uz);P.pitch=-.08;H.step(4);
      for(let k=0;k<10;k++){H.step(3);await new Promise(r=>setTimeout(r,300))}
      const crews=H.crews||[];const id=(crews[0]&&crews[0].id)||crews[0]||'birch';const at=[A.x+ux*19+sx*.9,A.z+uz*19+sz*.9];
      let g=null;try{g=H.spawnCrew(id,at[0],at[1],2,{})}catch(e){return{err:'spawn '+e.message,crews:crews.map(c=>c.id||c)}}
      window.__crew=g&&g.members||[];window.__dir=[ux,uz];
      H.setNight(1);H.flash(true);for(let k=0;k<8;k++){H.step(3);await new Promise(r=>setTimeout(r,300))}
      return{E,P:[P.pos.x,P.pos.z],crew:window.__crew.map(e=>[+e.pos.x.toFixed(1),+e.pos.z.toFixed(1),e.state]),night:H.night.k,flash:H.night.flash}});console.log('  ',JSON.stringify(r));
    await s.p.evaluate(()=>{const H=window.__ht,P=H.P;window.__camFn=cam=>{const piv=new THREE.Vector3(P.pos.x,P.visY+1.55,P.pos.z);cam.position.lerp(piv,.22)}})},
  async after(s){await s.p.evaluate(()=>window.__R.subBig())},
  frame:i=>{const H=window.__ht,P=H.P,c=window.__crew||[];const t0=c[0];H.keys.w=i>=4&&(!t0||Math.hypot(t0.pos.x-P.pos.x,t0.pos.z-P.pos.z)>8.2);H.keys.shift=false;P.hp=100;
    const t=c[0];if(t){/* the beam sweeps across the yards, then settles on them */const y=Math.atan2(-(t.pos.x-P.pos.x),-(t.pos.z-P.pos.z));const sweep=i<40?Math.sin(i/40*Math.PI)*.45:0;
      let d=y+sweep-P.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));P.yaw+=d*.12;P.pitch+=(-.04-P.pitch)*.1;
      const dd=Math.hypot(t.pos.x-P.pos.x,t.pos.z-P.pos.z);if(dd<8.5&&!window.__sur){window.__sur=i;window.__T.ev('hands');for(const e of c)try{H.surrender(e)}catch(_){}}}}};
