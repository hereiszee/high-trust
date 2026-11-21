# Vendored runtime dependencies

The game loads nothing from the network at runtime: every third-party script it needs is here, byte-for-byte the published files, so the
web build and the desktop build (desktop/) run the same code, offline.

| Path | What | Version | Source | Licence |
| --- | --- | --- | --- | --- |
| `three-r128/three.min.js` | Three.js core | r128 (npm `three@0.128.0`, `build/three.min.js`; identical to cdnjs `ajax/libs/three.js/r128/three.min.js`) | https://github.com/mrdoob/three.js | MIT, `three-r128/LICENSE` |
| `three-r128/examples/js/loaders/GLTFLoader.js` | glTF loader | `three@0.128.0` | same | MIT, `three-r128/LICENSE` |
| `three-r128/examples/js/loaders/RGBELoader.js` | HDR loader | `three@0.128.0` | same | MIT |
| `three-r128/examples/js/libs/meshopt_decoder.js` | meshoptimizer decoder | as shipped in `three@0.128.0` | https://github.com/zeux/meshoptimizer | MIT (header in the file), `three-r128/LICENSE-meshoptimizer` |
| `three-r128/examples/js/utils/SkeletonUtils.js` | skeleton clone helper | `three@0.128.0` | three.js | MIT |
| `three-r128/examples/js/shaders/{Copy,LuminosityHighPass,FXAA}Shader.js` | post shaders | `three@0.128.0` | three.js | MIT |
| `three-r128/examples/js/postprocessing/{EffectComposer,ShaderPass,UnrealBloomPass}.js` | post-processing | `three@0.128.0` | three.js | MIT |

Fonts were already local: `assets/fonts/*.woff2` (SIL Open Font Licence, `assets/fonts/OFL-*.txt`), declared in `css/hud.css`.

Before this folder existed index.html pulled Three.js from cdnjs, the add-ons as one jsDelivr `combine` request, and `css/menus.css`
`@import`ed Google Fonts (a duplicate of the local fonts). Those three are gone; the script order is unchanged.

To update: `npm pack three@<ver>`, copy the same files, update this table and the `<script>` tags in index.html.
