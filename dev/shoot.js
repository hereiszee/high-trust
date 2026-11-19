/* node dev/shoot.js : renders dev/world.html headless and writes docs/screenshots/world/*.png (uses the pre-installed Playwright) */
const {chromium}=require('playwright'),path=require('path');
(async()=>{const b=await chromium.launch(),p=await b.newPage({viewport:{width:1600,height:760},deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file://'+path.join(__dirname,'world.html'));await p.waitForFunction(()=>window.__viz);await p.addStyleTag({content:'header{position:static!important}'});
  const out=n=>path.join(__dirname,'..','docs','screenshots','world',n),shot=async(n,o,chase)=>{await p.evaluate(([o,c])=>{__viz.set(o);if(c)__viz.runChase(c.seed,c.type,c.frame)},[o,chase]);
    await p.waitForTimeout(150);await p.locator('canvas').screenshot({path:out(n)});console.log('wrote',n)};
  await shot('overview-bridge-closed-trust0.png',{view:'all',tier:0,bridge:false,regions:true,sites:true,graph:false,chunks:false,dress:true});
  await shot('overview-bridge-open-graph-chunks.png',{view:'all',tier:35,bridge:true,regions:true,sites:true,graph:true,chunks:true,dress:true});
  await shot('riverside-trust0.png',{view:'river',tier:0,bridge:true,regions:false,sites:true,graph:false,chunks:false,dress:true});
  await shot('riverside-trust50.png',{view:'river',tier:50,bridge:true,regions:false,sites:true,graph:false,chunks:false,dress:true});
  await shot('riverside-trust70.png',{view:'river',tier:70,bridge:true,regions:false,sites:true,graph:false,chunks:false,dress:true});
  await shot('chase-duke-sedan.png',{view:'all',tier:20,bridge:true,regions:false,sites:false,graph:true,chunks:false,dress:false},{seed:3,type:'sedan',frame:'end'});
  await shot('chase-icecream-truck-riverside.png',{view:'river',tier:20,bridge:true,regions:false,sites:false,graph:true,chunks:false,dress:false},{seed:2,type:'workvan',frame:'end'});
  await p.setViewportSize({width:1600,height:900});await p.screenshot({path:out('page-ui.png')});console.log('wrote page-ui.png');
  await b.close();if(errs.length){console.error('page errors:',errs);process.exit(1)}})();
