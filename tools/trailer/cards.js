/* Renders the trailer's text supers and the end card as 1920x1080 PNGs (transparent where they sit over gameplay) with the
   game's own fonts (assets/fonts, OFL) and palette (css/hud.css tokens). The end-card line comes from config.json "cta"
   ("Wishlist on Steam" until release; set it to "Available now" and run node tools/trailer/build.js to re-render).
   node tools/trailer/cards.js  ->  <scratch>/cards/*.png */
'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const {ROOT,SCRATCH}=require('./lib.js');
const CFG=JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'),'utf8'));
const OUT=path.join(SCRATCH,'cards');
const ROOF='<svg viewBox="0 0 118 34" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><path d="M4 30L59 5l55 25"/><path d="M88 18V7h10v15" stroke-width="5"/></svg>';
const CSS=`
@font-face{font-family:"Barlow Condensed";font-weight:700;src:url(/assets/fonts/barlow-condensed-700.woff2) format("woff2")}
@font-face{font-family:"Barlow Condensed";font-weight:800;src:url(/assets/fonts/barlow-condensed-800.woff2) format("woff2")}
@font-face{font-family:"Barlow";font-weight:600;src:url(/assets/fonts/barlow-600.woff2) format("woff2")}
@font-face{font-family:"Bowlby One";font-weight:400;src:url(/assets/fonts/bowlby-one-400.woff2) format("woff2")}
:root{--sun:#ffc94a;--paper:#f6f1e3;--ink:#0f1216;--fg2:rgba(255,255,255,.82)}
html,body{margin:0;width:1920px;height:1080px;background:transparent;overflow:hidden}
/* title-safe: everything inside 10% margins (192 x 108 px) */
.safe{position:absolute;left:192px;right:192px;top:108px;bottom:108px}
.sup{position:absolute;left:0;bottom:24px;max-width:1300px}
.sup .k{display:flex;align-items:center;gap:14px;font:700 28px/1 "Barlow Condensed";letter-spacing:.32em;text-transform:uppercase;color:var(--sun);text-shadow:0 2px 6px rgba(0,0,0,.65);margin-bottom:14px}
.sup .k:before{content:"";width:40px;height:3px;background:var(--sun);box-shadow:0 1px 4px rgba(0,0,0,.5)}
.sup .l{font:400 76px/1.02 "Bowlby One";text-transform:uppercase;color:#fff;letter-spacing:-.005em;text-shadow:0 4px 0 rgba(0,0,0,.28),0 0 24px rgba(0,0,0,.55),0 2px 4px rgba(0,0,0,.7)}
.sup .l b{color:var(--sun);font-weight:400}
.sup.c{left:50%;transform:translateX(-50%);text-align:center;bottom:auto;top:50%;margin-top:-90px;width:1400px;max-width:none}
.sup.c .k{justify-content:center}.sup.c .k:after{content:"";width:40px;height:3px;background:var(--sun)}
.full{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,#1d232b 0%,#0f1216 70%)}
.end .logo{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);text-align:left}
.logo .roof{display:block;width:177px;height:51px;margin:0 0 10px 4px;color:var(--sun)}
.logo .w{display:block;font:400 192px/.84 "Bowlby One";color:#fff;text-transform:uppercase;letter-spacing:-.005em;text-shadow:0 6px 0 rgba(0,0,0,.25)}
.logo .w.b{color:var(--sun)}
.logo .tag{display:flex;align-items:center;gap:14px;margin-top:22px;font:700 30px/1 "Barlow Condensed";letter-spacing:.3em;text-transform:uppercase;color:var(--fg2)}
.logo .tag:before{content:"";width:42px;height:3px;background:var(--sun)}
.cta{position:absolute;left:0;right:0;bottom:150px;text-align:center}
.cta .btn{display:inline-block;padding:22px 46px 20px;background:var(--sun);color:var(--ink);font:800 52px/1 "Barlow Condensed";letter-spacing:.08em;text-transform:uppercase;border-radius:6px}
.cta .sub{margin-top:22px;font:700 26px/1 "Barlow Condensed";letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.6)}
`;
const CARDS={
  wave:{sup:{k:'Maple Heights',l:'Maple Heights<br>used to <b>wave.</b>'}},
  crew:{sup:{k:'The crew',l:'Four dads.<br><b>One minivan.</b>'}},
  mercy:{sup:{k:'Mercy is a mechanic',l:'They would really prefer<br>violence <b>wasn\'t necessary.</b>'}},
  trust:{sup:{k:'Doors Locked to Doors Unlocked',l:'Trust is the<br><b>whole point.</b>',c:1}},
  dadlife:{sup:{k:'A whole dad life',l:'Somebody has to<br><b>do the school run.</b>'}},
  river:{sup:{k:'Riverside Flats',l:'Two neighbourhoods.<br><b>Two trust meters.</b>'}},
  fort:{sup:{k:'Fort Sensible',l:'A tank that never<br><b>hurts anyone.</b>'}},
  jet:{sup:{k:'Fort Sensible',l:'A jet you probably<br><b>shouldn\'t fly.</b>'}},
  drag:{sup:{k:'Sensible Dragway',l:'Quarter mile.<br><b>Sensible speeds.</b>'}},
  waves:{sup:{k:'The festival',l:'Everybody<br><b>waves.</b>',c:1}},
  end:{end:1},
};
function html(c){if(c.end)return`<div class="full end"><div class="logo"><span class="roof">${ROOF}</span><span class="w">High</span><span class="w b">Trust</span><span class="tag">Maple Heights Neighborhood Watch</span></div>
  <div class="cta"><div class="btn">${CFG.cta}</div>${CFG.ctaSub?`<div class="sub">${CFG.ctaSub}</div>`:''}</div></div>`;
  const s=c.sup;return`<div class="safe"><div class="sup${s.c?' c':''}"><div class="k">${s.k}</div><div class="l">${s.l}</div></div></div>`}
async function render(names){fs.mkdirSync(OUT,{recursive:true});const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
  await p.route('http://ht.local/**',r=>{const u=new URL(r.request().url());if(u.pathname==='/card.html')return r.fulfill({status:200,body:'<!doctype html><meta charset=utf-8><style>'+CSS+'</style><body></body>',headers:{'content-type':'text/html'}});
    const f=path.join(ROOT,decodeURIComponent(u.pathname));if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':'font/woff2'}})});
  await p.goto('http://ht.local/card.html');
  for(const[k,c]of Object.entries(CARDS)){if(names&&names.length&&!names.includes(k))continue;
    await p.evaluate(h=>{document.body.innerHTML=h},html(c));await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);
    await p.screenshot({path:path.join(OUT,k+'.png'),omitBackground:!c.end});console.log('card',k)}
  await b.close()}
module.exports={render,CARDS};
if(require.main===module)render(process.argv.slice(2));
