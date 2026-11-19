// Shrink anims.glb: keep body-bone rotations + pelvis translation only, drop meshes/skins,
// lossy keyframe reduction (resample), rotation outputs as normalized int16 (core glTF 2.0).
import { NodeIO } from '@gltf-transform/core';
import { resample, prune, dedup } from '@gltf-transform/functions';
const [,, inp, out] = process.argv;
const io = new NodeIO();
const doc = await io.read(inp);
const root = doc.getRoot();
const facial = /Bip01 (REye|LEye|MJaw|MBottomLip|MTongue|[LR]MouthBottom|[RL]Masseter|MUpperLip|[RL]Caninus|[RL]EyeBlink|[RL]Upperlip|[RL]MouthCorner|[RL]Cheek|[RL]InnerEyebrow|MMiddleEyebrow|[RL]OuterEyebrow|MNose)/;
let dropped = 0;
for (const anim of root.listAnimations()) {
  for (const ch of anim.listChannels()) {
    const node = ch.getTargetNode(); const path = ch.getTargetPath();
    const name = node ? node.getName() : '';
    const keep = node && !facial.test(name) && name.startsWith('Bip01 ') &&
      (path === 'rotation' || (path === 'translation' && name === 'Bip01 Pelvis'));
    if (!keep) { const s = ch.getSampler(); ch.dispose(); if (s && !s.listParents().some(p => p.propertyType === 'AnimationChannel')) s.dispose(); dropped++; }
  }
}
await doc.transform(resample({ tolerance: 2e-4 }), dedup(), prune());
// quantize rotations
let q = 0;
for (const anim of root.listAnimations()) for (const ch of anim.listChannels()) {
  if (ch.getTargetPath() !== 'rotation') continue;
  const acc = ch.getSampler().getOutput();
  const a = acc.getArray(); if (!(a instanceof Float32Array)) continue;
  const i16 = new Int16Array(a.length);
  for (let i = 0; i < a.length; i++) i16[i] = Math.round(Math.max(-1, Math.min(1, a[i])) * 32767);
  acc.setArray(i16).setNormalized(true); q++;
}
await io.write(out, doc);
console.log('dropped channels', dropped, 'quantized', q);
