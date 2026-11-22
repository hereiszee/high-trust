/* shared helpers for the input audit probes (dev/audit/input/*.js). Reuses dev/ai-ingame-lib.js (rAF held; __ht.step drives the sim). */
const {open}=require('../../ai-ingame-lib.js'),{FAKE_PAD}=require('../../../desktop/test/fake-pad.js'),path=require('path'),fs=require('fs');
const SHOTS=path.join(__dirname,'../../../docs/audit/input');
async function boot(o={}){const r=await open(o);const p=r.p;const ev=(f,a)=>p.evaluate(f,a);
  r.ev=ev;r.step=n=>ev(n=>window.__ht.step(n),n);
  r.shot=async name=>{fs.mkdirSync(SHOTS,{recursive:true});await ev(()=>{try{window.__ht.draw()}catch(e){}});await p.screenshot({path:path.join(SHOTS,name+'.png')});return 'docs/audit/input/'+name+'.png'};
  r.pad=async(ps)=>{await ev(FAKE_PAD);if(ps)await ev(id=>{window.__pad.pad.id=id},ps);
    await ev(()=>{const T=window.__T={keys:[],t:1000};for(const ty of['keydown','keyup'])addEventListener(ty,e=>{if(!e.isTrusted)T.keys.push(ty[3]==='d'?e.key:'^'+e.key)},true);
      T.tick=(n=1)=>{for(let i=0;i<n;i++){T.t+=16;HT.Pad._tick(T.t)}};T.set=o=>{window.__pad.set(o);T.tick()};
      T.tap=(i,n=2)=>{T.set({buttons:{[i]:1}});T.tick(n);T.set({buttons:{[i]:0}});T.tick()};T.clear=()=>{T.keys.length=0}})};
  /* real-time wait while ticking the pad loop (setTimeouts in the page get to run) */
  r.wait=async ms=>{await p.waitForTimeout(ms)};
  r.focus=()=>ev(()=>{const f=document.querySelector('.pad-focus');return f?(f.getAttribute('data-act')||f.getAttribute('data-tab')||'')+' "'+f.textContent.trim().slice(0,40)+'"':null});
  return r}
/* every visible text a pad player would read that still names a keyboard / mouse input */
/* o.pad: A B X Y are the controller's own face buttons, not keyboard keys */
const LEAK_SRC=(o)=>{const pad=!!(o&&o.pad);const vis=e=>{for(let x=e;x&&x!==document.documentElement;x=x.parentElement){if(x.hidden)return false;const cs=getComputedStyle(x);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false}const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth};
  const out=[];const KEYCAP=/^(E|G|R|F|Q|T|Z|V|C|H|M|N|B|K|L|P|W|S|D|Tab|Space|Shift|Esc|Enter|Ctrl|Click|Wheel|Mouse ?\d|LMB|RMB|[0-9])$/i;
  const L=pad?'EGRFQTZVCHMNKWS':'EGRFQTZVCHMNBXKWS';const SENT=new RegExp('(\\b(right|left)[- ]click|\\bclick\\b|\\bClick\\b|\\bEsc\\b|\\bEnter\\b|\\bSpace\\b|\\bShift\\b|\\bTab\\b|\\bMouse ?[12]\\b|\\bwheel\\b|\\bW ?A ?S ?D\\b|(^|[\\s(\\[·:])['+L+'](\\s*(·|to |:|\\/|\\]|\\)|$))|\\b(press|hold|tap|Press|Hold|Tap)\\s+['+L+']\\b)');
  for(const e of document.querySelectorAll('.ht-kc,kbd,#deco i')){if(e.closest('.ht-keys,.ht-paddia'))continue;if(!vis(e))continue;const t=e.textContent.trim();if(e.classList.contains('pad-g'))continue;if(KEYCAP.test(t))out.push({kind:'keycap',text:t,where:(e.parentElement&&e.parentElement.textContent.trim().slice(0,80))})}
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);for(let n=w.nextNode();n;n=w.nextNode()){const pe=n.parentElement;if(!pe||pe.closest('script,style,.ht-keys,.ht-paddia,.ht-kc,kbd,#deco i'))continue;const t=n.nodeValue.trim();if(!t||t.length<2||!SENT.test(t))continue;if(!vis(pe))continue;out.push({kind:'text',text:t.slice(0,140)})}
  const seen=new Set();return out.filter(x=>{const k=x.kind+x.text;if(seen.has(k))return false;seen.add(k);return true})};
module.exports={boot,LEAK_SRC,SHOTS,FAKE_PAD};
