/* node tools/glb-stats.js file.glb... : bytes per category (images / animation / geometry) */
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const fs = require('fs');
(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': (await import('meshoptimizer')).MeshoptDecoder });
  await (await import('meshoptimizer')).MeshoptDecoder.ready;
  for (const f of process.argv.slice(2)) {
    const doc = await io.read(f), root = doc.getRoot();
    const img = root.listTextures().reduce((s, t) => s + (t.getImage() ? t.getImage().byteLength : 0), 0);
    const dims = root.listTextures().map(t => (t.getSize() || []).join('x') + ':' + t.getMimeType().split('/')[1]);
    const animAcc = new Set(); for (const a of root.listAnimations()) for (const s of a.listSamplers()) { animAcc.add(s.getInput()); animAcc.add(s.getOutput()) }
    const anim = [...animAcc].reduce((s, a) => s + a.getArray().byteLength, 0);
    const all = root.listAccessors().reduce((s, a) => s + a.getArray().byteLength, 0);
    const tris = root.listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((q, p) => q + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0), 0);
    console.log([f.replace(/^assets\//, ''), (fs.statSync(f).size / 1024 | 0) + 'k', 'img ' + (img / 1024 | 0) + 'k', 'anim ' + (anim / 1024 | 0) + 'k(' + root.listAnimations().length + ')', 'geo ' + ((all - anim) / 1024 | 0) + 'k', 'tris ' + (tris | 0), 'mats ' + root.listMaterials().length, dims.join(' ')].join('  '));
  }
})();
