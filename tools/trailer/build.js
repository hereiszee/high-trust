/* Rebuilds the trailer from the captured frames in <scratch>/frames (TRAILER_SCRATCH, default $TMPDIR/ht-trailer):
     node tools/trailer/build.js [--rough] [--no-audio-render] [--no-cards]
   1. cards.js renders the text supers and end card (config.json "cta")      2. audio.js renders music/effects (skipped if present)
   3. one intermediate per clip in edit.js (frames + fading super)              4. concat
   5. the sound mix: music timeline + effects at their frames, loudness-normalised to -14 LUFS, true peak -1.5 dBTP
   6. final H.264 High / yuv420p / 30 fps / 2-pass 8 Mbps + AAC-LC 192 kb/s 48 kHz stereo -> assets/store/trailer/
   7. 720p copy, poster frame, contact sheet (1 frame per second).
   --rough: clips whose shot is not captured yet are replaced by a slate instead of failing. */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const {SCRATCH,ROOT}=require('./lib.js');const E=require('./edit.js');
const CFG=JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'),'utf8'));const FPS=CFG.fps||30;
const has=k=>process.argv.includes('--'+k);
const OUTD=path.join(ROOT,'assets/store/trailer'),W=path.join(SCRATCH,'build');fs.mkdirSync(OUTD,{recursive:true});fs.mkdirSync(W,{recursive:true});
const sh=(args,o={})=>{const r=cp.spawnSync('ffmpeg',['-hide_banner','-loglevel',o.log||'error','-y',...args],{stdio:o.capture?['ignore','pipe','pipe']:'inherit',maxBuffer:1<<28});if(r.status!==0)throw new Error('ffmpeg failed: '+args.join(' ').slice(0,400)+(r.stderr?'\n'+r.stderr.toString().slice(-2000):''));return r};
const node=(f,args=[])=>{const r=cp.spawnSync(process.execPath,[path.join(__dirname,f),...args],{stdio:'inherit'});if(r.status!==0)throw new Error(f+' failed')};
const frameDir=s=>path.join(SCRATCH,'frames',s);
const nFrames=s=>fs.existsSync(frameDir(s))?fs.readdirSync(frameDir(s)).filter(f=>/^f\d+\.jpg$/.test(f)).length:0;
const card=n=>path.join(SCRATCH,'cards',n+'.png');

/* ---- 1/2: cards and audio ---- */
if(!has('no-cards'))node('cards.js');
const AUD=path.join(SCRATCH,'audio');
if(!has('no-audio-render')&&(!fs.existsSync(AUD)||fs.readdirSync(AUD).length<10))node('audio.js');

/* ---- 3: clips ---- */
let t=0,cum=0;const segs=[],timeline=[];const BEAT=E.BEAT||18.75;
for(const c of E.clips){if(c.beats!=null){c.len=Math.round((cum+c.beats)*BEAT)-Math.round(cum*BEAT);cum+=c.beats}else cum+=c.len/BEAT}
E.clips.forEach((c,k)=>{const seg=path.join(W,'seg'+String(k).padStart(3,'0')+'.mp4'),len=c.len,dur=len/FPS;
  const vf=[];let inputs=[];
  if(c.card){inputs=['-loop','1','-framerate',String(FPS),'-t',String(dur),'-i',card(c.card)];vf.push(`[0]format=rgb24,fade=in:st=0:d=${c.fadeIn||0.5}${c.fadeOut?`,fade=out:st=${(dur-c.fadeOut).toFixed(3)}:d=${c.fadeOut}`:''}[v]`)}
  else{const have=nFrames(c.shot);
    if(have<c.in+len){if(!has('rough'))throw new Error(`clip ${k}: shot ${c.shot} has ${have} frames, needs ${c.in+len} (use --rough for a slate)`);
      inputs=['-f','lavfi','-t',String(dur),'-i',`color=c=0x1d232b:s=1920x1080:r=${FPS}`];vf.push(`[0]drawtext=text='${c.shot} (not captured yet)':fontcolor=white:fontsize=48:x=(w-tw)/2:y=(h-th)/2[v]`)}
    else{inputs=['-framerate',String(FPS),'-start_number',String(c.in),'-i',path.join(frameDir(c.shot),'f%05d.jpg')];
      let v=`[0]scale=1920:1080,setsar=1,format=rgb24${c.fadeIn?`,fade=in:st=0:d=${c.fadeIn}`:''}${c.fadeOut?`,fade=out:st=${(dur-c.fadeOut).toFixed(3)}:d=${c.fadeOut}`:''}`;
      if(c.super){inputs.push('-loop','1','-framerate',String(FPS),'-t',String(dur),'-i',card(c.super.card));const a=(c.super.from||0)/FPS,b=(c.super.to!=null?c.super.to:len)/FPS;
        vf.push(v+'[b]');vf.push(`[1]format=rgba,fade=in:st=${a.toFixed(3)}:d=0.35:alpha=1,fade=out:st=${Math.max(a+.4,b-.35).toFixed(3)}:d=0.35:alpha=1[o]`);vf.push('[b][o]overlay=0:0:shortest=1[v]')}
      else vf.push(v+'[v]')}}
  sh([...inputs,'-filter_complex',vf.join(';'),'-map','[v]','-frames:v',String(len),'-r',String(FPS),'-c:v','libx264','-preset','medium','-crf','12','-pix_fmt','yuv420p',seg]);
  segs.push(seg);timeline.push({k,shot:c.shot||('card:'+c.card),in:c.in||0,len,at:t,note:c.note||''});
  for(const s of c.sfx||[])E.sfx.push(Object.assign({},s,{at:t+(s.f||0)/FPS}));
  t+=dur;process.stdout.write(`\rclip ${k+1}/${E.clips.length}`)});
