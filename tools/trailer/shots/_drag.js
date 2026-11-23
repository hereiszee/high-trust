/* shared Sensible Dragway driving (js/dragstrip.js), the way dev/dragstrip-check.js drives it: real keys only.
   Space+W at the line keeps the revs in the launch window, Space up on the green, W held, feathered on wheelspin. */
const keys=new Set();
async function key(p,k,down){if(down&&!keys.has(k)){keys.add(k);await p.keyboard.down(k)}else if(!down&&keys.has(k)){keys.delete(k);await p.keyboard.up(k)}}
async function release(p){for(const k of[...keys])await key(p,k,false)}
async function toLine(s,pick){const p=s.p;
  await p.evaluate(()=>{const H=window.__ht;window.__T.flags();HT.Save.data.strip=HT.Save.data.strip||{};H.P.pos.set(274,0,292);H.VAN.pos.set(276,0,292);H.VAN.yaw=Math.PI/2;H.step(3);HT.Save.addCash(1500,'trailer')});
  for(let i=0;i<8;i++)await p.evaluate(async()=>{const H=window.__ht;H.step(1);H.ow.update(H.camera,1/30);await new Promise(r=>setTimeout(r,150))});
  const b=await p.evaluate(()=>{const d=HT.Strip.def().paddockBoard,H=window.__ht;H.P.pos.set(d.x,0,d.z+2.2);H.P.yaw=0;H.step(3);return d});
  await p.keyboard.press('e');await p.evaluate(()=>window.__ht.step(3));
  const m=await p.evaluate(()=>HT.Strip.menu());const i=m.items.findIndex(x=>pick.test(x));
  await p.keyboard.press(String((i<0?0:i)+1));await p.evaluate(()=>window.__ht.step(3));
  return{menu:m.items,picked:m.items[i<0?0:i]}}
/* one control tick: returns what happened */
async function drive(s,st){const p=s.p;const r=await p.evaluate(()=>{const S=HT.Strip.S,R=HT.Strip.state();const k=S.tree&&S.tree.key;const lt=k?JSON.parse(k):[{},{}];
    return{phase:R.run&&R.run.phase,launched:R.run&&R.run.launched,rpm:R.run&&R.run.rpm,lane:R.run&&R.run.lane,band:S.run&&S.run.spec&&S.run.spec.band,spin:S.run&&S.run.run&&S.run.run.spin,tree:lt}});
  if(!r.phase||r.phase==='done'){await release(p);return r}
  const L=r.tree[r.lane]||{};
  if(!r.launched){if(r.phase==='roll')return r;await key(p,' ',true);const want=(r.band[0]+r.band[1])/2;await key(p,'w',r.rpm<want-.04);
    if(L.green){await key(p,' ',false);await key(p,'w',true);st.green=st.green==null?st.i:st.green}}
  else await key(p,'w',(r.spin||0)<.32);
  return r}
module.exports={toLine,drive,release,key};
