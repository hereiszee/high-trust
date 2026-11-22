/* Static sweep (IN-16): every string literal in index.html and js/**.js that names a keyboard / mouse input is run through the
   real prompt helper (js/gamepad.js keyText, js/keys.js labels) as a controller player would see it, and as a keyboard player with
   every action rebound would. Prints what still leaks. No browser.
   node dev/prompt-sweep.js [--all]      exit 1 when something leaks (lines marked // prompt-ok are skipped) */
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
function files(d,out=[]){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const s=fs.statSync(p);if(s.isDirectory())files(p,out);else if(/\.js$/.test(f))out.push(p)}return out}
const SRC=[path.join(ROOT,'index.html'),...files(path.join(ROOT,'js')).filter(f=>!/gamepad\.js$|keys\.js$/.test(f))];/* the helper itself and the bindings table */
/* a page-ish sandbox with HT.Keys and HT.Pad loaded */
function sandbox(){const store={};const ls={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
  const doc={documentElement:{classList:{toggle(){},contains(){return false}}},querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},getElementById:()=>null,createTreeWalker:()=>({nextNode:()=>null}),body:{}};
  const w={localStorage:ls,document:doc,navigator:{getGamepads:()=>[]},addEventListener(){},removeEventListener(){},requestAnimationFrame:()=>1,setTimeout,clearTimeout,performance:{now:()=>0},
    MutationObserver:function(){this.observe=()=>{};this.disconnect=()=>{}},KeyboardEvent:function(){},MouseEvent:function(){},WheelEvent:function(){},NodeFilter:{SHOW_TEXT:4},getComputedStyle:()=>({}),console};
  w.window=w;w.HT={};w.HT.Input={driving:false,mode:'hub',running:true};const ctx=vm.createContext(w);
  for(const f of['js/keys.js','js/gamepad.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});return w}
const W=sandbox(),HT=W.HT;
/* what a leak looks like (dev/audit/input/lib.js LEAK_SRC's sentence test) */
const SENT=/(\b(right|left)[- ]click|\bclick\b|\bClick\b|\bEsc\b|\bSpace\b|\bShift\b|\bTab\b|\bMouse ?[12]\b|\bwheel\b|\bW ?A ?S ?D\b|(^|[\s(\[·:])[EGRFQTZVCHMN](\s*(·|to |:|\/|\]|\)|$))|\b(press|hold|tap|Press|Hold|Tap)\s+[EGRFQTZVCHMNKWS]\b)/;/* A B X Y are the pad's own face buttons */
const CAND=/(\b(right|left)[- ]?click|\bclick\b|\bEsc\b|\bShift\b|\bSPACE\b|\bMouse ?[12]\b|\bRMB\b|\bLMB\b|\bWASD\b|(^|[\s(\[·:])[EGRFQTZVCHMNBX](\s*(·|to |:|\/)|$)|\b(press|hold|tap)\s+[EGRFQTZVCHMNBXWS]\b)/i;
const strs=[];
for(const f of SRC){const txt=fs.readFileSync(f,'utf8');const lines=txt.split('\n');
  lines.forEach((ln,i)=>{if(/prompt-ok/.test(ln))return;const rx=/'((?:[^'\\\n]|\\.){3,200})'|"((?:[^"\\\n]|\\.){3,200})"|`((?:[^`\\\n$]|\\.){3,200})`/g;let m;
    while((m=rx.exec(ln))){const s=(m[1]||m[2]||m[3]||'').replace(/\\'/g,"'");if(!/\s/.test(s)||/^[\w.#\-\[\]=:>~ ,*()]+$/.test(s)&&!/·/.test(s))continue;/* selectors and ids */
      if(/<[a-z]|=>|function|\(\)|\{|;$|^\s*[.#]|px|rgba|var\(|querySelector|addEventListener/.test(s))continue;if(CAND.test(s))strs.push({f:path.relative(ROOT,f),line:i+1,s})}})}
HT.Pad.setLast('pad');
const out=[];for(const x of strs){/* [Key] is a keycap (js/hud.js keycaps()): js/gamepad.js swaps it for the glyph */const a=HT.Pad.keyText(x.s.replace(/\[([^\]]{1,12})\]/g,(m,k)=>{const g=HT.Pad.glyphFor(k);return g?'['+g.label+']':m}));if(SENT.test(a))out.push({where:x.f+':'+x.line,pad:a})}
const all=process.argv.includes('--all');
console.log(strs.length+' strings name an input; '+out.length+' still read as keyboard / mouse on the pad');
for(const o of out.slice(0,all?1e9:400))console.log('  '+o.where+'  '+JSON.stringify(o.pad).slice(0,170));
process.exit(out.length?1:0);
