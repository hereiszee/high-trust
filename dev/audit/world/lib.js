/* shared helpers for the world audit probes (dev/audit/world/*.js). One headless browser at a time.
   open(): dev/ai-ingame-lib.js open() + a fresh game started from the title with a real click, the page's loop paused;
   step(n): advance the sim n frames (30 fps) and stream the open world like the draw pass would. */
const {open:open0,ROOT}=require('../../ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const SHOTDIR=path.join(ROOT,'docs/audit/world');
async function open(o={}){const r=await open0(o);const {p}=r;
  await p.click('.ht-title [data-act=newgame]',{timeout:5000}).catch(()=>p.evaluate(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));
  await p.waitForTimeout(400);
  /* a "new game" over an existing save asks first; accept it */
  await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&/start over|new game|overwrite/i.test(b.textContent)&&b.closest('.ht-dialog,.dialog,[role=dialog]'));if(b)b.click()}).catch(()=>{});
  await p.waitForTimeout(300);
  const ev=(f,a)=>p.evaluate(f,a);
  r.ev=ev;
  r.step=(n=1)=>ev(n=>{const H=window.__ht;for(let i=0;i<n;i+=6){H.step(Math.min(6,n-i));if(H.ow&&H.ow.update)H.ow.update(H.camera)}},n);
  r.held=new Set();
  r.key=async(k,down)=>{if(down&&!r.held.has(k)){r.held.add(k);await p.keyboard.down(k)}else if(!down&&r.held.has(k)){r.held.delete(k);await p.keyboard.up(k)}};
  r.release=async()=>{for(const k of [...r.held])await r.key(k,false)};
  r.tap=async(k)=>{await p.keyboard.press(k)};
  r.shot=async(name,o={})=>{fs.mkdirSync(SHOTDIR,{recursive:true});await ev(o=>{const H=window.__ht;if(o.hideHud)for(const el of document.body.querySelectorAll('body > *'))if(el!==H.renderer.domElement&&el.style&&!el.contains(H.renderer.domElement))el.style.visibility='hidden';H.draw();H.draw()},o);
    const f=path.join(SHOTDIR,name+'.jpg');await p.screenshot({path:f,type:'jpeg',quality:80});await ev(()=>{for(const el of document.body.querySelectorAll('body > *'))if(el.style)el.style.visibility=''});return 'docs/audit/world/'+name+'.jpg'};
  r.feed=()=>ev(()=>[...document.querySelectorAll('.ht-feed *, #feed *, .feed *')].map(e=>e.textContent).filter(Boolean).slice(-12));
  return r}
let fails=0;const out=[];
const log=(...a)=>{const s=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ');out.push(s);console.log(s)};
const ok=(c,m,x)=>{if(!c)fails++;log((c?'ok   ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''))};
module.exports={open,ROOT,log,ok,get fails(){return fails},out,SHOTDIR};