const total=t;console.log(`\nvideo: ${E.clips.length} clips, ${total.toFixed(2)} s`);
fs.writeFileSync(path.join(W,'list.txt'),segs.map(s=>`file '${s}'`).join('\n'));
sh(['-f','concat','-safe','0','-i',path.join(W,'list.txt'),'-c','copy',path.join(W,'video.mp4')]);
fs.writeFileSync(path.join(W,'timeline.json'),JSON.stringify(timeline,null,1));

/* ---- 5: the sound mix ---- */
const parts=[...E.music.map(m=>Object.assign({kind:'music'},m)),...E.sfx.map(s=>Object.assign({kind:'sfx'},s))].filter(m=>fs.existsSync(path.join(AUD,m.cue+'.wav')));
const ain=[],af=[];parts.forEach((m,i)=>{ain.push('-i',path.join(AUD,m.cue+'.wav'));const from=m.from||0,d=m.dur;
  let f=`[${i}]aresample=48000,aformat=channel_layouts=stereo,atrim=start=${from}${d?`:duration=${d}`:''},asetpts=PTS-STARTPTS`;
  if(m.fin)f+=`,afade=t=in:st=0:d=${m.fin}`;if(m.fout&&d)f+=`,afade=t=out:st=${Math.max(0,d-m.fout)}:d=${m.fout}`;
  f+=`,volume=${m.gain==null?1:m.gain},adelay=${Math.round(m.at*1000)}|${Math.round(m.at*1000)}[a${i}]`;af.push(f)});
const mix=path.join(W,'mix.wav'),norm=path.join(W,'mix-norm.wav');
af.push(parts.map((_,i)=>`[a${i}]`).join('')+`amix=inputs=${parts.length}:normalize=0:dropout_transition=0,apad,atrim=0:${total.toFixed(3)},afade=t=out:st=${(total-1.2).toFixed(3)}:d=1.2[m]`);
sh([...ain,'-filter_complex',af.join(';'),'-map','[m]','-ar','48000','-ac','2','-c:a','pcm_s24le',mix]);
/* two-pass loudnorm: measure, then apply linearly */
const meas=sh(['-i',mix,'-af','loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json','-f','null','-'],{capture:true,log:'info'});const js=JSON.parse(/\{[\s\S]*\}/.exec(meas.stderr.toString())[0]);
sh(['-i',mix,'-af',`loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${js.input_i}:measured_TP=${js.input_tp}:measured_LRA=${js.input_lra}:measured_thresh=${js.input_thresh}:offset=${js.target_offset}:linear=true,aresample=48000`,'-ar','48000','-c:a','pcm_s24le',norm]);
console.log('audio: input',js.input_i,'LUFS ->',-14);

/* ---- 6/7: deliverables ---- */
const f1080=path.join(OUTD,'high-trust-trailer-1080p.mp4'),f720=path.join(OUTD,'high-trust-trailer-720p.mp4');
const enc=(out,scale,br,max,buf)=>{const pl=path.join(W,'x264-'+path.basename(out));
  const vopt=[...(scale?['-vf',scale]:[]),'-c:v','libx264','-profile:v','high','-level','4.1','-preset','slow','-b:v',br,'-maxrate',max,'-bufsize',buf,'-pix_fmt','yuv420p','-r',String(FPS),'-g',String(FPS),'-keyint_min',String(FPS),'-x264-params','colorprim=bt709:transfer=bt709:colormatrix=bt709','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-passlogfile',pl];
  sh(['-i',path.join(W,'video.mp4'),...vopt,'-pass','1','-an','-f','mp4','/dev/null']);
  sh(['-i',path.join(W,'video.mp4'),'-i',norm,'-map','0:v','-map','1:a',...vopt,'-pass','2','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-shortest','-movflags','+faststart',out])};
enc(f1080,null,'8M','10M','16M');enc(f720,'scale=1280:720:flags=lanczos','5M','6M','10M');
sh(['-ss',String(E.poster||10),'-i',f1080,'-frames:v','1','-q:v','2',path.join(OUTD,'poster.jpg')]);
const rows=Math.ceil(total/6);sh(['-i',f1080,'-vf',`fps=1,scale=320:-1,drawtext=text='%{pts\\:hms}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.5,tile=6x${rows}:padding=4:color=black`,'-frames:v','1','-q:v','3',path.join(OUTD,'contact-sheet.jpg')]);
const probe=cp.execSync(`ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,sample_rate,channels,bit_rate -of json "${f1080}"`).toString();
fs.writeFileSync(path.join(W,'probe.json'),probe);console.log(probe);
console.log('done:',f1080,(fs.statSync(f1080).size/1e6).toFixed(1)+' MB;',f720,(fs.statSync(f720).size/1e6).toFixed(1)+' MB');
