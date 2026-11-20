// post-process character glbs: hair/eyelash cards -> alphaMode MASK (no sorting issues), report stats
import { NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import fs from 'fs';
const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  let tris = 0;
  for (const m of doc.getRoot().listMaterials()) {
    if (/_opacity|_glasses/.test(m.getName())) { m.setAlphaMode('MASK').setAlphaCutoff(0.35).setDoubleSided(true); }
  }
  for (const me of doc.getRoot().listMeshes()) for (const p of me.listPrimitives()) tris += p.getIndices().getCount() / 3;
  await io.write(f, doc);
  console.log(f.split('/').pop(), 'tris', tris, 'bytes', fs.statSync(f).size);
}
