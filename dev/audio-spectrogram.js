/* Renders spectrograms of HT.Audio calls to a PNG for eyeballing. Usage: node dev/audio-spectrogram.js <seconds> "A.gun('pistol')" ... (OUT=file.png) */
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:200*Math.ceil((process.argv.length-3))+20}});p.on('pageerror',e=>console.log('ERR',e));
await p.goto('file://'+require('path').resolve(__dirname,'audio.html'));
await p.evaluate(async([sec,list])=>{document.head.innerHTML='';document.body.innerHTML='';document.body.style.margin='0';document.body.style.background='#000';const A=HT.Audio,SR=48000;
 function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
  for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let j=0;j<len/2;j++){const ur=re[i+j],ui=im[i+j],vr=re[i+j+len/2]*cr-im[i+j+len/2]*ci,vi=re[i+j+len/2]*ci+im[i+j+len/2]*cr;re[i+j]=ur+vr;im[i+j]=ui+vi;re[i+j+len/2]=ur-vr;im[i+j+len/2]=ui-vi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}}
 for(const k of list){try{const oc=new OfflineAudioContext(1,(sec+1)*SR,SR);A.init({context:oc,bypass:window.BY});oc.suspend(1).then(()=>{eval(k);A._advance(sec);oc.resume()});
  const x=(await oc.startRendering()).getChannelData(0).slice(SR);
  const W=1380,H=180,c=document.createElement('canvas');c.width=W;c.height=H;c.style.cssText='display:block;margin-bottom:8px';document.body.appendChild(c);const g=c.getContext('2d');
  const n=1024,img=g.createImageData(W,H);const cols=[];let mx=-1e9;
  for(let col=0;col<W;col++){const off=Math.floor(col/W*(x.length-n));const re=new Float64Array(n),im=new Float64Array(n);for(let i=0;i<n;i++)re[i]=x[off+i]*(.5-.5*Math.cos(2*Math.PI*i/n));fft(re,im);
   const cc=[];for(let row=0;row<H;row++){const f=30*Math.pow(20000/30,(H-1-row)/(H-1)),bin=Math.round(f*n/SR),pw=re[bin]**2+im[bin]**2,db=10*Math.log10(pw+1e-14);cc.push(db);if(db>mx)mx=db}cols.push(cc)}
  for(let col=0;col<W;col++)for(let row=0;row<H;row++){const v=Math.max(0,Math.min(1,(cols[col][row]-mx+70)/70));const o=(row*W+col)*4;img.data[o]=255*Math.min(1,v*2);img.data[o+1]=255*Math.max(0,v*2-1);img.data[o+2]=80*v;img.data[o+3]=255}
  g.putImageData(img,0,0);g.fillStyle='#fff';for(let s=0;s<sec;s+=.5){g.fillRect(s/sec*W,H-6,1,6)}
  // waveform overlay
  g.strokeStyle='#0cf';g.beginPath();for(let col=0;col<W;col++){let m=0;const a=Math.floor(col/W*x.length),bb=Math.floor((col+1)/W*x.length);for(let i=a;i<bb;i++)m=Math.max(m,Math.abs(x[i]));g.lineTo(col,H/2-m*H/2)}g.stroke();g.fillStyle='#0ff';g.font='13px monospace';g.fillText(k,6,14)}catch(e){document.body.append('ERR '+k+' '+e)}}
},[+process.argv[2],process.argv.slice(3)]);
await p.screenshot({path:process.env.OUT||'spectrogram.png',fullPage:true});await b.close()})();
