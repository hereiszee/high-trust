module.exports={w:1920,h:1080,hud:true,frame:'__ht.draw()',settle:5,run:`
T_.game();const H=__ht;H.startMission(0);H.step(5);
for(let i=0;i<60&&HT.People.pending.length;i++)await new Promise(r=>setTimeout(r,500));
H.step(30);
const P=H.P,E=H.enemies.filter(e=>e.state==='idle');const e=E[0];for(const o of E.slice(1))o.pos.x+=300;
e.state='surrender';e.surrAt=0;e.target=null;H.dude.equip(e.dude,null);
const hide=()=>{for(const a of H.allies){a.pos.set(P.pos.x-30,0,P.pos.z-30);if(a.dude)a.dude.root.visible=false}};
const ex=e.pos.x,ez=e.pos.z;
for(let i=0;i<50;i++){P.fp=false;P.aim=false;P.pos.set(ex+2.6,0,ez+0.5);P.yaw=Math.atan2(P.pos.x-ex,P.pos.z-ez)+0.28;P.pitch=-.2;e.pos.set(ex,0,ez);hide();H.step(1)}
window.__E=e;window.__hide=hide;return {st:e.state}`};
