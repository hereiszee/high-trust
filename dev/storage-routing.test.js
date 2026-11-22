/* SAV-12 / SAV-13 / SAV-15 / C-5 static checks.  node dev/storage-routing.test.js
   - nothing in index.html or js/ touches localStorage directly except through the storage helpers (the shell's save file / device file)
   - per-device settings (gfx, rscale, fpsCap) are written to the device store, not the cloud-synced ht-cfg
   - no "Achievement ·" toast for something that is not a Steam achievement
   - the shell gates --dev/devtools/remote debugging on app.isPackaged + HT_TEST_HOOKS
   - docs/steam/BUILD.md's Auto-Cloud rows name exact files (no save.json* wildcard) */
'use strict';
const fs=require('fs'),path=require('path'),R=path.join(__dirname,'..');const rd=f=>fs.readFileSync(path.join(R,f),'utf8');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
const html=rd('index.html');
const direct=html.split('\n').map((l,i)=>[i+1,l]).filter(([i,l])=>/localStorage\s*\.\s*(get|set|remove)Item/.test(l));
ok(direct.length===0,'index.html never calls localStorage.getItem/setItem directly'+(direct.length?': lines '+direct.map(x=>x[0]).join(','):''));
ok(/CFG_STORE\(\)\.getItem\('ht-tut'\)/.test(html)&&/CFG_STORE\(\)\.setItem\('ht-tut'/.test(html),"tutorial flags ('ht-tut') go through CFG_STORE (the save file in the shell)");
for(const f of fs.readdirSync(path.join(R,'js')).filter(f=>f.endsWith('.js'))){const t=rd('js/'+f);
  const bad=t.split('\n').filter(l=>/(^|[^.\w])localStorage\s*\.\s*(get|set|remove)Item/.test(l));
  if(f!=='save.js')ok(bad.length===0,'js/'+f+' has no direct localStorage reads/writes')}
/* device split, exercised */
{const store={},dev={};const mk=o=>({getItem:k=>k in o?o[k]:null,setItem:(k,v)=>{o[k]=String(v)}});
  const m=/const CFG_DEVICE=\[[^\]]*\];/.exec(html);ok(!!m,'CFG_DEVICE list present');
  const CFG={sens:7,gfx:'high',rscale:80,fpsCap:60,subs:true};const CFG_DEVICE=eval(m[0].replace('const CFG_DEVICE=','(').replace(/;$/,')'));
  const src=/function saveCfg\(\)\{[\s\S]*?\n  try\{CFG_STORE\(\)[^\n]*\}/.exec(html)[0];
  const CFG_STORE=()=>mk(store),CFG_DEV_STORE=()=>mk(dev);eval(src+';saveCfg()');
  const sync=JSON.parse(store['ht-cfg']),local=JSON.parse(dev['ht-cfg-device']);
  ok(!('gfx' in sync)&&!('rscale' in sync)&&!('fpsCap' in sync)&&sync.sens===7&&sync.subs===true,'ht-cfg (cloud-synced) has no graphics settings: '+JSON.stringify(sync));
  ok(local.gfx==='high'&&local.rscale===80&&local.fpsCap===60,'ht-cfg-device (this machine) has them: '+JSON.stringify(local))}
ok(!/Achievement ·/.test(rd('js/jet.js')+html),'no "Achievement ·" toasts outside the Steam list');
const main=rd('desktop/main.js');
ok(/const DEV = !app\.isPackaged \|\| \(TEST_HOOKS && flag\('dev'\)\)/.test(main)&&/remote-debugging/.test(main),'packaged builds ignore --dev and refuse remote debugging unless HT_TEST_HOOKS=1');
const build=rd('docs/steam/BUILD.md');ok(!/\|\s*`save\.json\*`\s*\|/.test(build)&&/\| `save\.json\.bak` \|/.test(build),'BUILD.md Auto-Cloud: no save.json* wildcard');
console.log(fails?fails+' FAILED':'all ok');process.exitCode=fails?1:0;
