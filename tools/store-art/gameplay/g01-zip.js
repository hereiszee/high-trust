module.exports={w:1920,h:1080,hud:true,frame:'__ht.draw()',settle:6,run:`
T_.game();const H=__ht;H.startMission(0);H.step(5);
for(let i=0;i<60&&HT.People.pending.length;i++)await new Promise(r=>setTimeout(r,500));
H.step(30);
const P=H.P,E=H.enemies.filter(e=>e.state==='idle');
const e=E[0];for(const o of E.slice(1))o.pos.x+=300;
e.state='surrender';e.surrAt=0;e.target=null;H.dude.equip(e.dude,null);
P.fp=false;P.aim=false;P.pos.set(e.pos.x+1.6,0,e.pos.z+0.9);P.yaw=Math.atan2(P.pos.x-e.pos.x,P.pos.z-e.pos.z);P.pitch=-.12;
for(let i=0;i<40;i++){P.pos.set(e.pos.x+1.6,0,e.pos.z+0.9);P.yaw=Math.atan2(P.pos.x-e.pos.x,P.pos.z-e.pos.z);H.step(1)}
window.__E=e;return {st:e.state,n:H.enemies.length}`};
