/* Movement in the real game, headless: node dev/movement-check.js [--shots] [--only=jump,crate,vault,mantle,fuzz,curb,ammo,crew,missions]
   Serves the repo through request interception, stubs requestAnimationFrame and drives the game with __ht.step.
   --shots writes docs/screenshots/movement/*.jpg */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');const OUT=path.join(ROOT,'docs','screenshots','movement');
const argv=process.argv.slice(2);const SHOTS=argv.includes('--shots');const only=(argv.find(a=>a.startsWith('--only='))||'').slice(7).split(',').filter(Boolean);
const want=k=>!only.length||only.includes(k);
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.json':'application/json','.woff2':'font/woff2'};
const results=[];const ok=(name,pass,info)=>{results.push([name,!!pass,info]);console.log((pass?'  ok   ':'  FAIL ')+name+(info!==undefined?'  · '+(typeof info==='string'?info:JSON.stringify(info)):''))};

function helpers(){
  const H=window.__ht,T=THREE;
  window.M_={
    calm(){for(const e of H.enemies){e.pos.x+=500;e.pos.z+=500;e.thinkT=1e9;e.alert=false;e.target=null}},
    god(){const P=H.P;P.hp=100},
    keysOff(){for(const k in H.keys)H.keys[k]=false},
    /* every collider tile of a char in the level grid, as world centres */
    tiles(ch){const L=H.L,o=[];for(let z=0;z<L.H;z++)for(let x=0;x<L.W;x++)if(L.g[z][x]===ch)o.push({x:x*2+1,z:z*2+1,gx:x,gz:z});return o},
    col(x,z){return H.L.colliders.find(c=>c.h!=null&&x>c.x0&&x<c.x1&&z>c.z0&&z<c.z1)},
    /* face along (dx,dz) */
    face(dx,dz){H.P.yaw=Math.atan2(-dx,-dz);H.P.pitch=-.1},
    place(x,z,y=0){const P=H.P;P.pos.set(x,y,z);P.vy=0;P.vault=null;P.onGround=true;P.hv.x=P.hv.z=0;P.landT=0;P.visY=y;P.jumpBuf=0;H.step(1,1/60)},
    run(n,dt=1/60,each){const tr=[];for(let i=0;i<n;i++){M_.god();H.step(1,dt);const m=H.move;tr.push([+H.P.pos.x.toFixed(3),+H.P.pos.y.toFixed(3),+H.P.pos.z.toFixed(3),m.vault||(m.onGround?'g':'a')]);if(each)each(i)}return tr},
    /* a free approach spot: d metres from box c's face along the axis with the shortest crossing, toward its far side */
    approach(c,d=.9){const w=c.x1-c.x0,dpt=c.z1-c.z0,cx=(c.x0+c.x1)/2,cz=(c.z0+c.z1)/2;const opts=[];
      if(dpt<=w){opts.push({x:cx,z:c.z0-.35-d,dx:0,dz:1},{x:cx,z:c.z1+.35+d,dx:0,dz:-1})}else{opts.push({x:c.x0-.35-d,z:cz,dx:1,dz:0},{x:c.x1+.35+d,z:cz,dx:-1,dz:0})}
      if(dpt>w){opts.push({x:cx,z:c.z0-.35-d,dx:0,dz:1},{x:cx,z:c.z1+.35+d,dx:0,dz:-1})}else{opts.push({x:c.x0-.35-d,z:cz,dx:1,dz:0},{x:c.x1+.35+d,z:cz,dx:-1,dz:0})}
      return opts.filter(o=>!H.solidAt(o.x,o.z,.4,0))}
  };
}

(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:720}});
  await ctx.route('http://repo.local/**',r=>{const u=new URL(r.request().url());const f=path.join(ROOT,decodeURIComponent(u.pathname));
    if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'nf'});r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':MIME[path.extname(f)]||'application/octet-stream'}})});
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
  await p.addInitScript(()=>{window.requestAnimationFrame=()=>0});
  await p.goto('http://repo.local/index.html');
  await p.waitForFunction(()=>window.__ht&&__ht.assets.done,null,{timeout:180000,polling:500});
  await p.evaluate(()=>{const b=document.querySelector('.ht-title [data-act=newgame]')||document.getElementById('bStart');if(b)b.click()});
  await p.evaluate(helpers);
  if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  const shot=async(n,fn,arg)=>{if(!SHOTS)return;await p.evaluate(fn||(()=>__ht.draw()),arg);await p.evaluate(()=>{try{HT.HUD.banner(null)}catch(e){}});await p.waitForTimeout(700);await p.evaluate(()=>__ht.draw());await p.screenshot({path:path.join(OUT,n+'.jpg'),type:'jpeg',quality:86});console.log('       wrote',n+'.jpg')};
  global.__p=p;global.__shot=shot;global.__ok=ok;global.__want=want;global.__SHOTS=SHOTS;
  const tests=require(process.env.MT||'./movement-tests.js');
  for(const t of tests){if(!want(t.key))continue;try{await t.run(p,ok,shot)}catch(e){ok(t.key+' ran without throwing',false,String(e).slice(0,400))}}
  ok('zero console errors',errs.length===0,errs.slice(0,6));
  await b.close();
  const fail=results.filter(r=>!r[1]).length;console.log(fail?fail+' of '+results.length+' failed':'all '+results.length+' passed');process.exitCode=fail?1:0;
})();
