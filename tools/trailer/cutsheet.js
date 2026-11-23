/* Review sheet of a built cut: one row per clip in cut order (4 frames across the clip), each labelled with its timecode, shot and in-point.
   node tools/trailer/cutsheet.js <video.mp4> [out.jpg]   (reads <scratch>/build/timeline.json, written by build.js) */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');const {SCRATCH}=require('./lib.js');
const vid=process.argv[2],out=process.argv[3]||path.join(__dirname,'review','v2-cut-sheet.jpg');
const tl=JSON.parse(fs.readFileSync(path.join(SCRATCH,'build','timeline.json'),'utf8'));const T=fs.mkdtempSync(path.join(require('os').tmpdir(),'cs'));
const tc=s=>{const m=Math.floor(s/60),r=(s-m*60).toFixed(1);return m+':'+(r<10?'0':'')+r};
const rows=[];tl.forEach((c,k)=>{const d=c.len/30,files=[];
  for(let j=0;j<4;j++){const t=c.at+d*(j+.5)/4,f=path.join(T,`r${k}_${j}.jpg`);
    const lab=j===0?`${tc(c.at)}  ${c.shot}  in ${c.in}  (${d.toFixed(2)} s)`:tc(t);
    cp.spawnSync('ffmpeg',['-loglevel','error','-y','-ss',t.toFixed(3),'-i',vid,'-frames:v','1','-vf',`scale=400:-1,drawtext=text='${lab.replace(/:/g,'\\:')}':x=6:y=6:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.65`,f]);files.push(f)}
  const r=path.join(T,`row${k}.jpg`);cp.spawnSync('ffmpeg',['-loglevel','error','-y',...files.flatMap(f=>['-i',f]),'-filter_complex','hstack=inputs=4',r]);rows.push(r)});
cp.spawnSync('ffmpeg',['-loglevel','error','-y',...rows.flatMap(f=>['-i',f]),'-filter_complex',`vstack=inputs=${rows.length}`,'-q:v','4',out]);
console.log(out,rows.length,'rows');
