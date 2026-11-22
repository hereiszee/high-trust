/* Walk west from the front of the house with real keys (S = walk backwards from the spawn facing east) and see where the town ends.
   node dev/audit/playthrough/west-edge.js */
const {open}=require('./lib.js');
(async()=>{const r=await open({fresh:true}),{p,b}=r;await r.live();await p.waitForTimeout(1000);await p.click('.ht-title [data-act=newgame]');await p.waitForTimeout(5000);
  const cv=await p.$eval('#c',c=>{const q=c.getBoundingClientRect();return{x:q.x+q.width/2,y:q.y+q.height/2}});await p.mouse.click(cv.x,cv.y);await p.waitForTimeout(500);
  const pos=()=>r.ev(()=>({x:+window.__ht.P.pos.x.toFixed(1),z:+window.__ht.P.pos.z.toFixed(1),yaw:+window.__ht.P.yaw.toFixed(2),region:window.__ht.region}));
  console.log('start',await pos());await p.keyboard.down('s');let last=null;
  for(let i=0;i<40;i++){await p.waitForTimeout(3000);const q=await pos();console.log(i*3+'s',JSON.stringify(q));if(last&&Math.abs(last.x-q.x)<.2&&i>3)break;last=q}
  await p.keyboard.up('s');
  /* turn around to look west with the mouse (cursor-free fallback) */
  for(let k=0;k<8;k++){await p.mouse.move(cv.x-200,cv.y,{steps:4});await p.mouse.move(cv.x,cv.y)};await p.waitForTimeout(800);console.log('looking',await pos());
  console.log(await r.shot('west-edge'));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
