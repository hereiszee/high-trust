import bpy, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from rbcommon import *
args = sys.argv[sys.argv.index('--')+1:]
fbx, texdir, out = args[0], args[1], args[2]
opts = json.loads(args[3]) if len(args) > 3 else {}
reset()
arm, meshes = import_rocketbox(fbx)

def img(path, noncolor=False):
    im = bpy.data.images.load(path)
    if noncolor: im.colorspace_settings.name = 'Non-Color'
    return im

for m in meshes:
    for slot in m.material_slots:
        mat = slot.material
        name = mat.name.split('.')[0]
        nt = mat.node_tree
        nt.nodes.clear()
        outn = nt.nodes.new('ShaderNodeOutputMaterial')
        bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
        nt.links.new(bsdf.outputs[0], outn.inputs[0])
        bsdf.inputs['Specular IOR Level'].default_value = 0.5
        if name.endswith('_opacity'):
            p = os.path.join(texdir, name + '_color.png')
            t = nt.nodes.new('ShaderNodeTexImage'); t.image = img(p)
            nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
            nt.links.new(t.outputs['Alpha'], bsdf.inputs['Alpha'])
            bsdf.inputs['Roughness'].default_value = 0.6
            mat.surface_render_method = 'BLENDED'
            mat.use_backface_culling = False
            continue
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = img(os.path.join(texdir, name + '_color.jpg'))
        nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
        nmp = os.path.join(texdir, name + '_normal.jpg')
        if os.path.exists(nmp):
            tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img(nmp, True)
            nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0
            nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
            nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
        mrp = os.path.join(texdir, name + '_mr.jpg')
        if os.path.exists(mrp):
            tm = nt.nodes.new('ShaderNodeTexImage'); tm.image = img(mrp, True)
            sep = nt.nodes.new('ShaderNodeSeparateColor')
            nt.links.new(tm.outputs['Color'], sep.inputs[0])
            nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
            nt.links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
        mat.use_backface_culling = True

# hip height metadata
pel = arm.data.bones['Bip01 Pelvis']
hip = pel.head_local.z
for m in meshes: m.name = os.path.splitext(os.path.basename(out))[0] + '_mesh'
arm['hipHeight'] = round(hip, 4)
arm['source'] = os.path.basename(fbx)
print('HIP', hip)
import acc
body = meshes[0]
if opts.get('belly'): acc.belly(arm, body, amp=opts['belly'])
if opts.get('cap'): acc.add_cap(arm, body, color=tuple(opts['cap']), size=opts.get('capsize', 1.0), low=opts.get('caplow', 0.0))
if opts.get('glasses'): acc.add_sunglasses(arm, body)
if opts.get('whistle'): acc.add_whistle(arm, body)
arm['accessories'] = ','.join(k for k in ('cap', 'glasses', 'whistle') if opts.get(k))

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=False,
    export_skins=True, export_yup=True, export_image_format='AUTO', export_extras=True,
    export_apply=False, export_texcoords=True, export_normals=True, export_tangents=False,
    export_materials='EXPORT', export_def_bones=False, export_rest_position_armature=True)
print('WROTE', out)
