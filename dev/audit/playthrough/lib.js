/* shared helpers for the playthrough audit. Real key/mouse events through Playwright; the page runs live (its own rAF loop).
   open({fresh:true}) clears localStorage once per page load (a brand-new save). */
const {open:baseOpen}=require('../../ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const SHOT_DIR=path.join(__dirname,'../../../docs/audit/playthrough');
async function open(o={}){
  const r=await baseOpen({init:o.fresh===false?undefined:()=>{if(!sessionStorage.getItem('fresh')){sessionStorage.setItem('fresh','1');localStorage.clear()}},viewport:o.viewport});
  const {p}=r;r.ev=(f,a)=>p.evaluate(f,a);
  r.live=()=>r.ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
  r.pause=()=>r.ev(()=>{window.__rafOn=false});
  r.shot=async(n)=>{fs.mkdirSync(SHOT_DIR,{recursive:true});const f=path.join(SHOT_DIR,n+'.jpg');await p.screenshot({path:f,type:'jpeg',quality:80,timeout:120000}).catch(e=>console.log('shot fail',e.message));return 'docs/audit/playthrough/'+n+'.jpg'};
  /* what the player sees: objective panel, hint, prompt, marker, toasts, any open screen */
  r.ui=()=>r.ev(()=>{const H=window.__ht,q=s=>{const e=document.querySelector(s);return e&&e.offsetParent!==null?e.textContent.replace(/\s+/g,' ').trim():null};
    const tut=document.querySelector('.ht-tut');
    return{mode:H.mode,screen:H.HUD.screen,running:H.running,obj:q('.ht-obj'),hint:tut&&!tut.classList.contains('off')?tut.textContent.replace(/\s+/g,' ').trim():null,prompt:H.prompt,
      marker:H.marker?{label:H.marker.label,x:Math.round(H.marker.x),z:Math.round(H.marker.z)}:null,pos:{x:+H.P.pos.x.toFixed(1),z:+H.P.pos.z.toFixed(1)},yaw:+H.P.yaw.toFixed(2),inVan:!!H.VAN.on,job:H.JOB,
      trust:Math.round(H.prog.trust*10)/10,trustR:Math.round((H.prog.trustR||0)*10)/10,cash:(window.HT&&HT.Save&&HT.Save.data||{}).cash,cuffed:H.prog.cuffed,day:(window.HT&&HT.Save&&HT.Save.data||{}).day,
      toasts:[...document.querySelectorAll('.ht-toast,.ht-feed div,.ht-bn')].filter(e=>e.offsetParent!==null).map(e=>e.textContent.replace(/\s+/g,' ').trim()).slice(-4),
      sub:q('.ht-sub')}});
  return r}
module.exports={open,SHOT_DIR};
